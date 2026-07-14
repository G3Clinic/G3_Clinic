"""
Autenticação (JWT) e autorização (multi-tenant + RBAC por módulo).

Fluxo:
  - Cada requisição autenticada traz um Bearer token com claims:
    sub (usuario_id), empresa_id, is_dono, role.
  - get_current_user valida o token e carrega o perfil (checa 'ativo').
  - O escopo por empresa (empresa_id) sai SEMPRE do token — o cliente não
    escolhe a empresa, evitando vazamento entre tenants.
  - require_modulo(chave) libera dono/administrador e, para os demais,
    exige permissão gravada em usuario_permissoes (por filial ativa, se
    informada no header X-Filial-Id).
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from . import clinica_models as cm
from . import tenant_models as tm

_bearer = HTTPBearer(auto_error=True)


def hash_senha(senha: str) -> str:
    # bcrypt trabalha com no máximo 72 bytes — truncamos de forma determinística.
    return bcrypt.hashpw(senha.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verificar_senha(senha: str, senha_hash: str) -> bool:
    if not senha_hash:
        return False
    try:
        return bcrypt.checkpw(senha.encode("utf-8")[:72], senha_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def criar_token(usuario: cm.PerfilUsuario) -> str:
    expira = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {
        "sub": usuario.id,
        "empresa_id": usuario.empresa_id,
        "is_dono": bool(usuario.is_dono),
        "role": usuario.role,
        "exp": expira,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def get_current_user(
    cred: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> cm.PerfilUsuario:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            cred.credentials, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        uid = payload.get("sub")
        if not uid:
            raise exc
    except JWTError:
        raise exc

    user = db.get(cm.PerfilUsuario, uid)
    if user is None or user.ativo is False:
        raise exc
    return user


def get_empresa_id(user: cm.PerfilUsuario = Depends(get_current_user)) -> int:
    """empresa_id do tenant atual — sempre derivado do token."""
    if user.empresa_id is None:
        raise HTTPException(status_code=403, detail="Usuário sem empresa vinculada")
    return user.empresa_id


def require_modulo(modulo: str):
    """Dependency factory: exige acesso ao módulo (por filial ativa opcional)."""

    def _dep(
        user: cm.PerfilUsuario = Depends(get_current_user),
        x_filial_id: Optional[int] = Header(default=None, alias="X-Filial-Id"),
        db: Session = Depends(get_db),
    ) -> cm.PerfilUsuario:
        # Dono e administrador têm acesso total dentro da empresa.
        if user.is_dono or user.role == "administrador":
            return user

        q = db.query(tm.UsuarioPermissao).filter(
            tm.UsuarioPermissao.usuario_id == user.id,
            tm.UsuarioPermissao.modulo == modulo,
        )
        if x_filial_id is not None:
            q = q.filter(tm.UsuarioPermissao.unidade_id == x_filial_id)

        if db.query(q.exists()).scalar():
            return user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Sem permissão para o módulo '{modulo}'",
        )

    return _dep
