import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "./navbar";
import "../styles/evaluacion.css";

const Evaluacion = () => {
  const { idEvaluacion } = useParams();
  const navigate = useNavigate();
  const [evaluacion, setEvaluacion] = useState(null);
  const [hayIntento, setHayIntento] = useState(false);
  const [cursoId, setCursoId] = useState(null);
  const [enviando, setEnviando] = useState(false);

useEffect(() => {
  const verificarUsuario = async () => {
    const usuarioStr = localStorage.getItem("usuario");
    if (!usuarioStr) {
      navigate("/login");
      return;
    }
    const usuario = JSON.parse(usuarioStr);

    try {
      // 1️⃣ Verificar si hay intento
      const intentoRes = await axios.get(`http://localhost:8000/intento_evaluacion/${idEvaluacion}`, {
        params: { usuario_id: usuario.id }
      });

      if (intentoRes.status === 200) {
        setHayIntento(true);

        // ✅ Si hay intento, traemos las respuestas usando el endpoint simple
        const evalRes = await axios.get(
          `http://localhost:8000/preguntas/evaluacion/simple/${idEvaluacion}`,
          { params: { usuario_id: usuario.id } }
        );
        setEvaluacion(evalRes.data);
        setCursoId(evalRes.data.id_curso); // <--- agrega esto

        return;
      }

    } catch (err) {
      // No hay intento, continuamos con flujo normal
    }

    try {
      // 2️⃣ Traer preguntas completas (con respuestas del usuario si ya respondió)
      const evalRes = await axios.get(
        `http://localhost:8000/preguntas/evaluacion/${idEvaluacion}`,
        { params: { usuario_id: usuario.id } }
      );
      setEvaluacion(evalRes.data);
      setCursoId(evalRes.data.id_curso);
    } catch (err) {
      console.error("Error al cargar evaluación:", err);
      alert("No tienes acceso a esta evaluación.");
      navigate("/");
    }
  };

  if (idEvaluacion) verificarUsuario();
}, [idEvaluacion, navigate]);


  const handleSubmit = async (e) => {
    e.preventDefault();

    const usuarioStr = localStorage.getItem("usuario");
    if (!usuarioStr) {
      alert("Debes iniciar sesión");
      navigate("/login");
      return;
    }
    const usuario = JSON.parse(usuarioStr);

    const respuestas = [];

    evaluacion.preguntas_alternativas?.forEach((p) => {
      const selected = document.querySelector(`input[name="alt_${p.id}"]:checked`);
      respuestas.push({
        id_pregunta: p.id,
        tipo: "alternativa",
        enunciado: p.enunciado,
        respuesta_usuario: selected ? selected.value : "",
        correcta: p.correcta
      });
    });

    evaluacion.preguntas_vf?.forEach((p) => {
      const selected = document.querySelector(`input[name="vf_${p.id}"]:checked`);
      respuestas.push({
        id_pregunta: p.id,
        tipo: "vf",
        enunciado: p.enunciado,
        respuesta_usuario: selected ? selected.value : "",
        correcta: p.correcta
      });
    });

    evaluacion.preguntas_desarrollo?.forEach((p) => {
      const textarea = document.querySelector(`textarea[name="des_${p.id}"]`);
      respuestas.push({
        id_pregunta: p.id,
        tipo: "desarrollo",
        enunciado: p.enunciado,
        respuesta_usuario: textarea ? textarea.value : "",
        correcta: null
      });
    });

    try {
      setEnviando(true);

      const res = await axios.post(
        `http://localhost:8000/evaluacion/${idEvaluacion}/responder`,
        {
          id_evaluacion: Number(idEvaluacion),
          id_usuario: usuario.id,
          respuestas: respuestas
        }
      );

      if (res.status === 200) {
        alert(`Evaluación enviada! Puntaje: ${res.data.puntaje}\nRetroalimentación disponible.`);
        window.location.reload();
      }
    } catch (err) {
      console.error("Error al enviar evaluación:", err);
      alert("Ocurrió un error al enviar la evaluación.");
    } finally {
      setEnviando(false);
    }
  };

  const nivelTexto = (nivel) => {
    switch (nivel) {
      case 1: return "Fácil";
      case 2: return "Medio";
      case 3: return "Difícil";
      default: return "Desconocido";
    }
  };

  return (
    <div>
      <Navbar />
      <div className='volver'>
        {cursoId && (
          <Link to={`/curso/${cursoId}`} className="link-back">
            🡐 Volver
          </Link>
        )}
      </div>

      <div className="eva-container-home">
        <div className="eva-container-body">
        {hayIntento ? (
          <>

            {evaluacion && (
              <>
                <h2 className="eva-title">Revisión</h2>
                {evaluacion.descripcion && <p className="eva-descripcion">{evaluacion.descripcion}</p>}
                {evaluacion.nivel && <p className="eva-nivel">Nivel: {nivelTexto(evaluacion.nivel)}</p>}
{/* ---------------- Alternativas ---------------- */}
{evaluacion.alternativas.map((p, index) => (
  <div key={`alt_card_${index}`} className="eva-pregunta-card">
    <p className="eva-enunciado">{index + 1}. {p.enunciado}</p>
    {Object.entries(p.opciones).map(([key, opcion]) => (
      <label 
        key={`alt_${index}_${key}`} 
        className={`eva-label ${
          p.correcta.toUpperCase() === key.toUpperCase() ? "correcta" : 
          p.respuesta_usuario.toUpperCase() === key.toUpperCase() && p.correcta.toUpperCase() !== key.toUpperCase() ? "incorrecta" : ""
        }`}
      >
        <input
          type="radio"
          name={`alt_${p.id || index}`} // nombre único por pregunta
          value={key}
          checked={p.respuesta_usuario.toUpperCase() === key.toUpperCase()}
          disabled
        />
        {opcion} {p.correcta.toUpperCase() === key.toUpperCase() && "✔"} {p.respuesta_usuario.toUpperCase() === key.toUpperCase() && p.correcta.toUpperCase() !== key.toUpperCase() && "✖"}
      </label>
    ))}
  </div>
))}

{/* ---------------- Verdadero/Falso ---------------- */}
{evaluacion.vf?.length > 0 && (
  <>
    <h3 className="eva-subtitle">Preguntas Verdadero/Falso</h3>
    {evaluacion.vf.map((p, index) => (
      <div key={`vf_card_${index}`} className="eva-pregunta-card">
        <p className="eva-enunciado">{index + 1}. {p.enunciado}</p>
        {["V", "F"].map((v) => (
          <label 
            key={`vf_${index}_${v}`} 
            className={`eva-label ${
              p.correcta.toUpperCase() === v ? "correcta" : 
              p.respuesta_usuario.toUpperCase() === v && p.correcta.toUpperCase() !== v ? "incorrecta" : ""
            }`}
          >
            <input
              type="radio"
              name={`vf_${p.id || index}`} // nombre único por pregunta
              value={v}
              checked={p.respuesta_usuario.toUpperCase() === v}
              disabled
            />
            {v === "V" ? "Verdadero" : "Falso"} {p.correcta.toUpperCase() === v && "✔"} {p.respuesta_usuario.toUpperCase() === v && p.correcta.toUpperCase() !== v && "✖"}
          </label>
        ))}
      </div>
    ))}
  </>
)}


                {/* ---------------- Desarrollo ---------------- */}
                {evaluacion.desarrollo?.length > 0 && (
                  <>
                    <h3 className="eva-subtitle">Preguntas de Desarrollo</h3>
                    {evaluacion.desarrollo.map((p, index) => (
                      <div key={p.id} className="eva-pregunta-card">
                        <p className="eva-enunciado">{index + 1}. {p.enunciado}</p>
                        <textarea
                          className="eva-textarea"
                          rows="4"
                          cols="50"
                          value={p.respuesta_usuario || ""}
                          disabled
                        ></textarea>
                        {p.retroalimentacion && (
                          <p className="eva-retroalimentacion"><strong>Retroalimentación:</strong> {p.retroalimentacion}</p>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        ) : !evaluacion ? (
            <p className="eva-cargando">Cargando preguntas...</p>
          ) : (
            <>
              <h2 className="eva-title">{evaluacion.nombre}</h2>
              {evaluacion.descripcion && <p className="eva-descripcion">{evaluacion.descripcion}</p>}
              {evaluacion.nivel && <p className="eva-nivel">Nivel: {nivelTexto(evaluacion.nivel)}</p>}

              <form onSubmit={handleSubmit} className="eva-form">
                {/* Preguntas de selección múltiple */}
                {evaluacion.preguntas_alternativas?.length > 0 && (
                  <>
                    <h3 className="eva-subtitle">Preguntas de Selección Múltiple</h3>
                    {evaluacion.preguntas_alternativas.map((p, index) => (
                      <div key={p.id} className="eva-pregunta-card">
                        <p className="eva-enunciado">{index + 1}. {p.enunciado}</p>
                        {Object.entries(p.opciones).map(([key, opcion]) => (
                          <label key={key} className="eva-label">
                            <input className="eva-radio" type="radio" name={`alt_${p.id}`} value={key} />
                            {opcion}
                          </label>
                        ))}
                      </div>
                    ))}
                  </>
                )}

                {/* Preguntas Verdadero/Falso */}
                {evaluacion.preguntas_vf?.length > 0 && (
                  <>
                    <h3 className="eva-subtitle">Preguntas Verdadero/Falso</h3>
                    {evaluacion.preguntas_vf.map((p, index) => (
                      <div key={p.id} className="eva-pregunta-card">
                        <p className="eva-enunciado">{index + 1}. {p.enunciado}</p>
                        <label className="eva-label">
                          <input className="eva-radio" type="radio" name={`vf_${p.id}`} value="V" />
                          Verdadero
                        </label>
                        <label className="eva-label">
                          <input className="eva-radio" type="radio" name={`vf_${p.id}`} value="F" />
                          Falso
                        </label>
                      </div>
                    ))}
                  </>
                )}

                {/* Preguntas de desarrollo */}
                {evaluacion.preguntas_desarrollo?.length > 0 && (
                  <>
                    <h3 className="eva-subtitle">Preguntas de Desarrollo</h3>
                    {evaluacion.preguntas_desarrollo.map((p, index) => (
                      <div key={p.id} className="eva-pregunta-card">
                        <p className="eva-enunciado">{index + 1}. {p.enunciado}</p>
                        <textarea
                          className="eva-textarea"
                          name={`des_${p.id}`}
                          rows="4"
                          cols="50"
                          placeholder="Escribe tu respuesta aquí"
                        ></textarea>
                      </div>
                    ))}
                  </>
                )}

                {/* Spinner mientras se envía */}
                {enviando && (
                  <div className="eva-cargando">
                    <span>Enviando respuestas...</span>
                    <div className="spinner"></div>
                  </div>
                )}

                <button type="submit" className="eva-submit">Enviar</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Evaluacion;
