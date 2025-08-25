from sqlalchemy.orm import Session
from models import Usuario, TipoUsuario
from passlib.context import CryptContext
import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def crear_usuario(db: Session, nombre: str, correo: str, contrasena: str, nacimiento: str = None):
    hashed_password = pwd_context.hash(contrasena)
    
    fecha_nac = None
    if nacimiento:
        # Convertir string 'YYYY-MM-DD' a datetime
        fecha_nac = datetime.datetime.strptime(nacimiento, "%Y-%m-%d")

    usuario = Usuario(
        nombre=nombre,
        correo=correo,
        contrasena=hashed_password,
        tipo=TipoUsuario.alumno,  # Siempre tipo 1 (alumno)
        nacimiento=fecha_nac
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario

def obtener_usuario_por_correo(db: Session, correo: str):
    return db.query(Usuario).filter(Usuario.correo == correo).first()

# Verificar contraseña
def verificar_contrasena(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Función para login (opcional si quieres separar lógica)
def login_usuario(db: Session, correo: str, contrasena: str):
    usuario = obtener_usuario_por_correo(db, correo)
    if not usuario:
        return None
    if not verificar_contrasena(contrasena, usuario.contrasena):
        return None
    return usuario