from fastapi import FastAPI, Depends, HTTPException, Path, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from crud import crear_usuario, obtener_usuario_por_correo, login_usuario
from typing import Optional
from models import Curso, Unidad, Usuario, Evaluacion, Alternativa, VF, Desarrollo, IntentoEvaluacion, Corpus
from typing import List
from sqlalchemy import select
from pydantic import EmailStr, BaseModel, EmailStr, Field
from passlib.context import CryptContext
from datetime import datetime
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from API.API import crear_assistant, crear_vector, subir_archivo, generar_preguntas, borrar_assistant, borrar_vector, subir_archivo_a_vector, borrar_archivo

from API.API import client, instrucciones, modelo

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
async def crear_curso(curso: CursoCreate, db: Session = Depends(get_db)):
    if not curso.nombre:
        raise HTTPException(status_code=400, detail="El nombre del curso es obligatorio")
    
    # 1) Crear Assistant
    assistant_id = await crear_assistant(f"Asistente Unidad 1 de {curso.nombre}")

    # 2) Crear Vector store
    vector_id = await crear_vector(assistant_id)

    # 3) Crear el curso en la DB
    nuevo_curso = Curso(nombre=curso.nombre, id_usuario=curso.id_usuario)
    db.add(nuevo_curso)
    db.commit()
    db.refresh(nuevo_curso)

    # 4) Crear Unidad inicial
    unidad_inicial = Unidad(
        nombre="Unidad 1",
        id_curso=nuevo_curso.id,
        assistant_id=assistant_id,
        vector_id=vector_id
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
async def borrar_curso(curso_id: int, db: Session = Depends(get_db)):
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    # Borrar assistants y vectores de cada unidad asociada
    for unidad in curso.unidades:
        if unidad.assistant_id:
            try:
                await borrar_assistant(unidad.assistant_id)
            except HTTPException as e:
                # Puedes loguearlo y continuar
                print(f"No se pudo borrar assistant {unidad.assistant_id}: {e.detail}")
        if unidad.vector_id:
            try:
                await borrar_vector(unidad.vector_id)
            except HTTPException as e:
                print(f"No se pudo borrar vector {unidad.vector_id}: {e.detail}")
    
    # Borrar curso (las unidades se eliminan por cascada si la relación está configurada)
    db.delete(curso)
    db.commit()
    
    return {"detail": f"Curso '{curso.nombre}' eliminado junto con sus unidades, assistants y vectores"}

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
async def crear_unidad(unidad: UnidadCreate, db: Session = Depends(get_db)):
    # Verificar que el curso exista
    curso = db.query(Curso).filter(Curso.id == unidad.id_curso).first()
    if not curso:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    # 1) Crear Assistant
    assistant_id = await crear_assistant(f"Asistente de {unidad.nombre}")
    
    # 2) Crear Vector
    vector_id = await crear_vector(assistant_id)

    # 3) Crear la unidad en la base de datos con los IDs generados
    nueva_unidad = Unidad(
        nombre=unidad.nombre,
        id_curso=unidad.id_curso,
        assistant_id=assistant_id,
        vector_id=vector_id
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
async def borrar_unidad(unidad_id: int, db: Session = Depends(get_db)):
    db_unidad = db.query(Unidad).filter(Unidad.id == unidad_id).first()
    if not db_unidad:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")
    
    # 1) Borrar Assistant
    if db_unidad.assistant_id:
        await borrar_assistant(db_unidad.assistant_id)
    
    # 2) Borrar Vector
    if db_unidad.vector_id:
        await borrar_vector(db_unidad.vector_id)
    
    # 3) Borrar la unidad de la base de datos
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

class EvaluacionOut(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str]
    nivel: Optional[int]

    class Config:
        orm_mode = True

@app.get("/evaluaciones/unidad/{unidad_id}", response_model=List[EvaluacionOut])
def obtener_evaluaciones_por_unidad(unidad_id: int, db: Session = Depends(get_db)):
    evaluaciones = db.query(Evaluacion).filter(Evaluacion.id_unidad == unidad_id).all()
    
    if not evaluaciones:
        raise HTTPException(status_code=404, detail="No se encontraron evaluaciones para esta unidad")
    
    return evaluaciones


# Modelo de salida
class IntentoEvaluacionOut(BaseModel):
    puntaje_obtenido: int
    fecha: Optional[datetime] = None  # ✅ ahora permite null
    retroalimentacion: Optional[str]

    class Config:
        orm_mode = True

@app.get("/intento_evaluacion/{id_evaluacion}", response_model=IntentoEvaluacionOut)
def obtener_intento_por_evaluacion(id_evaluacion: int, db: Session = Depends(get_db)):
    intento = db.query(IntentoEvaluacion).filter(IntentoEvaluacion.id_evaluacion == id_evaluacion).first()
    
    if not intento:
        raise HTTPException(status_code=404, detail="No existe intento para esta evaluación")
    
    return intento

# Schemas de salida
class PreguntaAlternativaOut(BaseModel):
    id: int
    enunciado: str
    opciones: dict

    class Config:
        orm_mode = True

class PreguntaVFOut(BaseModel):
    id: int
    enunciado: str

    class Config:
        orm_mode = True

class PreguntaDesarrolloOut(BaseModel):
    id: int
    enunciado: str

    class Config:
        orm_mode = True

# Nuevo schema que incluye info de la evaluación
class PreguntasEvaluacionOut(BaseModel):
    id_evaluacion: int
    nombre: str
    descripcion: Optional[str] = None
    nivel: Optional[int] = None
    id_curso: Optional[int] = None      # <-- agregado
    preguntas_alternativas: List[PreguntaAlternativaOut] = []
    preguntas_vf: List[PreguntaVFOut] = []
    preguntas_desarrollo: List[PreguntaDesarrolloOut] = []

    class Config:
        orm_mode = True

@app.get("/preguntas/evaluacion/{id_evaluacion}", response_model=PreguntasEvaluacionOut)
def obtener_preguntas_por_evaluacion(id_evaluacion: int, db: Session = Depends(get_db)):
    evaluacion = db.query(Evaluacion).filter(Evaluacion.id == id_evaluacion).first()
    if not evaluacion:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")

    # Preguntas de alternativas
    alternativas = db.query(Alternativa).filter(Alternativa.id_evaluacion == id_evaluacion).all()
    preguntas_alternativas = [
        PreguntaAlternativaOut(
            id=a.id,
            enunciado=a.enunciado,
            opciones={
                "a": a.respuesta_a,
                "b": a.respuesta_b,
                "c": a.respuesta_c,
                "d": a.respuesta_d
            }
        )
        for a in alternativas
    ]

    # Preguntas verdadero/falso
    vfs = db.query(VF).filter(VF.id_evaluacion == id_evaluacion).all()
    preguntas_vf = [PreguntaVFOut(id=v.id, enunciado=v.enunciado) for v in vfs]

    # Preguntas desarrollo
    desarrollos = db.query(Desarrollo).filter(Desarrollo.id_evaluacion == id_evaluacion).all()
    preguntas_desarrollo = [PreguntaDesarrolloOut(id=d.id, enunciado=d.enunciado) for d in desarrollos]

    return PreguntasEvaluacionOut(
        id_evaluacion=id_evaluacion,
        nombre=evaluacion.nombre,
        descripcion=evaluacion.descripcion,
        nivel=evaluacion.nivel,
        id_curso=evaluacion.unidad.curso.id if evaluacion.unidad and evaluacion.unidad.curso else None,  # <-- agregado
        preguntas_alternativas=preguntas_alternativas,
        preguntas_vf=preguntas_vf,
        preguntas_desarrollo=preguntas_desarrollo
    )
class CorpusOut(BaseModel):
    id: int
    nombre: str
    material: str  # aquí va el file_id
    id_unidad: int
    class Config:
        orm_mode = True

class CorpusWithCurso(BaseModel):
    curso_id: int
    vector_id: Optional[str]  # <- agregar vector_id
    corpus: List[CorpusOut]

@app.get("/corpus/unidad/{unidad_id}", response_model=CorpusWithCurso)
def obtener_corpus_por_unidad(unidad_id: int, db: Session = Depends(get_db)):
    corpus = db.query(Corpus).filter(Corpus.id_unidad == unidad_id).all()
    if not corpus:
        raise HTTPException(status_code=404, detail="No hay corpus para esta unidad")

    unidad = db.query(Unidad).filter(Unidad.id == unidad_id).first()
    if not unidad:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")

    return {
        "curso_id": unidad.id_curso,
        "vector_id": unidad.vector_id,  # <- agregamos vector_id
        "corpus": corpus
    }


from fastapi import UploadFile, File

def save_file_to_db(db: Session, unidad_id: int, file_name: str, file_id: str):
    nuevo_corpus = Corpus(
        nombre=file_name,
        material=file_id,      # Usamos la columna `material` para guardar el id del archivo
        id_unidad=unidad_id    # Ojo: en tu modelo la columna se llama `id_unidad`
    )
    db.add(nuevo_corpus)
    db.commit()
    db.refresh(nuevo_corpus)
    return nuevo_corpus



@app.post("/corpus/unidad/{unidad_id}")
async def crear_corpus(unidad_id: int, archivo: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Recibe un archivo, lo sube a OpenAI, lo vincula al vector store de la unidad y guarda el file_id en la BDD.
    """
    from main import Unidad  # Importa tu modelo de Unidad
    unidad = db.query(Unidad).filter(Unidad.id == unidad_id).first()
    if not unidad:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")

    if not unidad.vector_id:
        raise HTTPException(status_code=400, detail="La unidad no tiene vector asociado")

    # Subir archivo y asociarlo
    file_id = await subir_archivo_a_vector(unidad.vector_id, archivo)

    # Guardar en la base de datos
    save_file_to_db(db, unidad_id=unidad_id, file_name=archivo.filename, file_id=file_id)

    return {"message": "Archivo subido correctamente", "file_id": file_id}

@app.delete("/corpus/{corpus_id}")
async def eliminar_corpus(
    corpus_id: int,
    file_id: str = Query(..., description="ID del archivo en la API"),
    vector_id: str = Query(..., description="ID del vector store"),
    db: Session = Depends(get_db)
):
    # 1️⃣ Buscar el registro en la DB
    corpus = db.query(Corpus).filter(Corpus.id == corpus_id).first()
    if not corpus:
        raise HTTPException(status_code=404, detail="Archivo no encontrado en la base de datos")

    errores = {}

    # 2️⃣ Borrar archivos de la API y del vector store
    try:
        resultado = await borrar_archivo(file_id=file_id, vector_id=vector_id)
        if 'errores' in resultado:
            errores = resultado['errores']
    except Exception as e:
        errores['borrar_archivo'] = str(e)

    # 3️⃣ Borrar el registro de la DB aunque haya errores en la API/vector
    try:
        db.delete(corpus)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo eliminar de la base de datos: {e}")

    # 4️⃣ Retornar resultado final
    if errores:
        return {
            "detail": f"Archivo '{corpus.nombre}' eliminado de la base de datos, pero hubo errores al borrar API/vector.",
            "errores": errores
        }

    return {"detail": f"Archivo '{corpus.nombre}' eliminado correctamente de API, vector y base de datos"}