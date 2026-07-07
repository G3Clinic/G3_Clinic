from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class PacienteBase(BaseModel):
    nome: str
    cpf: str
    telefone: str
    data_nascimento: Optional[date] = None
    sexo: Optional[str] = None
    plano_saude: Optional[str] = None
    observacoes: Optional[str] = None
    alergias: Optional[str] = None

class PacienteCreate(PacienteBase):
    pass

class PacienteResponse(PacienteBase):
    id: int

    class Config:
        from_attributes = True

class PrescricaoBase(BaseModel):
    memed_id: Optional[str] = None
    link_receita: Optional[str] = None
    resumo_html: Optional[str] = None

class PrescricaoResponse(PrescricaoBase):
    id: int
    consulta_id: int
    data_criacao: datetime

    class Config:
        from_attributes = True

class ConsultaBase(BaseModel):
    motivo: Optional[str] = None
    cid: Optional[str] = None
    cid_descricao: Optional[str] = None
    historico: Optional[str] = None

class ConsultaCreate(ConsultaBase):
    paciente_id: int

class ConsultaResponse(ConsultaBase):
    id: int
    paciente_id: int
    data_hora: datetime
    prescricoes: List[PrescricaoResponse] = []

    class Config:
        from_attributes = True
