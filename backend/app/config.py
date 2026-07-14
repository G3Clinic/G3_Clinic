"""
Configuração central do backend (lida de variáveis de ambiente).

Em Docker, DATABASE_URL aponta para o Postgres do compose. Sem DATABASE_URL
(ex.: rodando `python main.py` solto no dev), cai para SQLite local — assim
o desenvolvimento simples continua funcionando sem subir o Postgres.
"""
import os


class Settings:
    # Banco: Postgres em produção/Docker; SQLite como fallback de dev.
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./clinica.sqlite3",
    )

    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "troque-em-producao-por-um-segredo-forte")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "720"))  # 12h

    # CORS (origens do frontend, separadas por vírgula)
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")

    PUBLIC_URL: str = os.getenv("PUBLIC_URL", "http://localhost:8000")


settings = Settings()
