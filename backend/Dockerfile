# Backend FastAPI — imagem de produção (gunicorn + uvicorn workers)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Aplica as migrations do Alembic, semeia os módulos e sobe o gunicorn.
# O schema é versionado (alembic upgrade head) — nada de create_all em produção.
# Usa a porta injetada pelo host ($PORT no Railway/Heroku); cai para 8000 local.
# Escale com: docker compose up --scale backend=3
CMD ["sh", "-c", "alembic upgrade head && python -m app.init_db seed && exec gunicorn main:app -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:${PORT:-8000} --timeout 120"]
