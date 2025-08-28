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
  const [mensaje, setMensaje] = useState("");
  const [cursoId, setCursoId] = useState(null);

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
          setMensaje("Ya completaste esta evaluación");
          return;
        }
      } catch (err) {
        // No hay intento, continuamos
      }

      try {
        // 2️⃣ Traer preguntas completas
        const evalRes = await axios.get(`http://localhost:8000/preguntas/evaluacion/${idEvaluacion}`, {
          params: { usuario_id: usuario.id } // backend debe validar inscripción
        });

        if (evalRes.data.error) {
          alert("No estás inscrito en este curso.");
          navigate("/");
          return;
        }

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

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Por ahora no se hace nada al enviar 😅");
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
            <p className="eva-mensaje">{mensaje}</p>
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
