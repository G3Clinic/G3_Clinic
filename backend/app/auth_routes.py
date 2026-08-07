"""
Rotas de autenticação e de administração (delegação de acesso).

/auth/register  → cria empresa + filial matriz + usuário dono (retorna token)
/auth/login     → autentica por e-mail/senha (retorna token)
/auth/me        → perfil do usuário logado + filiais + permissões

/admin/modulos              → lista os módulos do sistema
/admin/usuarios             → cria funcionário na empresa do usuário logado
/admin/usuarios/{id}/filiais    → vincula usuário a uma filial
/admin/usuarios/{id}/permissoes → define quais módulos o usuário acessa numa filial
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from .database import get_db
from . import clinica_models as cm
from . import tenant_models as tm
from .auth import (
    hash_senha, verificar_senha, criar_token, get_current_user, get_empresa_id,
)

router = APIRouter(tags=["auth"])


# ── Schemas ────────────────────────────────────────────────────────────

class RegisterIn(BaseModel):
    empresa_nome: str
    cnpj: Optional[str] = None
    filial_nome: str = "Matriz"
    dono_nome: str
    email: EmailStr
    senha: str


class LoginIn(BaseModel):
    email: EmailStr
    senha: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario_id: str
    empresa_id: int
    is_dono: bool


class NovoUsuarioIn(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    role: str = "recepcionista"
    unidade_ids: List[int] = []
    is_admin_filial: bool = False
    # opcionais (profissional de saúde / dados extras)
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    especialidade: Optional[str] = None
    conselho_tipo: Optional[str] = None
    conselho_numero: Optional[str] = None
    conselho_uf: Optional[str] = None
    especialidade_medica: Optional[str] = None
    rqe_numero: Optional[str] = None
    rqe_uf: Optional[str] = None


class PermissoesIn(BaseModel):
    unidade_id: int
    modulos: List[str]


class FiliaisIn(BaseModel):
    unidade_ids: List[int]


class SenhaIn(BaseModel):
    senha: str


# ── Auth ───────────────────────────────────────────────────────────────

@router.post("/auth/register", response_model=TokenOut, status_code=201)
def register(dados: RegisterIn, db: Session = Depends(get_db)):
    existe = db.query(cm.PerfilUsuario).filter(cm.PerfilUsuario.email == dados.email).first()
    if existe:
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")

    empresa = tm.Empresa(nome=dados.empresa_nome, cnpj=dados.cnpj)
    db.add(empresa)
    db.flush()  # obtém empresa.id

    filial = cm.Unidade(empresa_id=empresa.id, nome_fantasia=dados.filial_nome)
    db.add(filial)
    db.flush()

    dono = cm.PerfilUsuario(
        empresa_id=empresa.id,
        nome=dados.dono_nome,
        email=dados.email,
        senha_hash=hash_senha(dados.senha),
        is_dono=True,
        role="administrador",
        ativo=True,
    )
    db.add(dono)
    db.flush()

    db.add(tm.UsuarioFilial(
        empresa_id=empresa.id, usuario_id=dono.id,
        unidade_id=filial.id, is_admin_filial=True,
    ))
    db.commit()

    return TokenOut(
        access_token=criar_token(dono), usuario_id=dono.id,
        empresa_id=empresa.id, is_dono=True,
    )


@router.post("/auth/login", response_model=TokenOut)
def login(dados: LoginIn, db: Session = Depends(get_db)):
    user = db.query(cm.PerfilUsuario).filter(cm.PerfilUsuario.email == dados.email).first()
    if not user or not verificar_senha(dados.senha, user.senha_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
    if user.ativo is False:
        raise HTTPException(status_code=403, detail="Usuário desativado")

    return TokenOut(
        access_token=criar_token(user), usuario_id=user.id,
        empresa_id=user.empresa_id, is_dono=bool(user.is_dono),
    )


@router.get("/auth/me")
def me(user: cm.PerfilUsuario = Depends(get_current_user), db: Session = Depends(get_db)):
    filiais = db.query(tm.UsuarioFilial).filter(
        tm.UsuarioFilial.usuario_id == user.id
    ).all()
    permissoes = db.query(tm.UsuarioPermissao).filter(
        tm.UsuarioPermissao.usuario_id == user.id
    ).all()
    return {
        "id": user.id,
        "nome": user.nome,
        "nome_social": user.nome_social,
        "email": user.email,
        "cpf": user.cpf,
        "telefone": user.telefone,
        "sexo": user.sexo,
        "data_nascimento": user.data_nascimento.isoformat() if user.data_nascimento else None,
        "foto_url": user.foto_url,
        "role": user.role,
        "is_dono": bool(user.is_dono),
        "empresa_id": user.empresa_id,
        "conselho_tipo": user.conselho_tipo,
        "conselho_numero": user.conselho_numero,
        "conselho_uf": user.conselho_uf,
        "filiais": [
            {"unidade_id": f.unidade_id, "is_admin_filial": f.is_admin_filial}
            for f in filiais
        ],
        "permissoes": [
            {"unidade_id": p.unidade_id, "modulo": p.modulo} for p in permissoes
        ],
    }


class PerfilUpdateIn(BaseModel):
    nome: Optional[str] = None
    nome_social: Optional[str] = None
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[EmailStr] = None
    sexo: Optional[str] = None
    data_nascimento: Optional[str] = None
    foto_url: Optional[str] = None
    conselho_tipo: Optional[str] = None
    conselho_numero: Optional[str] = None
    conselho_uf: Optional[str] = None


class TrocaSenhaIn(BaseModel):
    senha_atual: Optional[str] = None
    nova_senha: str


@router.put("/auth/perfil")
def atualizar_meu_perfil(
    dados: PerfilUpdateIn,
    user: cm.PerfilUsuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from datetime import date as _date
    campos = dados.model_dump(exclude_unset=True)
    for campo, valor in campos.items():
        if campo == "data_nascimento" and valor:
            try:
                valor = _date.fromisoformat(valor[:10])
            except ValueError:
                continue
        setattr(user, campo, valor)
    db.commit()
    return {"ok": True}


@router.post("/auth/senha")
def trocar_minha_senha(
    dados: TrocaSenhaIn,
    user: cm.PerfilUsuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if len(dados.nova_senha) < 6:
        raise HTTPException(status_code=400, detail="A nova senha deve ter ao menos 6 caracteres")
    # se já houver senha e o usuário informou a atual, valida
    if user.senha_hash and dados.senha_atual is not None:
        if not verificar_senha(dados.senha_atual, user.senha_hash):
            raise HTTPException(status_code=400, detail="Senha atual incorreta")
    user.senha_hash = hash_senha(dados.nova_senha)
    if hasattr(user, "senha_provisoria"):
        user.senha_provisoria = False
    db.commit()
    return {"ok": True}


# ── Administração / delegação ──────────────────────────────────────────

def _exige_admin(user: cm.PerfilUsuario) -> None:
    if not (user.is_dono or user.role == "administrador"):
        raise HTTPException(status_code=403, detail="Ação restrita a administradores")


@router.get("/admin/modulos")
def listar_modulos(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [{"chave": m.chave, "nome": m.nome} for m in db.query(tm.Modulo).all()]


@router.get("/api/usuario_permissoes")
def listar_permissoes(
    user: cm.PerfilUsuario = Depends(get_current_user),
    empresa_id: int = Depends(get_empresa_id),
    db: Session = Depends(get_db),
):
    """Lista as permissões de módulo da empresa (para a tela de Usuários)."""
    _exige_admin(user)
    perms = db.query(tm.UsuarioPermissao).filter(
        tm.UsuarioPermissao.empresa_id == empresa_id
    ).all()
    return [
        {"id": p.id, "usuario_id": p.usuario_id, "unidade_id": p.unidade_id, "modulo": p.modulo}
        for p in perms
    ]


@router.post("/admin/usuarios", status_code=201)
def criar_usuario(
    dados: NovoUsuarioIn,
    user: cm.PerfilUsuario = Depends(get_current_user),
    empresa_id: int = Depends(get_empresa_id),
    db: Session = Depends(get_db),
):
    _exige_admin(user)
    if db.query(cm.PerfilUsuario).filter(cm.PerfilUsuario.email == dados.email).first():
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")

    novo = cm.PerfilUsuario(
        empresa_id=empresa_id, nome=dados.nome, email=dados.email,
        senha_hash=hash_senha(dados.senha), role=dados.role, ativo=True,
        cpf=dados.cpf, telefone=dados.telefone, especialidade=dados.especialidade,
        conselho_tipo=dados.conselho_tipo, conselho_numero=dados.conselho_numero,
        conselho_uf=dados.conselho_uf, especialidade_medica=dados.especialidade_medica,
        rqe_numero=dados.rqe_numero, rqe_uf=dados.rqe_uf,
    )
    db.add(novo)
    db.flush()

    for uid in dados.unidade_ids:
        db.add(tm.UsuarioFilial(
            empresa_id=empresa_id, usuario_id=novo.id,
            unidade_id=uid, is_admin_filial=dados.is_admin_filial,
        ))
    db.commit()
    return {"id": novo.id, "nome": novo.nome, "email": novo.email}


@router.delete("/admin/usuarios/{usuario_id}")
def excluir_usuario(
    usuario_id: str,
    user: cm.PerfilUsuario = Depends(get_current_user),
    empresa_id: int = Depends(get_empresa_id),
    db: Session = Depends(get_db),
):
    _exige_admin(user)
    alvo = db.get(cm.PerfilUsuario, usuario_id)
    if not alvo or alvo.empresa_id != empresa_id:
        raise HTTPException(status_code=404, detail="Usuário não encontrado na empresa")
    if alvo.is_dono:
        raise HTTPException(status_code=400, detail="O dono da empresa não pode ser excluído")
    # remove vínculos antes (evita erro de FK)
    db.query(tm.UsuarioPermissao).filter(tm.UsuarioPermissao.usuario_id == usuario_id).delete()
    db.query(tm.UsuarioFilial).filter(tm.UsuarioFilial.usuario_id == usuario_id).delete()
    from .audit import registrar_evento
    registrar_evento(db, user, "exclusão", "admin", "perfis_usuarios", usuario_id, f'Excluiu usuário "{alvo.nome}"')
    db.delete(alvo)
    db.commit()
    return {"ok": True, "id": usuario_id}


@router.post("/admin/usuarios/{usuario_id}/senha")
def redefinir_senha(
    usuario_id: str,
    dados: SenhaIn,
    user: cm.PerfilUsuario = Depends(get_current_user),
    empresa_id: int = Depends(get_empresa_id),
    db: Session = Depends(get_db),
):
    _exige_admin(user)
    alvo = db.get(cm.PerfilUsuario, usuario_id)
    if not alvo or alvo.empresa_id != empresa_id:
        raise HTTPException(status_code=404, detail="Usuário não encontrado na empresa")
    if len(dados.senha) < 6:
        raise HTTPException(status_code=400, detail="A senha deve ter ao menos 6 caracteres")
    alvo.senha_hash = hash_senha(dados.senha)
    db.commit()
    return {"ok": True}


@router.post("/admin/usuarios/{usuario_id}/filiais")
def vincular_filial(
    usuario_id: str,
    unidade_id: int,
    user: cm.PerfilUsuario = Depends(get_current_user),
    empresa_id: int = Depends(get_empresa_id),
    db: Session = Depends(get_db),
):
    _exige_admin(user)
    alvo = db.get(cm.PerfilUsuario, usuario_id)
    if not alvo or alvo.empresa_id != empresa_id:
        raise HTTPException(status_code=404, detail="Usuário não encontrado na empresa")

    ja = db.query(tm.UsuarioFilial).filter_by(
        usuario_id=usuario_id, unidade_id=unidade_id
    ).first()
    if not ja:
        db.add(tm.UsuarioFilial(
            empresa_id=empresa_id, usuario_id=usuario_id, unidade_id=unidade_id
        ))
        db.commit()
    return {"ok": True}


@router.get("/admin/usuarios/filiais")
def listar_filiais_todos_usuarios(
    user: cm.PerfilUsuario = Depends(get_current_user),
    empresa_id: int = Depends(get_empresa_id),
    db: Session = Depends(get_db),
):
    """Vínculos usuário↔filial de toda a empresa, num só request (tela de Usuários usa
    isso pra filtrar por unidade sem precisar de N chamadas, uma por usuário)."""
    _exige_admin(user)
    vinculos = db.query(tm.UsuarioFilial).filter(tm.UsuarioFilial.empresa_id == empresa_id).all()
    return [{"usuario_id": v.usuario_id, "unidade_id": v.unidade_id} for v in vinculos]


@router.get("/admin/usuarios/{usuario_id}/filiais")
def listar_filiais_usuario(
    usuario_id: str,
    user: cm.PerfilUsuario = Depends(get_current_user),
    empresa_id: int = Depends(get_empresa_id),
    db: Session = Depends(get_db),
):
    _exige_admin(user)
    alvo = db.get(cm.PerfilUsuario, usuario_id)
    if not alvo or alvo.empresa_id != empresa_id:
        raise HTTPException(status_code=404, detail="Usuário não encontrado na empresa")

    filiais = db.query(tm.UsuarioFilial).filter_by(usuario_id=usuario_id).all()
    return [f.unidade_id for f in filiais]


@router.put("/admin/usuarios/{usuario_id}/filiais")
def definir_filiais_usuario(
    usuario_id: str,
    dados: FiliaisIn,
    user: cm.PerfilUsuario = Depends(get_current_user),
    empresa_id: int = Depends(get_empresa_id),
    db: Session = Depends(get_db),
):
    _exige_admin(user)
    alvo = db.get(cm.PerfilUsuario, usuario_id)
    if not alvo or alvo.empresa_id != empresa_id:
        raise HTTPException(status_code=404, detail="Usuário não encontrado na empresa")

    # Apaga as atuais
    db.query(tm.UsuarioFilial).filter_by(usuario_id=usuario_id).delete()
    
    # Insere as novas
    for uid in dados.unidade_ids:
        db.add(tm.UsuarioFilial(
            empresa_id=empresa_id, usuario_id=usuario_id, unidade_id=uid
        ))
    db.commit()
    return {"ok": True}


@router.post("/admin/usuarios/{usuario_id}/permissoes")
def definir_permissoes(
    usuario_id: str,
    dados: PermissoesIn,
    user: cm.PerfilUsuario = Depends(get_current_user),
    empresa_id: int = Depends(get_empresa_id),
    db: Session = Depends(get_db),
):
    """Substitui as permissões de módulo do usuário naquela filial."""
    _exige_admin(user)
    alvo = db.get(cm.PerfilUsuario, usuario_id)
    if not alvo or alvo.empresa_id != empresa_id:
        raise HTTPException(status_code=404, detail="Usuário não encontrado na empresa")

    validos = {m.chave for m in db.query(tm.Modulo).all()}
    invalidos = set(dados.modulos) - validos
    if invalidos:
        raise HTTPException(status_code=400, detail=f"Módulos inválidos: {sorted(invalidos)}")

    db.query(tm.UsuarioPermissao).filter_by(
        usuario_id=usuario_id, unidade_id=dados.unidade_id
    ).delete()
    for modulo in dados.modulos:
        db.add(tm.UsuarioPermissao(
            empresa_id=empresa_id, usuario_id=usuario_id,
            unidade_id=dados.unidade_id, modulo=modulo,
        ))
    db.commit()
    return {"ok": True, "usuario_id": usuario_id, "unidade_id": dados.unidade_id,
            "modulos": dados.modulos}
