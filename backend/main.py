from fastapi import FastAPI
from database import engine, Base

app = FastAPI()

# Si quieres crear tablas automáticamente:
# Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    return {"message": "Hola mundo"}