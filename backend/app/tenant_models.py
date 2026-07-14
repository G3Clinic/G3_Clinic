"""
Modelos de multi-tenancy e RBAC (controle de acesso).

Hierarquia:
    Empresa (tenant / cliente SaaS)
      └── Unidade (filial)                       [clinica_models.Unidade.empresa_id]
            └── Usuário (perfis_usuarios)         [empresa_id + vínculo por filial]
      └── Dados compartilhados (pacientes, ...)   escopo = empresa

Isolamento: TODA tabela de domínio carrega `empresa_id` (row-level tenancy).
O acesso é gravado no banco (não mais em constante no cliente):
  - usuario_filiais      → quais filiais um funcionário acessa
  - usuario_permissoes   → quais módulos ele acessa (por filial)
O dono (is_dono) e o papel 'administrador' enxergam tudo dentro da empresa.
"""
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint,
)

from .database import Base


class TenantMixin:
    """Adiciona empresa_id às tabelas de domínio (isolamento por linha)."""
    empresa_id = Column(Integer, ForeignKey("empresas.id"), index=True, nullable=True)


# Módulos do sistema (fixos, não pertencem a nenhuma empresa).
MODULOS_PADRAO = [
    ("pacientes", "Pacientes"),
    ("agenda", "Agenda"),
    ("prontuario", "Prontuário"),
    ("odontograma", "Odontograma"),
    ("caixa", "Caixa"),
    ("financeiro", "Financeiro"),
    ("estoque", "Estoque"),
    ("recepcao", "Recepção / Laboratório"),
    ("relatorios", "Relatórios"),
    ("admin", "Administração"),
]


class Empresa(Base):
    __tablename__ = "empresas"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column(String, nullable=False, index=True)
    cnpj = Column(String, nullable=True)
    plano = Column(String, default="basico")
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)


class Modulo(Base):
    __tablename__ = "modulos"

    chave = Column(String, primary_key=True)  # ex.: 'estoque'
    nome = Column(String, nullable=False)


class UsuarioFilial(Base):
    """Quais filiais (unidades) um usuário pode acessar."""
    __tablename__ = "usuario_filiais"
    __table_args__ = (UniqueConstraint("usuario_id", "unidade_id", name="uq_usuario_filial"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), index=True)
    usuario_id = Column(String, ForeignKey("perfis_usuarios.id"), index=True)
    unidade_id = Column(Integer, ForeignKey("unidades.id"), index=True)
    is_admin_filial = Column(Boolean, default=False)  # admin daquela filial
    criado_em = Column(DateTime, default=datetime.utcnow)


class UsuarioPermissao(Base):
    """Quais módulos um usuário acessa em uma filial (delegado pelo admin)."""
    __tablename__ = "usuario_permissoes"
    __table_args__ = (
        UniqueConstraint("usuario_id", "unidade_id", "modulo", name="uq_usuario_perm"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), index=True)
    usuario_id = Column(String, ForeignKey("perfis_usuarios.id"), index=True)
    unidade_id = Column(Integer, ForeignKey("unidades.id"), index=True)
    modulo = Column(String, ForeignKey("modulos.chave"))
    criado_em = Column(DateTime, default=datetime.utcnow)
