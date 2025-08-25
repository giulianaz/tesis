# database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Cambia estos datos por tu usuario, contraseña y nombre de base de datos
DB_USER = "root"
DB_PASSWORD = "Crayones1"
DB_HOST = "localhost"
DB_NAME = "tesis"

# URL de conexión
DATABASE_URL = f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"

# Crear engine
engine = create_engine(DATABASE_URL, echo=True)  # echo=True muestra los queries en consola

# Crear sesión
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para modelos
Base = declarative_base()

# Función para obtener sesión
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
