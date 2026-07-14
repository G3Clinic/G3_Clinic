"""
Inicialização do banco.

Em produção/Docker o **schema é gerenciado pelo Alembic** (`alembic upgrade head`
no entrypoint). Aqui ficam apenas:
  - seed()  → semeia os módulos padrão (idempotente); roda sempre.
  - init()  → create_all + auto-migração + seed. Usado APENAS no dev com SQLite
              (quando se roda `python main.py` sem Docker/Postgres/Alembic).
"""
import sys
import time

from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError, OperationalError

from .database import engine, Base, SessionLocal
# importa os modelos para registrá-los em Base.metadata
from . import models, clinica_models, tenant_models  # noqa: F401


def sincronizar_colunas() -> None:
    """Auto-migração aditiva (apenas dev/SQLite). Adiciona colunas de modelo
    que faltem no banco. Em produção isso é papel do Alembic."""
    insp = inspect(engine)
    tabelas_db = set(insp.get_table_names())
    with engine.begin() as conn:
        for tabela in Base.metadata.sorted_tables:
            if tabela.name not in tabelas_db:
                continue
            cols = {c["name"] for c in insp.get_columns(tabela.name)}
            for col in tabela.columns:
                if col.name in cols:
                    continue
                tipo_sql = col.type.compile(dialect=engine.dialect)
                conn.execute(text(f'ALTER TABLE {tabela.name} ADD COLUMN "{col.name}" {tipo_sql}'))
                print(f"[auto-migração] +coluna {tabela.name}.{col.name} ({tipo_sql})")


def seed(retries: int = 10, delay: float = 1.5) -> None:
    """Semeia os módulos padrão (idempotente). Espera o banco subir."""
    for tentativa in range(1, retries + 1):
        try:
            db = SessionLocal()
            try:
                existentes = {m.chave for m in db.query(tenant_models.Modulo).all()}
                novos = [
                    tenant_models.Modulo(chave=chave, nome=nome)
                    for chave, nome in tenant_models.MODULOS_PADRAO
                    if chave not in existentes
                ]
                if novos:
                    db.add_all(novos)
                    db.commit()
            except IntegrityError:
                db.rollback()
            finally:
                db.close()
            return
        except OperationalError:
            if tentativa == retries:
                raise
            time.sleep(delay)


def init() -> None:
    """Dev/SQLite: cria o schema por create_all + auto-migração, depois semeia."""
    Base.metadata.create_all(bind=engine)
    sincronizar_colunas()
    seed()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "seed":
        seed()
        print("init_db: módulos semeados.")
    else:
        init()
        print("init_db: schema criado e módulos semeados.")
