/**
 * Camada de API — conecta o frontend React ao backend FastAPI (http://localhost:8000)
 * Todos os endpoints são configuráveis via variável de ambiente VITE_API_URL
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ──────────────────────────────────────────────────────────
// Token (JWT) — guardado em sessionStorage: sobrevive a reload/F5 na
// mesma aba, mas é apagado ao FECHAR o navegador → exige login de novo.
// (Bom para computadores compartilhados, ex.: recepção.)
// ──────────────────────────────────────────────────────────
const TOKEN_KEY = 'g3_token';

export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (t: string) => sessionStorage.setItem(TOKEN_KEY, t),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

// ──────────────────────────────────────────────────────────
// Filial ativa — persistida em localStorage. Enviada em toda
// requisição no header X-Filial-Id, para o backend filtrar os
// dados operacionais (agenda, estoque, caixa, etc.) pela unidade
// selecionada, sem exigir novo login para trocar de filial.
// ──────────────────────────────────────────────────────────
const FILIAL_KEY = 'g3_unidade_ativa';

export const filialStore = {
  get: () => localStorage.getItem(FILIAL_KEY),
  set: (id: string) => localStorage.setItem(FILIAL_KEY, id),
  clear: () => localStorage.removeItem(FILIAL_KEY),
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = tokenStore.get();
  const filial = filialStore.get();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(filial ? { 'X-Filial-Id': filial } : {}),
      ...(options?.headers || {}),
    },
  });

  if (res.status === 401) {
    // Token ausente/expirado: limpa e manda para o login.
    tokenStore.clear();
    if (!location.pathname.startsWith('/login')) location.href = '/login';
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try {
      const body = await res.json();
      msg = body.detail || msg;
    } catch {
      /* corpo não-JSON */
    }
    throw new Error(msg);
  }
  return res.json();
}

// ──────────────────────────────────────────────────────────
// Autenticação
// ──────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  nome: string;
  nome_social?: string | null;
  email: string;
  cpf?: string | null;
  telefone?: string | null;
  sexo?: string | null;
  data_nascimento?: string | null;
  foto_url?: string | null;
  role: string | null;
  is_dono: boolean;
  empresa_id: number;
  conselho_tipo?: string | null;
  conselho_numero?: string | null;
  conselho_uf?: string | null;
  filiais: { unidade_id: number; is_admin_filial: boolean }[];
  permissoes: { unidade_id: number; modulo: string }[];
}

interface TokenResponse {
  access_token: string;
  usuario_id: string;
  empresa_id: number;
  is_dono: boolean;
}

export interface RegisterData {
  empresa_nome: string;
  dono_nome: string;
  email: string;
  senha: string;
  cnpj?: string;
  filial_nome?: string;
}

export const authApi = {
  register: async (data: RegisterData): Promise<TokenResponse> => {
    const res = await apiFetch<TokenResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    tokenStore.set(res.access_token);
    return res;
  },
  login: async (email: string, senha: string): Promise<TokenResponse> => {
    const res = await apiFetch<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    });
    tokenStore.set(res.access_token);
    return res;
  },
  me: () => apiFetch<AuthUser>('/auth/me'),
  atualizarPerfil: (data: Partial<AuthUser>) =>
    apiFetch<{ ok: boolean }>('/auth/perfil', { method: 'PUT', body: JSON.stringify(data) }),
  trocarSenha: (nova_senha: string, senha_atual?: string) =>
    apiFetch<{ ok: boolean }>('/auth/senha', { method: 'POST', body: JSON.stringify({ nova_senha, senha_atual }) }),
  logout: () => tokenStore.clear(),
};

// ──────────────────────────────────────────────────────────
// Pacientes
// ──────────────────────────────────────────────────────────
export interface APIPaciente {
  id: number;
  nome: string;
  cpf: string;
  telefone?: string;
  unidade_id?: number | null;
  data_nascimento?: string;
  sexo?: string;
  genero?: string;
  nome_mae?: string;
  email?: string;
  responsavel_nome?: string;
  responsavel_cpf?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  plano_saude?: string;
  carteirinha_numero?: string;
  carteirinha_validade?: string;
  alergias?: string;
  observacoes?: string;
}

export const pacientesApi = {
  listar: () => apiFetch<APIPaciente[]>('/api/pacientes'),
  obter: (id: number) => apiFetch<APIPaciente>(`/api/pacientes/${id}`),
  criar: (data: Omit<APIPaciente, 'id'>) =>
    apiFetch<APIPaciente>('/api/pacientes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  atualizar: (id: number, data: Partial<Omit<APIPaciente, 'id'>>) =>
    apiFetch<APIPaciente>(`/api/pacientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  excluir: (id: number) =>
    apiFetch<{ ok: boolean; id: number }>(`/api/pacientes/${id}`, {
      method: 'DELETE',
    }),
};

// ──────────────────────────────────────────────────────────
// Helper genérico de CRUD (tabelas do backend genérico)
// ──────────────────────────────────────────────────────────
export function crudApi<T extends { id: number | string }>(prefix: string) {
  return {
    listar: () => apiFetch<T[]>(`/api/${prefix}`),
    obter: (id: number | string) => apiFetch<T>(`/api/${prefix}/${id}`),
    criar: (data: Partial<T>) =>
      apiFetch<T>(`/api/${prefix}`, { method: 'POST', body: JSON.stringify(data) }),
    atualizar: (id: number | string, data: Partial<T>) =>
      apiFetch<T>(`/api/${prefix}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    excluir: (id: number | string) =>
      apiFetch<{ ok: boolean }>(`/api/${prefix}/${id}`, { method: 'DELETE' }),
  };
}

// Salas
export interface APISala {
  id: string;
  unidade_id?: number | null;
  nome: string;
  tipo?: string | null;
  capacidade?: number | null;
  status?: string | null;
  observacoes?: string | null;
  ativa?: boolean;
}
export const salasApi = crudApi<APISala>('salas');

// Procedimentos / Atendimentos
export interface APIProcedimento {
  id: string;
  unidade_id?: number | null;
  nome: string;
  tipo?: string | null;
  duracao?: number | null;
  valor_padrao?: number | null;
  valor_repasse?: number | null;
  tipo_repasse?: string | null;
  ativo?: boolean;
}
export const procedimentosApi = crudApi<APIProcedimento>('procedimentos');

// Unidades (cadastro completo de filiais)
export interface APIUnidade {
  id: number;
  nome_fantasia?: string | null;
  razao_social?: string | null;
  cnpj?: string | null;
  telefone?: string | null;
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  logo_url?: string | null;
}
export const unidadesApi = crudApi<APIUnidade>('unidades');

// Especialidades Odonto
export interface APIEspecialidade {
  id: string;
  nome: string;
  cor?: string | null;
  ativo?: boolean;
}
export const especialidadesApi = crudApi<APIEspecialidade>('especialidades_odonto');

// Odonto Procedimentos (intervenções)
export interface APIOdontoProc {
  id: string;
  nome_intervencao: string;
  valor_base?: number | null;
  especialidade_id?: string | null;
  tipo_visual?: string | null;
  ativo?: boolean;
}
export const odontoProcApi = crudApi<APIOdontoProc>('odonto_procedimentos');

// Usuários (perfis) + permissões
export interface APIUsuario {
  id: string;
  nome: string;
  email?: string | null;
  cpf?: string | null;
  telefone?: string | null;
  role?: string | null;
  ativo?: boolean;
  is_dono?: boolean;
  especialidade?: string | null;
  conselho_tipo?: string | null;
  conselho_numero?: string | null;
  conselho_uf?: string | null;
  especialidade_medica?: string | null;
  rqe_numero?: string | null;
  rqe_uf?: string | null;
}

export interface APIModulo { chave: string; nome: string; }
export interface APIPermissao { id: number; usuario_id: string; unidade_id: number; modulo: string; }

const perfisCrud = crudApi<APIUsuario>('perfis_usuarios');
export const usuariosApi = {
  listar: perfisCrud.listar,
  atualizar: perfisCrud.atualizar,
  // delete dedicado: remove vínculos (filiais/permissões) antes, evitando erro de FK
  excluir: (id: string) =>
    apiFetch<{ ok: boolean }>(`/admin/usuarios/${id}`, { method: 'DELETE' }),
  criar: (data: Record<string, unknown>) =>
    apiFetch<{ id: string; nome: string; email: string }>('/admin/usuarios', {
      method: 'POST', body: JSON.stringify(data),
    }),
  redefinirSenha: (id: string, senha: string) =>
    apiFetch<{ ok: boolean }>(`/admin/usuarios/${id}/senha`, {
      method: 'POST', body: JSON.stringify({ senha }),
    }),
  definirPermissoes: (id: string, unidade_id: number, modulos: string[]) =>
    apiFetch<{ ok: boolean }>(`/admin/usuarios/${id}/permissoes`, {
      method: 'POST', body: JSON.stringify({ unidade_id, modulos }),
    }),
};
export const modulosApi = { listar: () => apiFetch<APIModulo[]>('/admin/modulos') };
export const permissoesApi = crudApi<APIPermissao>('usuario_permissoes');

// Agendamentos
export interface APIAgendamento {
  id: string;
  unidade_id?: number | null;
  sala_id?: string | null;
  profissional_id?: string | null;
  procedimento_id?: string | null;
  paciente_id?: number | null;
  data_agendamento?: string | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  status?: string | null;
  observacoes?: string | null;
  forma_pagamento?: string | null;
  convenio_id?: number | null;
  valor_cobrado?: number | null;
}
export const agendamentosApi = crudApi<APIAgendamento>('agendamentos');

// Finaliza o atendimento: marca Finalizado, lança no caixa do dia e audita (regra de negócio no backend)
export function finalizarAtendimento(agendamentoId: string) {
  return apiFetch<{ ok: boolean; agendamento_id: string; ja_finalizado: boolean; caixa_lancamento_id: string | null }>(
    `/api/agendamentos/${agendamentoId}/finalizar`, { method: 'POST' });
}

// Custos operacionais (DRE)
export interface APICusto {
  id: string; descricao?: string; categoria?: string | null; frequencia?: string | null;
  valor?: number | null; status?: string | null;
}
export const custosApi = crudApi<APICusto>('custos_operacionais');

// Tabela de laboratório (DRE)
export interface APITabelaLab {
  id: string; exame: string; laboratorio?: string | null; custo?: number | null; prazo?: string | null;
}
export const tabelaLabApi = crudApi<APITabelaLab>('tabela_laboratorio');

// Repasses de recepcionistas
export interface APIRepasseRecep {
  id: string; recepcionista_id?: string | null; tipo?: string | null; referencia?: string | null;
  valor?: number | null; status?: string | null;
}
export const repasseRecepApi = crudApi<APIRepasseRecep>('repasses_recepcionistas');

// Recebimentos
export interface APIRecebimento {
  id: string; agendamento_id?: string | null; unidade_id?: number | null;
  paciente_id?: number | null; convenio_id?: number | null; descricao?: string | null;
  forma_pagamento?: string | null; valor?: number | null; status?: string | null;
  data_vencimento?: string | null; data_recebimento?: string | null; observacoes?: string | null;
}
export const recebimentosApi = crudApi<APIRecebimento>('recebimentos');

// Recepção laboratorial
export interface APIRecepcaoLab {
  id: string; paciente_id?: number | null; profissional_id?: string | null;
  laboratorio?: string | null; tipo_trabalho?: string | null; data_entrada?: string | null;
  data_prevista?: string | null; data_retorno?: string | null; status?: string | null;
  valor?: number | null; observacoes?: string | null;
}
export const recepcaoLabApi = crudApi<APIRecepcaoLab>('recepcao_lab');

// ── Estoque ──
export interface APIEstoqueCategoria { id: string; nome: string; descricao?: string | null; ativo?: boolean; }
export const estoqueCategoriasApi = crudApi<APIEstoqueCategoria>('estoque_categorias');

export interface APIEstoqueProduto {
  id: string; codigo?: string | null; nome: string; categoria_id?: string | null;
  fornecedor_id?: string | null; unidade_medida?: string | null; unidades_por_embalagem?: number | null;
  estoque_minimo?: number | null; custo_unitario?: number | null; data_validade?: string | null;
}
export const estoqueProdutosApi = crudApi<APIEstoqueProduto>('estoque_produtos');

export interface APIEstoqueFornecedor { id: string; nome: string; cnpj_cpf?: string | null; telefone?: string | null; email?: string | null; }
export const estoqueFornecedoresApi = crudApi<APIEstoqueFornecedor>('estoque_fornecedores');

export interface APIEstoqueMov {
  id: string; produto_id?: string | null; tipo?: string | null; quantidade?: number | null;
  custo_unitario?: number | null; observacoes?: string | null; criado_em?: string | null;
}
export const estoqueMovApi = crudApi<APIEstoqueMov>('estoque_movimentacoes');

export interface APIEstoquePedido {
  id: string; fornecedor_id?: string | null; itens_texto?: string | null; custo_estimado?: number | null;
  status?: string | null; criado_em?: string | null;
}
export const estoquePedidosApi = crudApi<APIEstoquePedido>('estoque_pedidos');

export interface APIProcMaterial { id: string; procedimento_id?: string | null; produto_id?: string | null; quantidade?: number | null; }
export const procMateriaisApi = crudApi<APIProcMaterial>('procedimento_materiais');

// Estoque — regra de negócio (movimentar atualiza saldo)
export interface APISaldo { produto_id: string; unidade_id?: number | null; quantidade: number; }
export const estoqueApi = {
  movimentar: (data: { produto_id: string; tipo: string; quantidade: number; unidade_id?: number; custo_unitario?: number; observacoes?: string }) =>
    apiFetch<{ ok: boolean; produto_id: string; saldo: number }>('/api/estoque/movimentar', { method: 'POST', body: JSON.stringify(data) }),
  saldos: () => apiFetch<APISaldo[]>('/api/estoque/saldos'),
};

// Auditoria — trilha de eventos
export interface APIEvento { id: string; usuario_nome?: string | null; acao?: string | null; modulo?: string | null; entidade?: string | null; descricao?: string | null; criado_em?: string | null; }
export const eventosApi = crudApi<APIEvento>('eventos_auditoria');

// Caixa (lançamentos do dia)
export interface APICaixaLancamento {
  id: string; tipo?: string | null; descricao?: string | null; paciente_id?: number | null;
  valor?: number | null; forma_pagamento?: string | null; data?: string | null; criado_em?: string | null;
}
export const caixaLancamentosApi = crudApi<APICaixaLancamento>('caixa_lancamentos');

// Caixa — turnos (abertura/fechamento do dia)
export interface APICaixaTurno {
  id: string; data_abertura?: string | null; data_fechamento?: string | null;
  status_auditoria?: string | null; total_arrecadado?: number | null;
  total_retido_clinica?: number | null; total_repasse_medicos?: number | null;
}
export const caixaTurnosApi = crudApi<APICaixaTurno>('caixa_turnos');

// Financeiro — lançamentos mensais por serviço
export interface APIFinLancamento { id: string; procedimento_id?: string | null; mes?: string | null; quantidade?: number | null; }
export const finLancamentosApi = crudApi<APIFinLancamento>('financeiro_lancamentos');

// Notificações
export interface APINotificacao { id: string; publico_alvo?: string | null; tipo?: string | null; titulo: string; mensagem?: string | null; lida?: boolean; criado_em?: string | null; }
export const notificacoesApi = crudApi<APINotificacao>('notificacoes');

// Modelos de prontuário (evolução) — HTML reutilizável guardado em `conteudo`
export interface APIModeloProntuario { id: string; titulo?: string | null; conteudo?: any; tipo_acesso?: string | null; profissional_id?: string | null; criado_em?: string | null; }
export const modelosProntuarioApi = crudApi<APIModeloProntuario>('modelos_prontuario');

// Backup (export/import dos dados do tenant)
export const backupApi = {
  exportar: () => apiFetch<Record<string, unknown>>('/api/backup'),
  importar: (dump: unknown) =>
    apiFetch<{ ok: boolean; registros: number }>('/api/backup/importar', { method: 'POST', body: JSON.stringify(dump) }),
};

// Prontuário — atendimentos clínicos, evoluções, documentos
export interface APIAtendimentoClinico { id: string; paciente_id?: number | null; profissional_id?: string | null; data_atendimento?: string | null; }
export const atendimentosClinicosApi = crudApi<APIAtendimentoClinico>('atendimentos_clinicos');

export interface APIEvolucao { id: string; atendimento_id?: string | null; texto_evolucao?: string | null; criado_em?: string | null; }
export const evolucoesApi = crudApi<APIEvolucao>('evolucoes');

export interface APIDocumento { id: string; atendimento_id?: string | null; tipo?: string | null; conteudo?: any; criado_em?: string | null; }
export const documentosApi = crudApi<APIDocumento>('documentos_atendimento');

// Odontograma — orçamentos
export interface APIOrcamento { id: string; paciente_id?: number | null; profissional_id?: string | null; valor_total?: number | null; status_geral?: string | null; data_criacao?: string | null; }
export const orcamentosApi = crudApi<APIOrcamento>('orcamentos');

export interface APIOrcamentoItem { id: string; orcamento_id?: string | null; dente_numero?: string | null; faces?: string | null; procedimento_id?: string | null; valor_cobrado?: number | null; status_item?: string | null; }
export const orcamentoItensApi = crudApi<APIOrcamentoItem>('orcamento_itens');

// Finaliza orçamento (cria orçamento + itens + recebimento pendente — regra de negócio)
export function finalizarOrcamento(data: {
  paciente_id: number; valor_total: number;
  itens: { dente_numero?: string; faces?: string; procedimento_id?: string; valor_cobrado?: number }[];
}) {
  return apiFetch<{ ok: boolean; orcamento_id: string; recebimento_id: string }>(
    '/api/orcamentos/finalizar', { method: 'POST', body: JSON.stringify(data) });
}

// Upload de arquivo (multipart, com token)
export async function uploadArquivo(file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append('file', file);
  const token = tokenStore.get();
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error('Falha no upload');
  return res.json();
}

// Config chave/valor por empresa (clinica_dados)
export interface APIConfig { id: string; chave: string; valor: unknown; }
export const configApi = {
  obter: async (chave: string): Promise<unknown | null> => {
    const rows = await apiFetch<APIConfig[]>(`/api/clinica_dados?chave=${encodeURIComponent(chave)}`);
    return rows.length ? rows[0].valor : null;
  },
  salvar: async (chave: string, valor: unknown) => {
    const rows = await apiFetch<APIConfig[]>(`/api/clinica_dados?chave=${encodeURIComponent(chave)}`);
    if (rows.length) return apiFetch(`/api/clinica_dados/${rows[0].id}`, { method: 'PUT', body: JSON.stringify({ valor }) });
    return apiFetch('/api/clinica_dados', { method: 'POST', body: JSON.stringify({ chave, valor }) });
  },
};

// ──────────────────────────────────────────────────────────
// Filiais (unidades da empresa) — para selects
// ──────────────────────────────────────────────────────────
export interface APIFilial {
  id: number;
  nome: string;
}

export const filiaisApi = {
  listar: () => apiFetch<APIFilial[]>('/api/filiais'),
};

// ──────────────────────────────────────────────────────────
// Convênios
// ──────────────────────────────────────────────────────────
export interface APIConvenio {
  id: number;
  nome: string;
  codigo?: string | null;
  codigo_ans?: string | null;
  tipo?: string | null;
  percentual_repasse?: number | null;
  logo_url?: string | null;
  observacoes?: string | null;
  ativo: boolean;
}

export const conveniosApi = {
  listar: () => apiFetch<APIConvenio[]>('/api/convenios'),
  criar: (data: Partial<Omit<APIConvenio, 'id'>>) =>
    apiFetch<APIConvenio>('/api/convenios', { method: 'POST', body: JSON.stringify(data) }),
  atualizar: (id: number, data: Partial<Omit<APIConvenio, 'id'>>) =>
    apiFetch<APIConvenio>(`/api/convenios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  excluir: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/convenios/${id}`, { method: 'DELETE' }),
};

// ──────────────────────────────────────────────────────────
// Consultas
// ──────────────────────────────────────────────────────────
export interface APIConsulta {
  id: number;
  paciente_id: number;
  data_hora: string;
  motivo?: string;
  cid?: string;
  cid_descricao?: string;
  historico?: string;
  prescricoes: APIPrescrição[];
}

export interface APIPrescrição {
  id: number;
  consulta_id: number;
  memed_id?: string;
  link_receita?: string;
  resumo_html?: string;
  data_criacao: string;
}

export const consultasApi = {
  listarPorPaciente: (pacienteId: number) =>
    apiFetch<APIConsulta[]>(`/api/pacientes/${pacienteId}/consultas`),
  criar: (data: { paciente_id: number; motivo?: string; cid?: string; cid_descricao?: string; historico?: string }) =>
    apiFetch<APIConsulta>('/api/consultas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ──────────────────────────────────────────────────────────
// CID — busca autocomplete
// ──────────────────────────────────────────────────────────
export interface CIDItem {
  codigo: string;
  descricao: string;
}

export const cidApi = {
  buscar: async (q: string): Promise<CIDItem[]> => {
    const res = await apiFetch<{ data: CIDItem[] }>(`/api/cid/search?q=${encodeURIComponent(q)}`);
    return res.data;
  },
};

// ──────────────────────────────────────────────────────────
// Memed — token e medicamentos
// ──────────────────────────────────────────────────────────
export interface MemedMedicamento {
  id: string | number;
  nome: string;
}

export interface MemedAmbiente {
  ambiente: string; base_url: string; script_url: string; id_prefixo: string; chaves_configuradas: boolean;
}

export const memedApi = {
  getToken: () => apiFetch<{ token: string }>('/api/memed/token'),
  ambiente: () => apiFetch<MemedAmbiente>('/api/memed/ambiente'),
  buscarMedicamentos: async (q: string): Promise<MemedMedicamento[]> => {
    const res = await apiFetch<{ data: any[] }>(`/api/memed/medicamentos?q=${encodeURIComponent(q)}`);
    return (res.data || []).map((d: any) => ({
      id: d.id,
      nome: d.attributes?.name || d.nome || d.name || String(d.id),
    }));
  },
  // LGPD: persistir prescrição emitida e remover excluída
  salvarPrescricao: (prescricao: any) =>
    apiFetch<{ ok: boolean; memed_id: string }>('/api/memed/prescricoes', { method: 'POST', body: JSON.stringify(prescricao) }),
  excluirPrescricao: (memedId: string | number) =>
    apiFetch<{ ok: boolean }>(`/api/memed/prescricoes/${memedId}`, { method: 'DELETE' }),
};
