import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "./navbar";
import Editar from '../assets/editar.png';
import Docs from '../assets/docs.png';
import Evaluacion from '../assets/evaluacion.png';
import '../styles/curso.css';

const Curso = () => {
  const { idCurso } = useParams();
  const navigate = useNavigate();
  const [curso, setCurso] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [selectedUnidad, setSelectedUnidad] = useState(null);
  const [editUnidadId, setEditUnidadId] = useState(null);
  const [newUnidadNombre, setNewUnidadNombre] = useState("");
  const [showCrearUnidadForm, setShowCrearUnidadForm] = useState(false);
  const [nuevaUnidadNombre, setNuevaUnidadNombre] = useState("");
  const [evaluaciones, setEvaluaciones] = useState([]);

  // Cargar curso y unidades
  useEffect(() => {
    const usuario = localStorage.getItem("usuario");
    if (!usuario) {
      navigate("/login");
      return;
    }

    const usuarioObj = JSON.parse(usuario);

    const fetchCurso = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/curso/${idCurso}?usuario_id=${usuarioObj.id}`
        );

        if (!response.ok) {
          if (response.status === 403) navigate("/");
          else if (response.status === 404) {
            alert("Curso no encontrado");
            navigate("/");
          }
          return;
        }

        const data = await response.json();
        setCurso(data);

        if (data.unidades && data.unidades.length > 0) {
          setSelectedUnidad(data.unidades[0].id);
        }
      } catch (err) {
        console.error(err);
        navigate("/");
      } finally {
        setCargando(false);
      }
    };

    fetchCurso();
  }, [idCurso, navigate]);

  // Cargar evaluaciones y sus intentos
  useEffect(() => {
    if (!selectedUnidad) return;

    const fetchEvaluacionesConIntentos = async () => {
      try {
        const evalRes = await fetch(`http://localhost:8000/evaluaciones/unidad/${selectedUnidad}`);
        if (!evalRes.ok) {
          console.error("Error al traer evaluaciones:", evalRes.statusText);
          setEvaluaciones([]);
          return;
        }
        const evaluacionesData = await evalRes.json();

        // Traer intento de cada evaluación individualmente
        const evaluacionesConIntento = await Promise.all(
          evaluacionesData.map(async (evalua) => {
            try {
              const intentoRes = await fetch(`http://localhost:8000/intento_evaluacion/${evalua.id}`);
              if (intentoRes.ok) {
                const intentoData = await intentoRes.json();
                return { ...evalua, intento: intentoData };
              }
            } catch (err) {
              console.error("Error al traer intento de evaluación", evalua.id, err);
            }
            return { ...evalua, intento: null }; // no hay intento
          })
        );

        setEvaluaciones(evaluacionesConIntento);
      } catch (err) {
        console.error("Error general al traer evaluaciones:", err);
        setEvaluaciones([]);
      }
    };

    fetchEvaluacionesConIntentos();
  }, [selectedUnidad]);

  const handleUnidadClick = (unidadId) => {
    setSelectedUnidad(unidadId);
  };

  const handleEditarUnidad = (unidadId, nombre) => {
    setEditUnidadId(unidadId);
    setNewUnidadNombre(nombre);
  };

  const handleGuardarEdicion = async (unidadId) => {
    try {
      const response = await fetch(`http://localhost:8000/unidades/${unidadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: newUnidadNombre }),
      });
      const data = await response.json();
      if (response.ok) {
        setCurso(prev => ({
          ...prev,
          unidades: prev.unidades.map(u => (u.id === unidadId ? data : u))
        }));
        setEditUnidadId(null);
        setNewUnidadNombre("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBorrarUnidad = async (unidadId) => {
    if (!window.confirm("¿Seguro quieres eliminar esta unidad?")) return;
    try {
      const response = await fetch(`http://localhost:8000/unidades/${unidadId}`, { method: "DELETE" });
      if (response.ok) {
        setCurso(prev => {
          const nuevasUnidades = prev.unidades.filter(u => u.id !== unidadId);
          if (selectedUnidad === unidadId && nuevasUnidades.length > 0) {
            setSelectedUnidad(nuevasUnidades[0].id);
          } else if (nuevasUnidades.length === 0) {
            setSelectedUnidad(null);
          }
          return { ...prev, unidades: nuevasUnidades };
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitNuevaUnidad = async (e) => {
    e.preventDefault();
    if (!nuevaUnidadNombre) return;

    try {
      const response = await fetch("http://localhost:8000/unidades/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevaUnidadNombre, id_curso: curso.id }),
      });
      const data = await response.json();
      if (response.ok) {
        setCurso(prev => ({
          ...prev,
          unidades: [...prev.unidades, data]
        }));
        setNuevaUnidadNombre("");
        setShowCrearUnidadForm(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (cargando) return <p>Cargando curso...</p>;
  if (!curso) return null;

  return (
    <div className="container-profesor">
      <Navbar />
      <div className='volver'>
        <Link to="/" className="link-back">🡐 Volver</Link>
      </div>

      <div className='container-body'>
        <div className="Principal">
          <h2>{curso.nombre}</h2>
        </div>

        <div className="content">
          <div className="unidades">
            <div className="unidades-tabs">
              {curso.unidades.map(unidad => (
                <div key={unidad.id} className="unidad-card">
                  <button
                    className={unidad.id === selectedUnidad ? "unidad-tab active" : "unidad-tab"}
                    onClick={() => handleUnidadClick(unidad.id)}
                  >
                    {unidad.nombre}
                  </button>
                </div>
              ))}

              <div className={`crear-unidad-tab ${showCrearUnidadForm ? 'show-form' : ''}`}>
                <button className="crear-unidad-button" onClick={() => setShowCrearUnidadForm(!showCrearUnidadForm)}>+</button>
                {showCrearUnidadForm && (
                  <form onSubmit={handleSubmitNuevaUnidad} className="form-nueva-unidad">
                    <input
                      type="text"
                      value={nuevaUnidadNombre}
                      onChange={(e) => setNuevaUnidadNombre(e.target.value)}
                      placeholder="Nombre de la nueva unidad"
                      required
                      className="input-nueva-unidad"
                    />
                    <div className="form-buttons-3">
                      <button className='btn-crear3' type="submit">Crear</button>
                      <button className='btn-cancelar3' type="button" onClick={() => setShowCrearUnidadForm(false)}>Cancelar</button>
                    </div>
                  </form>
                )}
              </div>

            </div>
          </div>

          {selectedUnidad && (
            <div className="actividades">
              <div className='titulo-actividad'>
                <div className='nombreUnidad'>
                  <h3>{curso.unidades.find(u => u.id === selectedUnidad)?.nombre}</h3>
                  {editUnidadId === selectedUnidad ? (
                    <form onSubmit={(e) => { e.preventDefault(); handleGuardarEdicion(editUnidadId); }} className="form-editar-unidad">
                      <input
                        type="text"
                        value={newUnidadNombre}
                        onChange={(e) => setNewUnidadNombre(e.target.value)}
                        placeholder="Nuevo nombre de la unidad"
                        required
                      />
                      <div className="form-buttons">
                        <button type="submit">Guardar</button>
                        <button type="button" className="btn-cancelar" onClick={() => setEditUnidadId(null)}>Cancelar</button>
                        <button type="button" className="btn-cancelar" onClick={() => handleBorrarUnidad(editUnidadId)}>Borrar </button>
                      </div>
                    </form>
                  ) : (
                    <button className="editar-unidad-btn" onClick={() => handleEditarUnidad(selectedUnidad, curso.unidades.find(u => u.id === selectedUnidad)?.nombre)}>
                      <img src={Editar} alt="Editar unidad" />
                    </button>
                  )}
                </div>

                <div className='ver-cosas'>
                  <div className="ver-botones">
                    <Link to={``} className="ver-corpus">
                      <img src={Evaluacion} alt="Ícono Evaluación" className="icono-evaluacion" />
                      Nueva Evaluación
                    </Link>
                  </div>
                  <div className="ver-botones">
                    <Link to={`/corpus/${selectedUnidad}`} className="ver-corpus">
                      <img src={Docs} alt="Ícono Docs" className="icono-foro" />
                      Material de clases
                    </Link>
                  </div>
                </div>
              </div>

              <div className="evaluaciones-container">
                {evaluaciones.length > 0 ? (
                  evaluaciones.map(evalua => {
                    const intento = evalua.intento;

                    return (
                      <div key={evalua.id} className="evaluacion-card">
                        <div className="actividad-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div className="actividad-nombre">{evalua.nombre}</div>
                            <div className="actividad-descripcion">{evalua.descripcion}</div>
                            <div className="actividad-nivel">
                              Nivel: {evalua.nivel === 1 ? "Fácil" : evalua.nivel === 2 ? "Medio" : evalua.nivel === 3 ? "Difícil" : "N/A"}
                            </div>
                          </div>

                          <div className="evaluacion-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                            {intento ? (
                              <>
                                <span style={{ color: intento.puntaje_obtenido < 70 ? 'red' : '#2F7A99', fontWeight: 'bold' }}>
                                  {intento.puntaje_obtenido}%
                                </span>
                                <Link to={`/evaluacion/${evalua.id}`} className="btn-ver-evaluacion">
                                  Ver Evaluación
                                </Link>
                              </>
                            ) : (
                              <Link to={`/evaluacion/${evalua.id}`} className="btn-iniciar">Iniciar Evaluación</Link>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p>No hay evaluaciones para esta unidad.</p>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Curso;
