import json
import os

# Caminho para o banco JSON completo gerado
JSON_PATH = os.path.join(os.path.dirname(__file__), "cid10_full.json")

# Cache em memória para os 71.704 CIDs
_CIDS_CACHE = []

def carregar_cids():
    global _CIDS_CACHE
    if not _CIDS_CACHE:
        if os.path.exists(JSON_PATH):
            with open(JSON_PATH, "r", encoding="utf-8") as f:
                _CIDS_CACHE = json.load(f)
        else:
            _CIDS_CACHE = []

async def buscar_cid(termo: str):
    if not termo or len(termo) < 2:
        return []
    
    carregar_cids()
    termo_lower = termo.strip().lower()
    
    resultados = [
        cid for cid in _CIDS_CACHE
        if termo_lower in cid["codigo"].lower() or termo_lower in cid["descricao"].lower()
    ]
    
    # Retorna os 15 primeiros para não sobrecarregar a UI
    return resultados[:15]
