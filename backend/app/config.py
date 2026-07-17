"""
Configuração central do backend (lida de variáveis de ambiente).

Em Docker, DATABASE_URL aponta para o Postgres do compose. Sem DATABASE_URL
(ex.: rodando `python main.py` solto no dev), cai para SQLite local — assim
o desenvolvimento simples continua funcionando sem subir o Postgres.
"""
import os


def _normalizar_db_url(url: str) -> str:
    """Compatibiliza a URL do Postgres com o SQLAlchemy 2.x + psycopg2.

    Railway/Heroku às vezes entregam `postgres://` (esquema legado, rejeitado
    pelo SQLAlchemy 2.x) ou `postgresql://` sem driver. Forçamos `postgresql+psycopg2://`.
    """
    if url.startswith("postgres://"):
        url = "postgresql+psycopg2://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


class Settings:
    # Banco: Postgres em produção/Docker; SQLite como fallback de dev.
    DATABASE_URL: str = _normalizar_db_url(os.getenv(
        "DATABASE_URL",
        "sqlite:///./clinica.sqlite3",
    ))

    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "troque-em-producao-por-um-segredo-forte")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "720"))  # 12h

    # CORS (origens do frontend, separadas por vírgula). O default já inclui os
    # domínios de produção; a env var CORS_ORIGINS (Railway) sobrescreve se definida.
    CORS_ORIGINS: list[str] = [
        o.strip() for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,"
            "https://g3-clinic.vercel.app,"
            "https://g3clinic.com.br,https://www.g3clinic.com.br",
        ).split(",") if o.strip()
    ]

    PUBLIC_URL: str = os.getenv("PUBLIC_URL", "http://localhost:8000")


settings = Settings()
