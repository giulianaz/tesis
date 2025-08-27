from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from database import Base
import enum
import datetime

# Enum para tipo de usuario
class TipoUsuario(enum.Enum):
    alumno = 1
    admin = 2

# Enum para estados de progreso
class EstadoProgreso(enum.Enum):
    en_curso = "en_curso"
    aprobado = "aprobado"
    bloqueado = "bloqueado"

# Tabla usuario
class Usuario(Base):
    __tablename__ = "usuario"
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    nacimiento = Column(DateTime, nullable=True)
    correo = Column(String(150), unique=True, nullable=False)
    contrasena = Column(String(255), nullable=False)
    tipo = Column(Enum(TipoUsuario), nullable=False)

    cursos = relationship("Curso", back_populates="usuario", cascade="all, delete-orphan")
    progresos = relationship("Progreso", back_populates="usuario", cascade="all, delete-orphan")
    intentos = relationship("IntentoEvaluacion", back_populates="usuario", cascade="all, delete-orphan")

# Tabla curso
class Curso(Base):
    __tablename__ = "curso"
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)

    usuario = relationship("Usuario", back_populates="cursos")
    unidades = relationship("Unidad", back_populates="curso", cascade="all, delete-orphan")

# Tabla unidad
class Unidad(Base):
    __tablename__ = "unidad"
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    id_curso = Column(Integer, ForeignKey("curso.id", ondelete="CASCADE"), nullable=False)
    assistant_id = Column(String(255), nullable=True)
    vector_id = Column(String(255), nullable=True)

    curso = relationship("Curso", back_populates="unidades")
    corpus = relationship("Corpus", back_populates="unidad", cascade="all, delete-orphan")
    evaluaciones = relationship("Evaluacion", back_populates="unidad", cascade="all, delete-orphan")
    progresos = relationship("Progreso", back_populates="unidad", cascade="all, delete-orphan")

# Tabla corpus
class Corpus(Base):
    __tablename__ = "corpus"
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    material = Column(Text, nullable=False)
    id_unidad = Column(Integer, ForeignKey("unidad.id", ondelete="CASCADE"), nullable=False)

    unidad = relationship("Unidad", back_populates="corpus")

# Tabla evaluacion
class Evaluacion(Base):
    __tablename__ = "evaluacion"
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=True)
    preguntas_alternativas = Column(Integer)
    preguntas_desarrollo = Column(Integer)
    preguntas_vf = Column(Integer)
    puntaje_total = Column(Integer)
    nivel = Column(Integer, nullable=True)  # o Enum si prefieres categorías fijas
    id_unidad = Column(Integer, ForeignKey("unidad.id", ondelete="CASCADE"), nullable=False)

    unidad = relationship("Unidad", back_populates="evaluaciones")
    alternativas = relationship("Alternativa", back_populates="evaluacion", cascade="all, delete-orphan")
    verdaderofalsos = relationship("VF", back_populates="evaluacion", cascade="all, delete-orphan")
    desarrollos = relationship("Desarrollo", back_populates="evaluacion", cascade="all, delete-orphan")
    intentos = relationship("IntentoEvaluacion", back_populates="evaluacion", cascade="all, delete-orphan")

# Tabla preguntas alternativas
class Alternativa(Base):
    __tablename__ = "alternativas"
    id = Column(Integer, primary_key=True, autoincrement=True)
    enunciado = Column(Text, nullable=False)
    respuesta_a = Column(Text)
    respuesta_b = Column(Text)
    respuesta_c = Column(Text)
    respuesta_d = Column(Text)
    correcta = Column(String(1))
    puntaje = Column(Integer)
    nivel_bloom = Column(Integer)
    id_evaluacion = Column(Integer, ForeignKey("evaluacion.id", ondelete="CASCADE"), nullable=False)

    evaluacion = relationship("Evaluacion", back_populates="alternativas")

# Tabla preguntas verdadero/falso
class VF(Base):
    __tablename__ = "vf"
    id = Column(Integer, primary_key=True, autoincrement=True)
    enunciado = Column(Text, nullable=False)
    correcta = Column(String(5))
    puntaje = Column(Integer)
    nivel_bloom = Column(Integer)
    id_evaluacion = Column(Integer, ForeignKey("evaluacion.id", ondelete="CASCADE"), nullable=False)

    evaluacion = relationship("Evaluacion", back_populates="verdaderofalsos")

# Tabla preguntas desarrollo
class Desarrollo(Base):
    __tablename__ = "desarrollo"
    id = Column(Integer, primary_key=True, autoincrement=True)
    enunciado = Column(Text, nullable=False)
    respuesta = Column(Text, nullable=True)
    puntaje = Column(Integer)
    nivel_bloom = Column(Integer)
    id_evaluacion = Column(Integer, ForeignKey("evaluacion.id", ondelete="CASCADE"), nullable=False)

    evaluacion = relationship("Evaluacion", back_populates="desarrollos")

# Tabla progreso
class Progreso(Base):
    __tablename__ = "progreso"
    id = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    id_unidad = Column(Integer, ForeignKey("unidad.id", ondelete="CASCADE"), nullable=False)
    nivel_actual = Column(Integer, nullable=False, default=1)
    puntaje_max = Column(Integer, nullable=True)
    estado = Column(Enum(EstadoProgreso), default=EstadoProgreso.en_curso)
    fecha_ultimo_intento = Column(DateTime, default=datetime.datetime.utcnow)

    usuario = relationship("Usuario", back_populates="progresos")
    unidad = relationship("Unidad", back_populates="progresos")

# Tabla historial de intentos
class IntentoEvaluacion(Base):
    __tablename__ = "intento_evaluacion"
    id = Column(Integer, primary_key=True, autoincrement=True)
    id_evaluacion = Column(Integer, ForeignKey("evaluacion.id", ondelete="CASCADE"), nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    puntaje_obtenido = Column(Integer, nullable=False)
    nivel_al_momento = Column(Integer, nullable=False)
    fecha = Column(DateTime, default=datetime.datetime.utcnow)
    retroalimentacion = Column(Text)

    evaluacion = relationship("Evaluacion", back_populates="intentos")
    usuario = relationship("Usuario", back_populates="intentos")

class Respuesta(Base):
    __tablename__ = "respuesta"
    id = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    id_evaluacion = Column(Integer, ForeignKey("evaluacion.id", ondelete="CASCADE"), nullable=False)
    tipo_pregunta = Column(Enum("vf", "alternativa", "desarrollo", name="tipo_pregunta"), nullable=False)
    id_pregunta = Column(Integer, nullable=False)  # ID de la pregunta, se valida según tipo_pregunta
    respuesta_texto = Column(Text, nullable=True)  # Respuesta escrita (para desarrollo) o vacío en otras
    correcta = Column(Integer, nullable=True)  # Opcional: para almacenar si fue correcta o puntaje obtenido
    fecha = Column(DateTime, default=datetime.datetime.utcnow)

    usuario = relationship("Usuario")
    evaluacion = relationship("Evaluacion")


# Crear tablas solo si ejecutas este archivo directamente
if __name__ == "__main__":
    from database import engine, Base
    Base.metadata.create_all(bind=engine)
    print("Tablas creadas correctamente si no existían.")
