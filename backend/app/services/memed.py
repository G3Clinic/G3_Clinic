import os
import re
import httpx
from dotenv import load_dotenv

load_dotenv()

# ── Isolamento de ambientes ────────────────────────────────────────────────
# MEMED_ENV escolhe sandbox (padrão) ou produção. A URL base muda sozinha;
# MEMED_BASE_URL, se definida, tem prioridade (para endpoint custom do onboarding).
# As chaves e o CPF/CRM dos médicos são DIFERENTES entre os ambientes.
# MEMED_ENV: "homologacao" (padrão) ou "producao". URLs conforme o Manual de
# Validação Técnica da Memed. IMPORTANTE: homologação NÃO usa sandbox.memed.com.br
# (instável, critério de reprovação) — usa integrations.api.memed.com.br.
MEMED_ENV = os.getenv("MEMED_ENV", "homologacao").strip().lower()
_IS_PROD = MEMED_ENV in ("producao", "produção", "production", "prod")

# API (backend) e script (frontend) por ambiente.
_API_POR_ENV = {
    True: "https://api.memed.com.br/v1",                    # produção
    False: "https://integrations.api.memed.com.br/v1",      # homologação
}
_SCRIPT_POR_ENV = {
    True: "https://memed.com.br/modulos/plataforma.sinapse-prescricao/build/sinapse-prescricao.min.js",
    False: "https://integrations.memed.com.br/modulos/plataforma.sinapse-prescricao/build/sinapse-prescricao.min.js",
}
MEMED_BASE_URL = os.getenv("MEMED_BASE_URL") or _API_POR_ENV[_IS_PROD]
MEMED_SCRIPT_URL = os.getenv("MEMED_SCRIPT_URL") or _SCRIPT_POR_ENV[_IS_PROD]

# Chaves demo de homologação só entram como fallback QUANDO em homologação — em
# produção ficam vazias de propósito, forçando as chaves reais no .env.
_HOMOLOG_API = "iJGiB4kjDGOLeDFPWMG3no9VnN7Abpqe3w1jEFm6olkhkZD6oSfSmYCm"
_HOMOLOG_SECRET = "Xe8M5GvBGCr4FStKfxXKisRo3SfYKI7KrTMkJpCAstzu2yXVN4av5nmL"
MEMED_API_KEY = os.getenv("MEMED_API_KEY", "" if _IS_PROD else _HOMOLOG_API)
MEMED_SECRET_KEY = os.getenv("MEMED_SECRET_KEY", "" if _IS_PROD else _HOMOLOG_SECRET)

# Prefixo do idExterno para evitar colisão no ambiente de homologação
# (compartilhado entre parceiros — IDs curtos colidem). Ex.: "g3clinica-42".
MEMED_ID_PREFIXO = os.getenv("MEMED_ID_PREFIXO", "g3clinica")

HEADERS = {'Accept': 'application/vnd.api+json', 'Content-Type': 'application/json'}


def ambiente_info() -> dict:
    """Resumo do ambiente Memed (sem expor chaves) — útil p/ diagnóstico e p/ o frontend."""
    return {
        "ambiente": "producao" if _IS_PROD else "homologacao",
        "base_url": MEMED_BASE_URL,
        "script_url": MEMED_SCRIPT_URL,
        "id_prefixo": MEMED_ID_PREFIXO,
        "chaves_configuradas": bool(MEMED_API_KEY and MEMED_SECRET_KEY),
    }

async def _request(method: str, path: str, params: dict = None, json_body: dict = None):
    if not MEMED_API_KEY or not MEMED_SECRET_KEY:
        raise Exception("Integração Memed não configurada. Defina MEMED_API_KEY e MEMED_SECRET_KEY no .env.")

    url = f"{MEMED_BASE_URL.rstrip('/')}/{path.lstrip('/')}"
    params = params or {}
    params.update({"api-key": MEMED_API_KEY, "secret-key": MEMED_SECRET_KEY})

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.request(method, url, params=params, json=json_body, headers=HEADERS)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        # IMPORTANTE: nunca repassar str(e) — a URL contém api-key/secret-key em texto puro.
        status = e.response.status_code
        if status in (401, 403):
            raise Exception("Chaves da Memed inválidas ou sem permissão. Verifique MEMED_API_KEY / MEMED_SECRET_KEY no backend/.env.") from None
        if status in (400, 422):
            # O CORPO traz detalhes de validação (CPF/CRM) e NÃO contém as chaves.
            detalhe = ""
            try:
                errs = e.response.json().get("errors") or []
                detalhe = "; ".join(x.get("detail", "") for x in errs if x.get("detail"))
            except Exception:
                pass
            raise Exception(f"Memed rejeitou os dados do médico: {detalhe}" if detalhe
                            else f"Dados do médico inválidos (HTTP {status}). Verifique CPF e CRM do profissional.") from None
        if status == 503:
            raise Exception("Serviço da Memed temporariamente indisponível (503). Tente novamente em instantes.") from None
        raise Exception(f"Erro na integração Memed (HTTP {status}).") from None
    except httpx.RequestError:
        raise Exception("Não foi possível conectar à Memed. Verifique a conexão de rede e a URL da API.") from None

async def obter_token(*, id_medico: str, nome: str, cpf: str, crm: str, uf: str,
                      data_nascimento: str | None = None, sexo: str | None = None,
                      email: str | None = None, telefone: str | None = None,
                      especialidade: str | None = None) -> str | None:
    """Autentica o prescritor e devolve o data-token.

    NOTA: o endpoint em produção/homologação na base `integrations.api.memed.com.br/v1`
    é `sinapse-prescricao/usuarios` (chaves via query, tratadas em _request). O
    `auth/sign_in` citado em alguns guias retorna "Rota não encontrada" nesse host.

    O external_id (idExterno) recebe um prefixo para não colidir no ambiente de
    homologação, que é compartilhado entre parceiros.
    """
    # A Memed exige nome E sobrenome (1–255 chars). Divide o nome completo.
    partes = (nome or "").strip().split()
    primeiro_nome = partes[0] if partes else "Profissional"
    sobrenome = " ".join(partes[1:]) if len(partes) > 1 else primeiro_nome

    external_id = f"{MEMED_ID_PREFIXO}-{id_medico}"

    # 1) Médico já cadastrado? GET devolve o token (POST daria "já cadastrado").
    try:
        existente = await _request("GET", f"sinapse-prescricao/usuarios/{external_id}")
        token = _extrair_token(existente)
        if token:
            return token
    except Exception:
        pass  # 404/não encontrado → segue para criar

    # 2) Primeiro acesso: cria o prescritor e recebe o token.
    body = {"data": {"type": "usuarios", "attributes": {
        "external_id": external_id,
        "nome": primeiro_nome,
        "sobrenome": sobrenome,
        "cpf": cpf,
        "board": {"board_code": "CRM", "board_number": crm, "board_state": uf},
    }}}
    try:
        criado = await _request("POST", "sinapse-prescricao/usuarios", json_body=body)
        return _extrair_token(criado)
    except Exception as e:
        # CPF já cadastrado sob OUTRO external_id (mesmo médico) → recupera pelo id
        # externo informado no erro e devolve o token existente.
        m = re.search(r"[Ii]d externo \(([^)]+)\)", str(e))
        if m:
            try:
                existente = await _request("GET", f"sinapse-prescricao/usuarios/{m.group(1)}")
                token = _extrair_token(existente)
                if token:
                    return token
            except Exception:
                pass
        raise


def _extrair_token(payload: dict) -> str | None:
    data = payload.get("data", payload)
    attrs = data.get("attributes", {}) if isinstance(data, dict) else {}
    return attrs.get("token") or (data.get("token") if isinstance(data, dict) else None)

async def buscar_principios_ativos(termo: str, limit: int = 10):
    params = {'terms': termo, 'limit': limit, 'order[field]': 'name', 'order[sort]': 'ASC'}
    payload = await _request("GET", "drugs/ingredients", params=params)
    return payload.get("data", [])
