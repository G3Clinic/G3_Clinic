import asyncio
import httpx

async def test_keys():
    api_key = "1fb0705478a561a08dda8b91f757108b9ff3654ecd03deba32f46007b4c7c08d"
    secret_key = "618ce93b7fca4e62fd10034ba06304110f018c363711b986a49a73c5ee9ccbf7"
    url = "https://api.memed.com.br/v1/sinapse-prescricao/usuarios/fake-id"
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, params={"api-key": api_key, "secret-key": secret_key}, headers={"Accept": "application/vnd.api+json"})
            print("Status:", res.status_code)
            if res.status_code in [401, 403]:
                print("KEYS REJECTED!")
            else:
                print("KEYS ACCEPTED! (It returned something else like 404 which means the route exists and auth passed)")
    except Exception as e:
        print("Error:", str(e))

if __name__ == "__main__":
    asyncio.run(test_keys())
