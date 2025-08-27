from fastapi import FastAPI, Depends, HTTPException, Path
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from crud import crear_usuario, obtener_usuario_por_correo, login_usuario
from typing import Optional
from models import Curso, Unidad, Usuario
from typing import List
from sqlalchemy import select
from pydantic import EmailStr, BaseModel, EmailStr, Field
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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

# Schema para crear curso
class CursoCreate(BaseModel):
    nombre: str
    id_usuario: int

@app.post("/cursos/")
def crear_curso(curso: CursoCreate, db: Session = Depends(get_db)):
    if not curso.nombre:
        raise HTTPException(status_code=400, detail="El nombre del curso es obligatorio")
    
    # Crear el objeto Curso
    nuevo_curso = Curso(nombre=curso.nombre, id_usuario=curso.id_usuario)
    db.add(nuevo_curso)
    db.commit()
    db.refresh(nuevo_curso)  # esto carga el id generado automáticamente

    # Crear automáticamente Unidad 1
    unidad_inicial = Unidad(
        nombre="Unidad 1",
        id_curso=nuevo_curso.id,
        assistant_id="",
        vector_id=""
    )
    db.add(unidad_inicial)
    db.commit()
    db.refresh(unidad_inicial)

    return {
        "id": nuevo_curso.id,
        "nombre": nuevo_curso.nombre,
        "id_usuario": nuevo_curso.id_usuario,
        "unidad_inicial": {
            "id": unidad_inicial.id,
            "nombre": unidad_inicial.nombre,
            "assistant_id": unidad_inicial.assistant_id,
            "vector_id": unidad_inicial.vector_id
        }
    }

class CursoOut(BaseModel):
    id: int
    nombre: str

    class Config:
        orm_mode = True

@app.get("/cursos/{id_usuario}", response_model=List[CursoOut])
def obtener_cursos(id_usuario: int, db: Session = Depends(get_db)):
    return db.query(Curso.id, Curso.nombre).filter(Curso.id_usuario == id_usuario).all()

@app.delete("/cursos/{curso_id}")
def borrar_curso(curso_id: int, db: Session = Depends(get_db)):
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    db.delete(curso)
    db.commit()
    return {"detail": f"Curso '{curso.nombre}' eliminado"}

# Schema para actualizar curso
class CursoUpdate(BaseModel):
    nombre: str

@app.put("/cursos/{id}")
def actualizar_curso(id: int, curso: CursoUpdate, db: Session = Depends(get_db)):
    db_curso = db.query(Curso).filter(Curso.id == id).first()
    if not db_curso:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    db_curso.nombre = curso.nombre
    db.commit()
    db.refresh(db_curso)
    return {"id": db_curso.id, "nombre": db_curso.nombre}

class UnidadOut(BaseModel):
    id: int
    nombre: str
    assistant_id: Optional[str]
    vector_id: Optional[str]

    class Config:
        orm_mode = True

# Schema para el curso
class CursoDetail(BaseModel):
    id: int
    nombre: str
    id_usuario: int
    unidades: List[UnidadOut] = []

class CursoConUnidades(BaseModel):
    id: int
    nombre: str
    unidades: List[UnidadOut]

    class Config:
        orm_mode = True



@app.get("/curso/{curso_id}", response_model=CursoDetail)
def obtener_curso(curso_id: int, usuario_id: int = None, db: Session = Depends(get_db)):
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    if usuario_id is None or curso.id_usuario != usuario_id:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver este curso")

    return curso

class UnidadCreate(BaseModel):
    nombre: str
    id_curso: int
    assistant_id: Optional[str] = None
    vector_id: Optional[str] = None

class UnidadUpdate(BaseModel):
    nombre: Optional[str] = None
    assistant_id: Optional[str] = None
    vector_id: Optional[str] = None

class UnidadOut(BaseModel):
    id: int
    nombre: str
    id_curso: int
    assistant_id: Optional[str]
    vector_id: Optional[str]

    class Config:
        orm_mode = True

# -------------------------------
# Crear unidad
# -------------------------------
@app.post("/unidades/", response_model=UnidadOut)
def crear_unidad(unidad: UnidadCreate, db: Session = Depends(get_db)):
    # Verificar que el curso exista
    curso = db.query(Curso).filter(Curso.id == unidad.id_curso).first()
    if not curso:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    nueva_unidad = Unidad(
        nombre=unidad.nombre,
        id_curso=unidad.id_curso,
        assistant_id=unidad.assistant_id or "",
        vector_id=unidad.vector_id or ""
    )
    db.add(nueva_unidad)
    db.commit()
    db.refresh(nueva_unidad)
    return nueva_unidad

# -------------------------------
# Editar unidad
# -------------------------------
@app.put("/unidades/{unidad_id}", response_model=UnidadOut)
def editar_unidad(unidad_id: int, unidad: UnidadUpdate, db: Session = Depends(get_db)):
    db_unidad = db.query(Unidad).filter(Unidad.id == unidad_id).first()
    if not db_unidad:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")

    if unidad.nombre is not None:
        db_unidad.nombre = unidad.nombre
    if unidad.assistant_id is not None:
        db_unidad.assistant_id = unidad.assistant_id
    if unidad.vector_id is not None:
        db_unidad.vector_id = unidad.vector_id

    db.commit()
    db.refresh(db_unidad)
    return db_unidad

# -------------------------------
# Borrar unidad
# -------------------------------
@app.delete("/unidades/{unidad_id}")
def borrar_unidad(unidad_id: int, db: Session = Depends(get_db)):
    db_unidad = db.query(Unidad).filter(Unidad.id == unidad_id).first()
    if not db_unidad:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")

    db.delete(db_unidad)
    db.commit()
    return {"detail": f"Unidad '{db_unidad.nombre}' eliminada"}

@app.get("/perfil/{usuario_id}")
def ver_perfil(usuario_id: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Formatear la fecha solo como YYYY-MM-DD
    nacimiento_formateado = usuario.nacimiento.strftime("%Y-%m-%d") if usuario.nacimiento else None
    
    return {
        "id": usuario.id,
        "nombre": usuario.nombre,
        "correo": usuario.correo,
        "nacimiento": nacimiento_formateado
    }


class PerfilUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None)
    correo: Optional[EmailStr] = Field(default=None)
    contrasena: Optional[str] = Field(default=None)
    nacimiento: Optional[str] = Field(default=None)

@app.put("/perfil/{usuario_id}")
def editar_perfil(usuario_id: int, datos: PerfilUpdate, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if datos.correo and datos.correo != usuario.correo:
        existente = db.query(Usuario).filter(Usuario.correo == datos.correo).first()
        if existente:
            raise HTTPException(status_code=400, detail="El correo ya está registrado")
        usuario.correo = datos.correo

    if datos.nombre:
        usuario.nombre = datos.nombre

    # Hashear la contraseña antes de guardar
    if datos.contrasena:
        usuario.contrasena = pwd_context.hash(datos.contrasena)

    if datos.nacimiento:
        usuario.nacimiento = datos.nacimiento

    db.commit()
    db.refresh(usuario)

    return {
        "id": usuario.id,
        "nombre": usuario.nombre,
        "correo": usuario.correo,
        "nacimiento": usuario.nacimiento.strftime("%Y-%m-%d") if usuario.nacimiento else None
    }

@app.delete("/perfil/{usuario_id}")
def eliminar_perfil(usuario_id: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    db.delete(usuario)
    db.commit()
    return {"detail": f"Usuario '{usuario.nombre}' eliminado correctamente"}
