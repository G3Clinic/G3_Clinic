"""
Integração com a API Autolac (laboratório de apoio) — modelo Apoio/Apoiado.

A clínica (Apoiado) autentica com o laboratório de apoio (Apoio) e:
  - sincroniza o catálogo de exames        GET  /Api/Inter-Autolac/Exames
  - envia pedidos (lote)                    POST /Api/Inter-Autolac/Pedidos
  - consulta status dos exames             POST /Api/Inter-Autolac/StatusExame
  - consulta resultados (laudo PDF base64) POST /Api/Inter-Autolac/Resultados

A URL base NÃO consta na documentação pública — é fornecida pelo laboratório de
apoio. Portanto tudo é configurável por ambiente (backend/.env):
  AUTOLAC_BASE_URL   ex.: https://api.autolac.exemplo.com.br
  AUTOLAC_APOIADO_ID código numérico do apoiado (clínica)
  AUTOLAC_SENHA      senha em texto puro (enviada em base64, como a API exige)

As respostas seguem o envelope padrão { statusCode, success, message, data }.
Erros NUNCA repassam str(e) do httpx (pode conter credenciais na URL/body).
"""
import base64
import os
import threading
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv

load_dotenv()

AUTOLAC_BASE_URL = os.getenv("AUTOLAC_BASE_URL", "")
AUTOLAC_APOIADO_ID = os.getenv("AUTOLAC_APOIADO_ID", "")
AUTOLAC_SENHA = os.getenv("AUTOLAC_SENHA", "")

HEADERS = {"Accept": "application/json", "Content-Type": "application/json"}

# Cache de token em memória (accessToken + expiração), protegido por lock.
_token_cache: dict = {"token": None, "expiration": None}
_token_lock = threading.Lock()


def esta_configurada() -> bool:
    return bool(AUTOLAC_BASE_URL and AUTOLAC_APOIADO_ID and AUTOLAC_SENHA)


def _exigir_config():
    if not esta_configurada():
        raise Exception(
            "Integração Autolac não configurada. Defina AUTOLAC_BASE_URL, "
            "AUTOLAC_APOIADO_ID e AUTOLAC_SENHA no backend/.env."
        )


def _url(path: str) -> str:
    return f"{AUTOLAC_BASE_URL.rstrip('/')}/{path.lstrip('/')}"


def _mensagem_erro_http(status: int) -> str:
    if status in (401, 403):
        return "Credenciais Autolac inválidas ou sem permissão. Verifique AUTOLAC_APOIADO_ID / AUTOLAC_SENHA."
    if status == 422:
        return "Dados rejeitados pela Autolac (validação). Confira os campos do pedido."
    if status == 503:
        return "Serviço da Autolac temporariamente indisponível (503). Tente novamente em instantes."
    return f"Erro na integração Autolac (HTTP {status})."


async def _login() -> str:
    """Autentica e devolve o accessToken (sem cache)."""
    _exigir_config()
    body = {
        "apoiadoId": int(AUTOLAC_APOIADO_ID),
        "senha": base64.b64encode(AUTOLAC_SENHA.encode()).decode(),
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(_url("/Api/Inter-Autolac/Login"), json=body, headers=HEADERS)
            resp.raise_for_status()
            payload = resp.json()
    except httpx.HTTPStatusError as e:
        raise Exception(_mensagem_erro_http(e.response.status_code)) from None
    except httpx.RequestError:
        raise Exception("Não foi possível conectar à Autolac. Verifique a URL e a rede.") from None

    data = payload.get("data") or {}
    token = data.get("accessToken")
    if not token:
        raise Exception(payload.get("message") or "Login Autolac não retornou token.")
    with _token_lock:
        _token_cache["token"] = token
        _token_cache["expiration"] = data.get("expiration")
    return token


def _token_valido() -> bool:
    token = _token_cache.get("token")
    exp = _token_cache.get("expiration")
    if not token:
        return False
    if not exp:
        return True
    try:
        dt = datetime.fromisoformat(str(exp).replace("Z", "+00:00"))
        # margem de 60s para não usar token quase expirado
        return dt.timestamp() - 60 > datetime.now(timezone.utc).timestamp()
    except (ValueError, TypeError):
        return True


async def _obter_token() -> str:
    if _token_valido():
        return _token_cache["token"]
    return await _login()


async def _request(method: str, path: str, params: dict = None, json_body: dict = None) -> dict:
    """Requisição autenticada; refaz login uma vez se o token expirou (401)."""
    _exigir_config()
    token = await _obter_token()

    async def _do(tok: str):
        headers = {**HEADERS, "Authorization": f"Bearer {tok}"}
        async with httpx.AsyncClient(timeout=30) as client:
            return await client.request(method, _url(path), params=params, json=json_body, headers=headers)

    try:
        resp = await _do(token)
        if resp.status_code == 401:
            # token pode ter expirado no servidor — renova e tenta de novo
            with _token_lock:
                _token_cache["token"] = None
            resp = await _do(await _obter_token())
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPStatusError as e:
        raise Exception(_mensagem_erro_http(e.response.status_code)) from None
    except httpx.RequestError:
        raise Exception("Não foi possível conectar à Autolac. Verifique a URL e a rede.") from None


# ── Operações de negócio ───────────────────────────────────────────────

async def testar_conexao() -> dict:
    """Faz login e confirma que as credenciais funcionam."""
    _exigir_config()
    with _token_lock:
        _token_cache["token"] = None  # força novo login
    await _login()
    return {"ok": True, "apoiado_id": int(AUTOLAC_APOIADO_ID), "expiration": _token_cache.get("expiration")}


async def listar_exames(page_number: int = 1, page_size: int = 200) -> list:
    payload = await _request(
        "GET", "/Api/Inter-Autolac/Exames",
        params={"pageNumber": page_number, "pageSize": page_size},
    )
    return payload.get("data") or []


async def enviar_pedidos(pedido_lote: dict) -> dict:
    payload = await _request("POST", "/Api/Inter-Autolac/Pedidos", json_body=pedido_lote)
    return payload.get("data") or payload


async def consultar_status(consulta: dict) -> dict:
    payload = await _request("POST", "/Api/Inter-Autolac/StatusExame", json_body=consulta)
    return payload.get("data") or payload


async def consultar_resultados(consulta: dict) -> dict:
    payload = await _request("POST", "/Api/Inter-Autolac/Resultados", json_body=consulta)
    return payload.get("data") or payload
