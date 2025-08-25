from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from crud import crear_usuario, obtener_usuario_por_correo, login_usuario
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

# Configurar CORS
origins = [
    "http://localhost:3000",  # React
    # Si quieres permitir cualquier origen, usa "*"
    # "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Crear tablas automáticamente si no existen
Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    return {"message": "Hola mundo"}

class UsuarioCreate(BaseModel):
    nombre: str
    correo: str
    contrasena: str
    nacimiento: Optional[str] = None

@app.post("/usuarios/")
def registro_usuario(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    existente = obtener_usuario_por_correo(db, usuario.correo)
    if existente:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    nuevo_usuario = crear_usuario(
        db,
        nombre=usuario.nombre,
        correo=usuario.correo,
        contrasena=usuario.contrasena,
        nacimiento=usuario.nacimiento
    )
    
    return {
        "id": nuevo_usuario.id,
        "nombre": nuevo_usuario.nombre,
        "correo": nuevo_usuario.correo,
        "tipo": nuevo_usuario.tipo.name,
        "nacimiento": str(nuevo_usuario.nacimiento) if nuevo_usuario.nacimiento else None
    }


# Schema para login
class UsuarioLogin(BaseModel):
    correo: str
    contrasena: str

# Endpoint de login
@app.post("/login/")
def login(usuario: UsuarioLogin, db: Session = Depends(get_db)):
    db_usuario = login_usuario(db, usuario.correo, usuario.contrasena)
    if not db_usuario:
        raise HTTPException(status_code=400, detail="Correo o contraseña incorrectos")
    
    return {
        "id": db_usuario.id,
        "nombre": db_usuario.nombre,
        "correo": db_usuario.correo,
        "tipo": db_usuario.tipo.name,
        "nacimiento": str(db_usuario.nacimiento) if db_usuario.nacimiento else None
    }