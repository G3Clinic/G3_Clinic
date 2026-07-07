from sqlalchemy import Column, Integer, String, Date, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class Paciente(Base):
    __tablename__ = "pacientes"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)
    cpf = Column(String, unique=True, index=True)
    telefone = Column(String)
    data_nascimento = Column(Date, nullable=True)
    sexo = Column(String, nullable=True)
    plano_saude = Column(String, nullable=True)
    observacoes = Column(Text, nullable=True)
    alergias = Column(String, nullable=True)

    consultas = relationship("Consulta", back_populates="paciente")

class Consulta(Base):
    __tablename__ = "consultas"

    id = Column(Integer, primary_key=True, index=True)
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
    consulta_id = Column(Integer, ForeignKey("consultas.id"))
    memed_id = Column(String, nullable=True)
    link_receita = Column(String, nullable=True)
    resumo_html = Column(Text, nullable=True)
    data_criacao = Column(DateTime, default=datetime.utcnow)

    consulta = relationship("Consulta", back_populates="prescricoes")
