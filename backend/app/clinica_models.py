"""
Modelos SQLAlchemy portados do app Supabase (clinica-dashboard), agora
multi-tenant: cada tabela de domínio carrega `empresa_id` (via TenantMixin)
para isolamento por linha (row-level tenancy).

IDs:
  - Maioria das tabelas usa UUID (string) como no Supabase → default uuid4.
  - `unidades` (filiais) e `convenios` usam Integer.

Escopo lógico:
  - Compartilhado na empresa (todas as filiais): pacientes, convenios,
    procedimentos, perfis de usuário, etc.
  - Por filial: agendamentos, caixa, estoque, recebimentos — carregam
    também `unidade_id` (a filial) além de `empresa_id`.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float, Date, DateTime, JSON,
    ForeignKey,
)

from .database import Base
from .tenant_models import TenantMixin


def _uid() -> str:
    return str(uuid.uuid4())


# ── Usuários / Unidades / Cadastros base ───────────────────────────────

class PerfilUsuario(Base, TenantMixin):
    __tablename__ = "perfis_usuarios"

    id = Column(String, primary_key=True, default=_uid)
    nome = Column(String, index=True)
    nome_social = Column(String, nullable=True)
    sexo = Column(String, nullable=True)
    data_nascimento = Column(Date, nullable=True)
    foto_url = Column(String, nullable=True)
    email = Column(String, index=True, nullable=True)
    cpf = Column(String, nullable=True)
    senha_hash = Column(String, nullable=True)       # auth local (bcrypt)
    is_dono = Column(Boolean, default=False)          # dono da empresa (vê todas as filiais)
    telefone = Column(String, nullable=True)
    role = Column(String, nullable=True)
    roles = Column(JSON, nullable=True)
    cargo = Column(String, nullable=True)
    ativo = Column(Boolean, default=True)
    especialidade = Column(String, nullable=True)
    especialidade_medica = Column(String, nullable=True)
    conselho_tipo = Column(String, nullable=True)
    conselho_numero = Column(String, nullable=True)
    conselho_uf = Column(String, nullable=True)
    conselho = Column(String, nullable=True)
    numero_conselho = Column(String, nullable=True)
    uf_conselho = Column(String, nullable=True)
    rqe_numero = Column(String, nullable=True)
    rqe_uf = Column(String, nullable=True)
    senha_provisoria = Column(Boolean, default=False)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, nullable=True)


class Unidade(Base):
    """Filial da empresa."""
    __tablename__ = "unidades"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), index=True, nullable=True)
    cnpj = Column(String, nullable=True)
    razao_social = Column(String, nullable=True)
    nome_fantasia = Column(String, nullable=True)
    telefone = Column(String, nullable=True)
    cep = Column(String, nullable=True)
    rua = Column(String, nullable=True)
    numero = Column(String, nullable=True)
    complemento = Column(String, nullable=True)
    bairro = Column(String, nullable=True)
    cidade = Column(String, nullable=True)
    uf = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, nullable=True)


class Convenio(Base, TenantMixin):
    __tablename__ = "convenios"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column(String, index=True)
    codigo = Column(String, nullable=True)          # código interno
    codigo_ans = Column(String, nullable=True)      # registro ANS
    tipo = Column(String, nullable=True)
    percentual_repasse = Column(Float, nullable=True)
    logo_url = Column(String, nullable=True)
    observacoes = Column(Text, nullable=True)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


class Sala(Base, TenantMixin):
    __tablename__ = "salas"

    id = Column(String, primary_key=True, default=_uid)
    unidade_id = Column(Integer, nullable=True)
    nome = Column(String)
    tipo = Column(String, nullable=True)
    capacidade = Column(Integer, nullable=True)
    status = Column(String, default="Disponível")
    observacoes = Column(Text, nullable=True)
    cor_hex = Column(String, nullable=True)
    ativa = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


class Procedimento(Base, TenantMixin):
    __tablename__ = "procedimentos"

    id = Column(String, primary_key=True, default=_uid)
    unidade_id = Column(Integer, nullable=True)
    nome = Column(String, index=True)
    tipo = Column(String, nullable=True)
    duracao = Column(Integer, nullable=True)  # minutos
    cor_hex = Column(String, nullable=True)
    valor_padrao = Column(Float, default=0)
    valor_repasse = Column(Float, default=0)
    tipo_repasse = Column(String, nullable=True)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


class EspecialidadeOdonto(Base, TenantMixin):
    __tablename__ = "especialidades_odonto"

    id = Column(String, primary_key=True, default=_uid)
    nome = Column(String, index=True)
    cor = Column(String, nullable=True)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


class OdontoProcedimento(Base, TenantMixin):
    __tablename__ = "odonto_procedimentos"

    id = Column(String, primary_key=True, default=_uid)
    nome_intervencao = Column(String, index=True)
    valor_base = Column(Float, default=0)
    valor_repasse = Column(Float, default=0)
    tipo_repasse = Column(String, default="fixo") # fixo ou percentual
    local_aplicacao = Column(String, default="face") # face, dente, arcada
    especialidade_id = Column(String, nullable=True)
    ativo = Column(Boolean, default=True)
    materiais = Column(JSON, nullable=True)
    tipo_visual = Column(String, default="nenhum")
    criado_em = Column(DateTime, default=datetime.utcnow)


# ── Agenda / Atendimentos ──────────────────────────────────────────────

class Agendamento(Base, TenantMixin):
    __tablename__ = "agendamentos"

    id = Column(String, primary_key=True, default=_uid)
    unidade_id = Column(Integer, nullable=True)
    sala_id = Column(String, nullable=True)
    profissional_id = Column(String, nullable=True)
    procedimento_id = Column(String, nullable=True)
    paciente_id = Column(Integer, nullable=True)
    data_agendamento = Column(Date, nullable=True)
    hora_inicio = Column(String, nullable=True)
    hora_fim = Column(String, nullable=True)
    status = Column(String, nullable=True)
    observacoes = Column(Text, nullable=True)
    forma_pagamento = Column(String, nullable=True)
    convenio_id = Column(Integer, nullable=True)
    numero_guia = Column(String, nullable=True)
    valor_cobrado = Column(Float, nullable=True)
    criado_por = Column(String, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, nullable=True)


class AtendimentoClinico(Base, TenantMixin):
    __tablename__ = "atendimentos_clinicos"

    id = Column(String, primary_key=True, default=_uid)
    unidade_id = Column(Integer, nullable=True)
    paciente_id = Column(Integer, nullable=True)
    profissional_id = Column(String, nullable=True)
    data_atendimento = Column(DateTime, default=datetime.utcnow)


class Evolucao(Base, TenantMixin):
    __tablename__ = "evolucoes"

    id = Column(String, primary_key=True, default=_uid)
    atendimento_id = Column(String, nullable=True)
    texto_evolucao = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, nullable=True)


class DocumentoAtendimento(Base, TenantMixin):
    __tablename__ = "documentos_atendimento"

    id = Column(String, primary_key=True, default=_uid)
    atendimento_id = Column(String, nullable=True)
    tipo = Column(String, nullable=True)
    conteudo = Column(JSON, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


class AnamneseOdonto(Base, TenantMixin):
    __tablename__ = "anamnese_odonto"

    id = Column(String, primary_key=True, default=_uid)
    paciente_id = Column(Integer, nullable=True)
    profissional_id = Column(String, nullable=True)
    respostas = Column(JSON, nullable=True)
    data_avaliacao = Column(DateTime, default=datetime.utcnow)


class ModeloProntuario(Base, TenantMixin):
    __tablename__ = "modelos_prontuario"

    id = Column(String, primary_key=True, default=_uid)
    titulo = Column(String, nullable=True)
    conteudo = Column(JSON, nullable=True)
    tipo_acesso = Column(String, nullable=True)
    profissional_id = Column(String, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


# ── Orçamentos (odontograma) ───────────────────────────────────────────

class Orcamento(Base, TenantMixin):
    __tablename__ = "orcamentos"

    id = Column(String, primary_key=True, default=_uid)
    paciente_id = Column(Integer, nullable=True)
    profissional_id = Column(String, nullable=True)
    unidade_id = Column(Integer, nullable=True)
    valor_total = Column(Float, default=0)
    status_geral = Column(String, nullable=True)
    data_criacao = Column(DateTime, default=datetime.utcnow)


class OrcamentoOdonto(Base, TenantMixin):
    __tablename__ = "orcamentos_odonto"

    id = Column(String, primary_key=True, default=_uid)
    paciente_id = Column(Integer, nullable=True)
    profissional_id = Column(String, nullable=True)
    unidade_id = Column(Integer, nullable=True)
    valor_total = Column(Float, default=0)
    status_geral = Column(String, nullable=True)
    data_criacao = Column(DateTime, default=datetime.utcnow)


class OrcamentoItem(Base, TenantMixin):
    __tablename__ = "orcamento_itens"

    id = Column(String, primary_key=True, default=_uid)
    orcamento_id = Column(String, nullable=True)
    dente_numero = Column(String, nullable=True)
    faces = Column(String, nullable=True)
    procedimento_id = Column(String, nullable=True)
    valor_cobrado = Column(Float, nullable=True)
    status_item = Column(String, nullable=True)
    status_visual = Column(String, default="a_realizar")


# ── Financeiro / Caixa / Recebimentos ──────────────────────────────────

class Recebimento(Base, TenantMixin):
    __tablename__ = "recebimentos"

    id = Column(String, primary_key=True, default=_uid)
    unidade_id = Column(Integer, nullable=True)
    agendamento_id = Column(String, nullable=True)
    paciente_id = Column(Integer, nullable=True)
    convenio_id = Column(Integer, nullable=True)
    descricao = Column(String, nullable=True)   # serviço
    forma_pagamento = Column(String, nullable=True)
    valor = Column(Float, nullable=True)
    status = Column(String, nullable=True)
    data_vencimento = Column(Date, nullable=True)
    data_recebimento = Column(Date, nullable=True)
    observacoes = Column(Text, nullable=True)
    criado_por = Column(String, nullable=True)
    caixa_turno_id = Column(String, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


class RecebimentoAvulso(Base, TenantMixin):
    __tablename__ = "recebimentos_avulsos"

    id = Column(String, primary_key=True, default=_uid)
    unidade_id = Column(Integer, nullable=True)
    valor = Column(Float, nullable=True)
    status = Column(String, nullable=True)
    forma_pagamento = Column(String, nullable=True)
    descricao = Column(Text, nullable=True)
    data_recebimento = Column(Date, nullable=True)
    paciente_id = Column(Integer, nullable=True)
    profissional_id = Column(String, nullable=True)
    criado_por = Column(String, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


class CaixaTurno(Base, TenantMixin):
    __tablename__ = "caixa_turnos"

    id = Column(String, primary_key=True, default=_uid)
    unidade_id = Column(Integer, nullable=True)
    recepcionista_id = Column(String, nullable=True)
    data_abertura = Column(DateTime, default=datetime.utcnow)
    data_fechamento = Column(DateTime, nullable=True)
    status_auditoria = Column(String, nullable=True)
    comissao_recepcionista = Column(Float, default=0)
    total_arrecadado = Column(Float, nullable=True)
    total_retido_clinica = Column(Float, nullable=True)
    total_repasse_medicos = Column(Float, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


class FinanceiroLancamento(Base, TenantMixin):
    """Quantidade realizada de cada serviço por mês (Dashboard Financeiro)."""
    __tablename__ = "financeiro_lancamentos"

    id = Column(String, primary_key=True, default=_uid)
    procedimento_id = Column(String, index=True)
    mes = Column(String, index=True)  # 'YYYY-MM'
    quantidade = Column(Float, default=0)
    criado_em = Column(DateTime, default=datetime.utcnow)


class CaixaLancamento(Base, TenantMixin):
    """Lançamentos do caixa do dia (entradas e saídas manuais)."""
    __tablename__ = "caixa_lancamentos"

    id = Column(String, primary_key=True, default=_uid)
    unidade_id = Column(Integer, nullable=True)
    tipo = Column(String)  # ENTRADA / SAIDA
    descricao = Column(String, nullable=True)
    paciente_id = Column(Integer, nullable=True)
    valor = Column(Float)
    forma_pagamento = Column(String, nullable=True)
    data = Column(Date, nullable=True)
    criado_por = Column(String, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


class FinanceiroContaPagar(Base, TenantMixin):
    __tablename__ = "financeiro_contas_pagar"

    id = Column(String, primary_key=True, default=_uid)
    unidade_id = Column(Integer, nullable=True)
    descricao = Column(Text)
    valor = Column(Float)
    data_vencimento = Column(Date, nullable=True)
    fornecedor = Column(String, nullable=True)
    status = Column(String, default="PENDENTE")
    pedido_id = Column(String, nullable=True)
    data_pagamento = Column(Date, nullable=True)
    comprovante_url = Column(String, nullable=True)
    observacoes = Column(Text, nullable=True)
    criado_por = Column(String, nullable=True)
    aprovado_por = Column(String, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


# ── Estoque ────────────────────────────────────────────────────────────

class EstoqueCategoria(Base, TenantMixin):
    __tablename__ = "estoque_categorias"

    id = Column(String, primary_key=True, default=_uid)
    nome = Column(String)
    descricao = Column(Text, nullable=True)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


class EstoqueProduto(Base, TenantMixin):
    __tablename__ = "estoque_produtos"

    id = Column(String, primary_key=True, default=_uid)
    unidade_id = Column(Integer, nullable=True)
    categoria_id = Column(String, nullable=True)
    fornecedor_id = Column(String, nullable=True)
    codigo = Column(String, nullable=True)
    nome = Column(String, index=True)
    descricao = Column(Text, nullable=True)
    unidade_medida = Column(String, default="unidade")
    unidades_por_embalagem = Column(Float, default=1)
    estoque_minimo = Column(Float, default=0)
    custo_unitario = Column(Float, default=0)
    data_validade = Column(Date, nullable=True)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, nullable=True)


class EstoqueFornecedor(Base, TenantMixin):
    __tablename__ = "estoque_fornecedores"

    id = Column(String, primary_key=True, default=_uid)
    nome = Column(String, index=True)          # razão social / nome
    cnpj_cpf = Column(String, nullable=True)
    telefone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


class EstoqueSaldo(Base, TenantMixin):
    __tablename__ = "estoque_saldo"

    id = Column(String, primary_key=True, default=_uid)
    produto_id = Column(String, nullable=True)
    unidade_id = Column(Integer, nullable=True)
    quantidade = Column(Float, default=0)


class EstoqueMovimentacao(Base, TenantMixin):
    __tablename__ = "estoque_movimentacoes"

    id = Column(String, primary_key=True, default=_uid)
    produto_id = Column(String, nullable=True)
    unidade_id = Column(Integer, nullable=True)
    tipo = Column(String)  # ENTRADA/SAIDA/AJUSTE/TRANSFERENCIA
    quantidade = Column(Float)
    custo_unitario = Column(Float, nullable=True)
    referencia_tipo = Column(String, nullable=True)
    referencia_id = Column(String, nullable=True)
    observacoes = Column(Text, nullable=True)
    criado_por = Column(String, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


class EstoquePedido(Base, TenantMixin):
    __tablename__ = "estoque_pedidos"

    id = Column(String, primary_key=True, default=_uid)
    unidade_id = Column(Integer, nullable=True)
    solicitante_id = Column(String, nullable=True)
    fornecedor_id = Column(String, nullable=True)
    itens_texto = Column(Text, nullable=True)
    custo_estimado = Column(Float, nullable=True)
    status = Column(String, default="PENDENTE")
    observacoes = Column(Text, nullable=True)
    aprovado_por = Column(String, nullable=True)
    aprovado_em = Column(DateTime, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


class EstoquePedidoItem(Base, TenantMixin):
    __tablename__ = "estoque_pedidos_itens"

    id = Column(String, primary_key=True, default=_uid)
    pedido_id = Column(String, nullable=True)
    produto_id = Column(String, nullable=True)
    quantidade_solicitada = Column(Float)
    quantidade_recebida = Column(Float, default=0)
    custo_unitario = Column(Float, nullable=True)


class ProcedimentoMaterial(Base, TenantMixin):
    __tablename__ = "procedimento_materiais"

    id = Column(String, primary_key=True, default=_uid)
    procedimento_id = Column(String, nullable=True)
    produto_id = Column(String, nullable=True)
    quantidade = Column(Float, default=1)


# ── DRE / Laboratório / Repasses ───────────────────────────────────────

class CustoOperacional(Base, TenantMixin):
    __tablename__ = "custos_operacionais"

    id = Column(String, primary_key=True, default=_uid)
    unidade_id = Column(Integer, nullable=True)
    data_lancamento = Column(Date, nullable=True)
    categoria = Column(String)  # Fixo/Variável (ou aluguel/material/...)
    frequencia = Column(String, nullable=True)  # Mensal/Anual/Avulso
    descricao = Column(Text, nullable=True)
    valor = Column(Float)
    status = Column(String, default="Ativo")
    created_at = Column(DateTime, default=datetime.utcnow)


class RepasseProfissional(Base, TenantMixin):
    __tablename__ = "repasses_profissionais"

    id = Column(String, primary_key=True, default=_uid)
    unidade_id = Column(Integer, nullable=True)
    profissional_id = Column(String, nullable=True)
    periodo_ini = Column(Date)
    periodo_fim = Column(Date)
    valor_faturado = Column(Float, default=0)
    percentual_repasse = Column(Float, default=0)
    valor_repasse = Column(Float, nullable=True)
    status = Column(String, default="pendente")
    created_at = Column(DateTime, default=datetime.utcnow)


class RepasseRecepcionista(Base, TenantMixin):
    __tablename__ = "repasses_recepcionistas"

    id = Column(String, primary_key=True, default=_uid)
    unidade_id = Column(Integer, nullable=True)
    recepcionista_id = Column(String, nullable=True)
    tipo = Column(String, nullable=True)         # Percentual por Consulta / Valor Fixo Mensal
    referencia = Column(String, nullable=True)   # Ex: Julho/2025
    competencia = Column(Date, nullable=True)
    valor = Column(Float)
    status = Column(String, default="Pendente")
    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class RecepcaoLab(Base, TenantMixin):
    __tablename__ = "recepcao_lab"

    id = Column(String, primary_key=True, default=_uid)
    unidade_id = Column(Integer, nullable=True)
    paciente_id = Column(Integer, nullable=True)
    profissional_id = Column(String, nullable=True)
    laboratorio = Column(String, nullable=True)
    tipo_trabalho = Column(String, nullable=True)
    data_entrada = Column(Date)
    data_prevista = Column(Date, nullable=True)
    data_retorno = Column(Date, nullable=True)
    status = Column(String, default="em_producao")
    valor = Column(Float, nullable=True)
    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class TabelaLaboratorio(Base, TenantMixin):
    """Tabela de exames de laboratórios parceiros (DRE → aba Laboratório)."""
    __tablename__ = "tabela_laboratorio"

    id = Column(String, primary_key=True, default=_uid)
    exame = Column(String, index=True)
    laboratorio = Column(String, nullable=True)
    custo = Column(Float, nullable=True)
    prazo = Column(String, nullable=True)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


class Laudo(Base, TenantMixin):
    __tablename__ = "laudos"

    id = Column(String, primary_key=True, default=_uid)
    unidade_id = Column(Integer, nullable=True)
    recepcao_lab_id = Column(String, nullable=True)
    profissional_id = Column(String, nullable=True)
    tipo = Column(String, nullable=True)
    descricao = Column(Text, nullable=True)
    data_emissao = Column(Date, nullable=True)
    data_entrega = Column(Date, nullable=True)
    status = Column(String, default="pendente")
    created_at = Column(DateTime, default=datetime.utcnow)


class EventoAuditoria(Base, TenantMixin):
    """Trilha de auditoria: registra criações, alterações e exclusões."""
    __tablename__ = "eventos_auditoria"

    id = Column(String, primary_key=True, default=_uid)
    usuario_id = Column(String, nullable=True)
    usuario_nome = Column(String, nullable=True)
    acao = Column(String)          # criação / alteração / exclusão
    modulo = Column(String, nullable=True)
    entidade = Column(String, nullable=True)   # tabela/recurso
    entidade_id = Column(String, nullable=True)
    descricao = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


class Notificacao(Base, TenantMixin):
    __tablename__ = "notificacoes"

    id = Column(String, primary_key=True, default=_uid)
    publico_alvo = Column(String, nullable=True)  # todos/medicos/recepcao/admin
    tipo = Column(String, nullable=True)          # info/success/warning/error
    titulo = Column(String)
    mensagem = Column(Text, nullable=True)
    lida = Column(Boolean, default=False)
    criado_por = Column(String, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


# ── Configurações (key/value por empresa) ──────────────────────────────

class ClinicaDado(Base, TenantMixin):
    __tablename__ = "clinica_dados"

    id = Column(String, primary_key=True, default=_uid)
    chave = Column(String, index=True)
    valor = Column(JSON, nullable=True)
    atualizado_em = Column(DateTime, default=datetime.utcnow)


# ── Caderneta de vacinação (inspirado no recurso FHIR Immunization) ─────
class CadernetaVacina(Base, TenantMixin):
    __tablename__ = "caderneta_vacinas"

    id = Column(String, primary_key=True, default=_uid)
    paciente_id = Column(Integer, index=True, nullable=True)
    vacina = Column(String, nullable=True)             # vaccineCode (nome)
    dose = Column(String, nullable=True)               # doseNumber (1ª dose, reforço…)
    data_aplicacao = Column(Date, nullable=True)       # occurrenceDateTime
    lote = Column(String, nullable=True)               # lotNumber
    fabricante = Column(String, nullable=True)         # manufacturer
    via = Column(String, nullable=True)                # route (IM, SC, oral…)
    local_aplicacao = Column(String, nullable=True)    # site (deltoide, vasto lateral…)
    aplicador = Column(String, nullable=True)          # performer
    status = Column(String, nullable=True, default="aplicada")  # completed / not-done
    observacoes = Column(Text, nullable=True)          # note
    criado_em = Column(DateTime, default=datetime.utcnow)


# ── Registro para CRUD automático ──────────────────────────────────────
# (modelo, prefixo de rota, módulo p/ controle de permissão)
CRUD_MODELS = [
    (PerfilUsuario, "perfis_usuarios", "admin"),
    (Unidade, "unidades", "admin"),
    (Convenio, "convenios", "agenda"),
    (Sala, "salas", "agenda"),
    (Procedimento, "procedimentos", "agenda"),
    (EspecialidadeOdonto, "especialidades_odonto", "odontograma"),
    (OdontoProcedimento, "odonto_procedimentos", "odontograma"),
    (Agendamento, "agendamentos", "agenda"),
    (AtendimentoClinico, "atendimentos_clinicos", "prontuario"),
    (Evolucao, "evolucoes", "prontuario"),
    (DocumentoAtendimento, "documentos_atendimento", "prontuario"),
    (AnamneseOdonto, "anamnese_odonto", "odontograma"),
    (ModeloProntuario, "modelos_prontuario", "prontuario"),
    (Orcamento, "orcamentos", "odontograma"),
    (OrcamentoOdonto, "orcamentos_odonto", "odontograma"),
    (OrcamentoItem, "orcamento_itens", "odontograma"),
    (Recebimento, "recebimentos", "caixa"),
    (RecebimentoAvulso, "recebimentos_avulsos", "caixa"),
    (CaixaTurno, "caixa_turnos", "caixa"),
    (CaixaLancamento, "caixa_lancamentos", "caixa"),
    (FinanceiroLancamento, "financeiro_lancamentos", "financeiro"),
    (FinanceiroContaPagar, "financeiro_contas_pagar", "financeiro"),
    (EstoqueCategoria, "estoque_categorias", "estoque"),
    (EstoqueProduto, "estoque_produtos", "estoque"),
    (EstoqueFornecedor, "estoque_fornecedores", "estoque"),
    (EstoqueSaldo, "estoque_saldo", "estoque"),
    (EstoqueMovimentacao, "estoque_movimentacoes", "estoque"),
    (EstoquePedido, "estoque_pedidos", "estoque"),
    (EstoquePedidoItem, "estoque_pedidos_itens", "estoque"),
    (ProcedimentoMaterial, "procedimento_materiais", "estoque"),
    (CustoOperacional, "custos_operacionais", "financeiro"),
    (RepasseProfissional, "repasses_profissionais", "financeiro"),
    (RepasseRecepcionista, "repasses_recepcionistas", "financeiro"),
    (RecepcaoLab, "recepcao_lab", "recepcao"),
    (TabelaLaboratorio, "tabela_laboratorio", "financeiro"),
    (Laudo, "laudos", "recepcao"),
    (Notificacao, "notificacoes", "admin"),
    (EventoAuditoria, "eventos_auditoria", "financeiro"),
    (ClinicaDado, "clinica_dados", "admin"),
    (CadernetaVacina, "caderneta_vacinas", "prontuario"),
]
