from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class PacienteBase(BaseModel):
    nome: str
    cpf: str
    telefone: Optional[str] = None
    unidade_id: Optional[int] = None
    data_nascimento: Optional[date] = None
    sexo: Optional[str] = None
    genero: Optional[str] = None
    nome_mae: Optional[str] = None
    email: Optional[str] = None
    responsavel_nome: Optional[str] = None
    responsavel_cpf: Optional[str] = None
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    plano_saude: Optional[str] = None
    carteirinha_numero: Optional[str] = None
    carteirinha_validade: Optional[date] = None
    alergias: Optional[str] = None
    observacoes: Optional[str] = None

class PacienteCreate(PacienteBase):
    pass

class PacienteUpdate(BaseModel):
    nome: Optional[str] = None
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    unidade_id: Optional[int] = None
    data_nascimento: Optional[date] = None
    sexo: Optional[str] = None
    genero: Optional[str] = None
    nome_mae: Optional[str] = None
    email: Optional[str] = None
    responsavel_nome: Optional[str] = None
    responsavel_cpf: Optional[str] = None
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    plano_saude: Optional[str] = None
    carteirinha_numero: Optional[str] = None
    carteirinha_validade: Optional[date] = None
    alergias: Optional[str] = None
    observacoes: Optional[str] = None

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

class FechamentoCaixaGerar(BaseModel):
    medico_id: str
    data_fechamento: str

class FechamentoCaixaConfirmar(BaseModel):
    senha: str

class FechamentoCaixaContestar(BaseModel):
    observacao: str

