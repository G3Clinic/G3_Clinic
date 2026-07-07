from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import os
import shutil
import uuid
from typing import List

from app.database import engine, Base, get_db
from app import models, schemas
from app.services import memed, cid

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Bem vindo à API da Clínica"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"url": f"http://localhost:8000/uploads/{filename}"}

# --- Memed Routes ---
@app.get("/api/memed/token")
async def get_memed_token():
    try:
        token = await memed.obter_token(
            medico_cpf="12345678909", 
            medico_nome="Dr. Teste", 
            medico_crm="12345", 
            medico_uf="SP"
        )
        return {"token": token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/memed/medicamentos")
async def search_medicamentos(q: str = ""):
    try:
        data = await memed.buscar_principios_ativos(q)
        return {"data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- CID Routes ---
@app.get("/api/cid/search")
async def search_cid(q: str = ""):
    data = await cid.buscar_cid(q)
    return {"data": data}

# --- Pacientes Routes ---
@app.post("/api/pacientes", response_model=schemas.PacienteResponse)
def create_paciente(paciente: schemas.PacienteCreate, db: Session = Depends(get_db)):
    db_paciente = models.Paciente(**paciente.model_dump())
    db.add(db_paciente)
    db.commit()
    db.refresh(db_paciente)
    return db_paciente

@app.get("/api/pacientes", response_model=List[schemas.PacienteResponse])
def get_pacientes(db: Session = Depends(get_db)):
    return db.query(models.Paciente).all()

# --- Consultas Routes ---
@app.post("/api/consultas", response_model=schemas.ConsultaResponse)
def create_consulta(consulta: schemas.ConsultaCreate, db: Session = Depends(get_db)):
    db_consulta = models.Consulta(**consulta.model_dump())
    db.add(db_consulta)
    db.commit()
    db.refresh(db_consulta)
    return db_consulta

@app.get("/api/pacientes/{paciente_id}/consultas", response_model=List[schemas.ConsultaResponse])
def get_consultas(paciente_id: int, db: Session = Depends(get_db)):
    return db.query(models.Consulta).filter(models.Consulta.paciente_id == paciente_id).all()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
