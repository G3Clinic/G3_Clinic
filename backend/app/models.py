from sqlalchemy import Column, Integer, String, Date, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class Paciente(Base):
    __tablename__ = "pacientes"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), index=True, nullable=True)
    unidade_id = Column(Integer, nullable=True)  # filial de cadastro
    nome = Column(String, index=True)
    # Unicidade é por empresa (validada no endpoint), não global — SaaS multi-tenant.
    cpf = Column(String, index=True)
    telefone = Column(String)
    data_nascimento = Column(Date, nullable=True)
    sexo = Column(String, nullable=True)
    genero = Column(String, nullable=True)
    nome_mae = Column(String, nullable=True)
    email = Column(String, nullable=True)
    # Responsável
    responsavel_nome = Column(String, nullable=True)
    responsavel_cpf = Column(String, nullable=True)
    # Endereço
    cep = Column(String, nullable=True)
    logradouro = Column(String, nullable=True)
    numero = Column(String, nullable=True)
    complemento = Column(String, nullable=True)
    bairro = Column(String, nullable=True)
    cidade = Column(String, nullable=True)
    uf = Column(String, nullable=True)
    # Plano de saúde
    plano_saude = Column(String, nullable=True)
    carteirinha_numero = Column(String, nullable=True)
    carteirinha_validade = Column(Date, nullable=True)
    # Clínico
    alergias = Column(String, nullable=True)
    observacoes = Column(Text, nullable=True)

    consultas = relationship("Consulta", back_populates="paciente")

class Consulta(Base):
    __tablename__ = "consultas"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), index=True, nullable=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"))
    data_hora = Column(DateTime, default=datetime.utcnow)
    motivo = Column(String, nullable=True)
    cid = Column(String, nullable=True)
    cid_descricao = Column(String, nullable=True)
    historico = Column(Text, nullable=True)
    
    paciente = relationship("Paciente", back_populates="consultas")
    prescricoes = relationship("Prescricao", back_populates="consulta")

class Prescricao(Base):
    __tablename__ = "prescricoes"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), index=True, nullable=True)
    consulta_id = Column(Integer, ForeignKey("consultas.id"))
    memed_id = Column(String, nullable=True)
    link_receita = Column(String, nullable=True)
    resumo_html = Column(Text, nullable=True)
    data_criacao = Column(DateTime, default=datetime.utcnow)

    consulta = relationship("Consulta", back_populates="prescricoes")
