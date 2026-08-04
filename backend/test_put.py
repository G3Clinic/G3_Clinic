import asyncio
import sys
from app.services import memed

async def test_update():
    try:
        res = await memed._request("PUT", "sinapse-prescricao/usuarios/TEST-ID-123", json_body={"data": {"type": "usuarios", "attributes": {"cpf": "12345678909"}}})
        print("PUT result:", res)
    except Exception as e:
        print("PUT error:", str(e))

if __name__ == "__main__":
    asyncio.run(test_update())
