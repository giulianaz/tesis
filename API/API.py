from fastapi import FastAPI, File, UploadFile, HTTPException
from openai import OpenAI
import os
from dotenv import load_dotenv
import asyncio
import re
import time

# -----------------------
# Carga variables de entorno
# -----------------------
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

openai_key = os.getenv("OPENAI_API_KEY")
instrucciones = os.getenv("INSTRUCCIONES")
modelo = os.getenv("MODELO")
proposito = os.getenv("PROPOSITO")

# -----------------------
# Cliente OpenAI
# -----------------------
client = OpenAI(api_key=openai_key)

# -----------------------
# FastAPI app
# -----------------------
app = FastAPI()

# -----------------------
# Funciones reutilizables
# -----------------------

# Asistente
async def crear_assistant(name: str):
    assistant = client.beta.assistants.create(
        name=name,
        instructions=instrucciones,
        model=modelo,
        tools=[{"type": "code_interpreter"}, {"type": "file_search"}]
    )
    return assistant.id

async def actualizar_assistant(assistant_id: str, vector_id: str):
    assistant = client.beta.assistants.update(
        assistant_id=assistant_id,
        tool_resources={"file_search": {"vector_store_ids": [vector_id]}},
    )
    return assistant.id

async def borrar_assistant(assistant_id: str):
    try:
        respuesta = client.beta.assistants.delete(assistant_id)
        return respuesta
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete Assistant: {e}")

# API.py
async def crear_vector(assistant_id: str):
    """
    Crea un vector store y lo vincula con el assistant.
    """
    # Crear un vector store usando la API correcta
    vector_store = client.vector_stores.create(
        name=f"Vector {assistant_id}"
    )
    
    # Acceder al ID correctamente
    vector_id = vector_store.id

    # Actualizar el assistant con el vector_id
    await actualizar_assistant(assistant_id, vector_id)

    return vector_id






async def subir_archivo_a_vector(vector_id: str, archivo: UploadFile):
    file_bytes = await archivo.read()
    try:
        # 1. Crear archivo en OpenAI
        openai_file = client.files.create(
            file=(archivo.filename, file_bytes),
            purpose="assistants"
        )

        # 2. Asociar archivo al vector (nota: sin .beta)
        client.vector_stores.files.create(
            vector_store_id=vector_id,
            file_id=openai_file.id
        )

        return openai_file.id
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir archivo a OpenAI: {e}")






async def actualizar_vector(assistant_id: str, vector_id: str, file_id: str):
    try:
        # Asociar archivo con vector store
        client.vector_stores.add_files(
            id=vector_id,
            files=[file_id]
        )

        # Actualizar assistant para usar el vector store
        client.assistants.update(
            assistant_id=assistant_id,
            tool_resources={"file_search": {"vector_store_ids": [vector_id]}}
        )

        return file_id

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update Vector: {e}")




async def borrar_vector(vector_id: str):
    """
    Borra un vector store.
    """
    try:
        response = client.vector_stores.delete(vector_id)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete Vector: {e}")

async def subir_archivo(assistant_id: str, vector_id: str, archivo: UploadFile):
    """
    Sube un archivo al vector store existente y actualiza el assistant.
    Devuelve file_id y vector_store_id.
    """
    try:
        # Leer contenido del archivo
        contenido = await archivo.read()

        # 1️⃣ Crear archivo en la API
        respuesta = client.files.create(file=contenido, purpose="file.search")
        file_id = str(respuesta.id)

        # 2️⃣ Agregar el archivo al vector store existente
        client.vector_stores.add_files(
            id=vector_id,
            files=[file_id]
        )

        # 3️⃣ Actualizar el assistant para usar el vector
        client.beta.assistants.update(
            assistant_id=assistant_id,
            tool_resources={"file_search": {"vector_store_ids": [vector_id]}}
        )

        # Retornar ambos
        return file_id, vector_id

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {e}")


async def actualizar_archivo(assistant_id: str, vector_id: str, file_id: str, archivo: UploadFile):
    await borrar_archivo(file_id)
    file_id_nuevo = await subir_archivo(assistant_id, vector_id, archivo)
    return file_id_nuevo

async def borrar_archivo(file_id: str, vector_id: str):
    try:
        # 1️⃣ Borrar todos los vectores del vector store
        client.vectors.delete(vector_store_id=vector_id)

        # 2️⃣ Borrar el archivo de la API de OpenAI
        client.files.delete(file_id)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file/vector: {e}")




# Generación de preguntas
async def generar_preguntas(assistant_id: str, vf: str, desarrollo: str, alternativas: str, dificultad: str):
    prompt = f'''Generame preguntas segun su tipo que seran indicadas a continuacion. Las preguntas deben basarse exclusivamente en la información contenida en los archivos proporcionados en el vector_store, pero sin mencionar los nombres de los documentos. Cada pregunta debe abordar un concepto aprendido en los archivos. Las preguntas deben tener una dificultad {dificultad}, cada tipo de pregunta deberá seguir el siguiente formato: 

    1. **Tipo: Verdadero o Falso** deben ser {vf} preguntas
    Pregunta: Debe comenzar con "Pregunta_vf:" seguida del enunciado.
    Alternativa correcta: Debe ser indicada con "Alternativa correcta:" seguida de "V" para Verdadero o "F" para Falso.

    2. **Tipo: Desarrollo** deben ser {desarrollo} preguntas
    Pregunta: Debe comenzar con "Pregunta_desarrollo:" seguida del enunciado.
    Respuesta: Debe comenzar con "Respuesta:" seguida de una breve respuesta.

    3. **Tipo: Alternativas** deben ser {alternativas} preguntas
    Pregunta: Debe comenzar con "Pregunta_alternativas:" seguida del enunciado de la pregunta.
    Alternativas: Cada alternativa debe estar en una nueva línea, comenzando con una letra en minúscula seguida de un paréntesis, por ejemplo, "a)", "b)", hasta la "e)", y luego el texto de la alternativa.
    Alternativa correcta: Debe comenzar con "Alternativa correcta:" seguida de la letra correspondiente a la opción correcta (en minúscula).

    Utiliza un tono formal y no incluyas introducciones ni comentarios adicionales ,no menciones explícitamente los documentos en las preguntas, solo proporciona la lista anidada. No incluyas formatos especiales como **, - ,o markdown en general, solamente devuelve texto plano. Si la cantidad de preguntas es 0 no generes ese tipo de preguntas'''

    max_retries = 4
    retries = 0
    thread_retries = 0
    try:
        while retries < max_retries:
            if thread_retries == 0 or thread_retries >= 2:
                thread = client.beta.threads.create(messages=[{"role": "user", "content": prompt}])
                thread_retries = 0

            run = client.beta.threads.runs.create(thread_id=thread.id, assistant_id=assistant_id)

            while run.status not in ["completed", "failed"]:
                run = client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)
                await asyncio.sleep(1)

            messages = client.beta.threads.messages.list(thread_id=thread.id)
            preguntas = interpretar_mensajes(messages)

            if preguntas and re.search(r"(Pregunta_vf:|Pregunta_desarrollo:|Pregunta_alternativas:)", preguntas):
                return preguntas, thread.id

            client.beta.threads.messages.create(thread_id=thread.id, content=prompt, role="user")
            retries += 1
            thread_retries += 1

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando preguntas: {e}")

    raise HTTPException(status_code=500, detail="No se pudieron generar preguntas tras varios intentos.")

def interpretar_mensajes(messages):
    for thread_message in messages.data:
        for content_item in thread_message.content:
            return content_item.text.value
