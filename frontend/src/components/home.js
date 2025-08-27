import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./navbar";
import '../styles/home.css';
import Curso from '../assets/curso.png';
import Editar from '../assets/editar.png';
import Agregar from '../assets/agregar.png';
import ig from '../assets/instagram.png';
import mail from '../assets/mail.png';
import linkedin from '../assets/linkedin.png';

const Home = () => {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState([]);
  const [nombreCurso, setNombreCurso] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [showAgregarCurso, setShowAgregarCurso] = useState(false);
  const [editCursoId, setEditCursoId] = useState(null);
  const [newCursoNombre, setNewCursoNombre] = useState("");

  // Comprobar usuario en sesión
  useEffect(() => {
    const usuario = localStorage.getItem("usuario");
    if (!usuario) {
      navigate("/login");
      return;
    }
    fetchCursos();
  }, [navigate]);

  const fetchCursos = async () => {
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    if (!usuario) return;
    try {
      const response = await fetch(`http://localhost:8000/cursos/${usuario.id}`);
      if (response.ok) {
        const data = await response.json();
        setCursos(data);
      }
    } catch (err) {
      console.error(err);
      setMensaje("Error al cargar cursos");
    }
  };

  const toggleAgregarCurso = () => {
    setShowAgregarCurso(!showAgregarCurso);
    if (showAgregarCurso) setNombreCurso("");
  };

  const handleGuardarCurso = async () => {
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    if (!usuario) return;

    try {
      const response = await fetch("http://localhost:8000/cursos/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreCurso, id_usuario: usuario.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMensaje(data.detail || "Error al crear curso");
      } else {
        setMensaje(`Curso "${data.nombre}" creado con éxito!`);
        setCursos(prev => [...prev, { id: data.id, nombre: data.nombre }]);
        setNombreCurso("");
        setShowAgregarCurso(false);
      }
    } catch (err) {
      console.error(err);
      setMensaje("Error de conexión con el servidor");
    }
  };

  const handleEditarCurso = (curso) => {
    setEditCursoId(curso.id);
    setNewCursoNombre(curso.nombre);
  };

  const handleGuardarEdicion = async () => {
    try {
      const response = await fetch(`http://localhost:8000/cursos/${editCursoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: newCursoNombre }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMensaje(data.detail || "Error al actualizar curso");
      } else {
        setCursos(prev =>
          prev.map(c => (c.id === editCursoId ? { ...c, nombre: data.nombre } : c))
        );
        setEditCursoId(null);
        setNewCursoNombre("");
        setMensaje(`Curso "${data.nombre}" actualizado`);
      }
    } catch (err) {
      console.error(err);
      setMensaje("Error de conexión con el servidor");
    }
  };

  const handleEliminarCurso = async (cursoId) => {
    if (!window.confirm("¿Seguro quieres eliminar este curso?")) return;
    try {
      const response = await fetch(`http://localhost:8000/cursos/${cursoId}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) setMensaje(data.detail || "Error al eliminar curso");
      else {
        setCursos(prev => prev.filter(c => c.id !== cursoId));
        setMensaje("Curso eliminado correctamente");
      }
    } catch (err) {
      console.error(err);
      setMensaje("Error de conexión con el servidor");
    }
  };

  return (
    <div className="container-home">
      <Navbar />
      <div className="container-body">
        <div className="titulopag">
          <h2>Mis Cursos</h2>
          <div className="add-curso">
            <img 
              src={Agregar} 
              alt="Agregar curso" 
              className="agregar-icon" 
              onClick={toggleAgregarCurso} 
            />
            {showAgregarCurso && (
              <div className="agregar-curso-form">
                <input
                  type="text"
                  value={nombreCurso}
                  onChange={(e) => setNombreCurso(e.target.value)}
                  placeholder="Nombre del curso"
                />
                <button className="btn-add-2" onClick={handleGuardarCurso}>Agregar Curso</button>
              </div>
            )}
          </div>
        </div>

        {mensaje && <p className="mensaje-home">{mensaje}</p>}

        <ul className="curso-list">
          {cursos.map(curso => (
            <li key={curso.id} className={`curso-item ${editCursoId === curso.id ? 'curso-editing' : ''}`}>
              <div className="curso-card">
                <div className="curso-image">
                  <img src={Curso} alt="Imagen de curso" />
                  <div 
                    className="edit-icon" 
                    onClick={(e) => { 
                      e.stopPropagation(); // Evita que el click en el icono navegue
                      handleEditarCurso(curso); 
                    }}
                  >
                    <img src={Editar} alt="Editar curso"/>
                  </div>
                </div>
                <div 
                  className="curso-content" 
                  onClick={() => { if(editCursoId !== curso.id) navigate(`/curso/${curso.id}`) }}
                  style={{ cursor: editCursoId === curso.id ? "default" : "pointer" }}
                >
                  {editCursoId === curso.id ? (
                    <div className="edit-curso">
                      <input
                        type="text"
                        value={newCursoNombre}
                        onChange={(e) => setNewCursoNombre(e.target.value)}
                        placeholder="Nuevo nombre del curso"
                      />
                      <button className="btn-save1" onClick={handleGuardarEdicion}>Guardar</button>
                      <button className="btn-delete" onClick={() => handleEliminarCurso(curso.id)}>Eliminar</button>
                    </div>
                  ) : (
                    <span className="curso-name">{curso.nombre}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>


        <footer className="secondary-footer">
          <p>Contacto a soporte:</p>
          <div className="social-icons">
            <a href="https://www.instagram.com/aiwant2teach/" target="_blank" rel="noopener noreferrer">
              <img src={ig} alt="Instagram" className="social-logo" />
            </a>
            <a href="mailto:soporte@aiwant2teach.com">
              <img src={mail} alt="Email" className="social-logo" />
            </a>
            <a href="https://www.linkedin.com/in/ai-want-2-teach" target="_blank" rel="noopener noreferrer">
              <img src={linkedin} alt="LinkedIn" className="social-logo" />
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Home;
