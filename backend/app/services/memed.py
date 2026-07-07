import os
import httpx
from dotenv import load_dotenv

load_dotenv()

MEMED_API_KEY = os.getenv("MEMED_API_KEY", "iJGiB4kjDGOLeDFPWMG3no9VnN7Abpqe3w1jEFm6olkhkZD6oSfSmYCm")
MEMED_SECRET_KEY = os.getenv("MEMED_SECRET_KEY", "Xe8M5GvBGCr4FStKfxXKisRo3SfYKI7KrTMkJpCAstzu2yXVN4av5nmL")
MEMED_BASE_URL = os.getenv("MEMED_BASE_URL", "https://integrations.api.memed.com.br/v1")

HEADERS = {'Accept': 'application/vnd.api+json', 'Content-Type': 'application/json'}

async def _request(method: str, path: str, params: dict = None, json_body: dict = None):
    if not MEMED_API_KEY or not MEMED_SECRET_KEY:
        raise Exception("Integração Memed não configurada. Defina MEMED_API_KEY e MEMED_SECRET_KEY no .env.")

    url = f"{MEMED_BASE_URL.rstrip('/')}/{path.lstrip('/')}"
    params = params or {}
    params.update({"api-key": MEMED_API_KEY, "secret-key": MEMED_SECRET_KEY})
    
    async with httpx.AsyncClient() as client:
        response = await client.request(method, url, params=params, json=json_body, headers=HEADERS)
        response.raise_for_status()
        return response.json()

async def obter_token(medico_cpf: str, medico_nome: str, medico_crm: str, medico_uf: str):
    body = {
        "data": {
            "type": "usuarios",
            "attributes": {
                "external_id": medico_cpf,
                "nome": medico_nome,
                "sobrenome": "",
                "cpf": medico_cpf,
                "board": {
                    "board_code": "CRM",
                    "board_number": medico_crm,
                    "board_state": medico_uf
                }
            }
        }
    }
    
    payload = await _request("POST", "sinapse-prescricao/usuarios", json_body=body)
    data = payload.get("data", payload)
    attrs = data.get("attributes", {}) if isinstance(data, dict) else {}
    token = attrs.get("token") or data.get("token")
    return token

async def buscar_principios_ativos(termo: str, limit: int = 10):
    params = {'terms': termo, 'limit': limit, 'order[field]': 'name', 'order[sort]': 'ASC'}
    payload = await _request("GET", "drugs/ingredients", params=params)
    return payload.get("data", [])
