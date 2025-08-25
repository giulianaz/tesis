import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./navbar";

const Home = () => {
  const navigate = useNavigate();
  const [nombreCurso, setNombreCurso] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cursos, setCursos] = useState([]);
  const [editCursoId, setEditCursoId] = useState(null);
  const [editNombre, setEditNombre] = useState("");

  useEffect(() => {
    const usuario = localStorage.getItem("usuario");
    if (!usuario) {
      navigate("/login");
      return;
    }

    const usuarioObj = JSON.parse(usuario);

    const fetchCursos = async () => {
      try {
        const response = await fetch(`http://localhost:8000/cursos/${usuarioObj.id}`);
        const data = await response.json();
        setCursos(data);
      } catch (err) {
        console.error("Error al obtener cursos:", err);
      }
    };

    fetchCursos();
  }, [navigate]);

  const crearCurso = async () => {
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
        const errorMsg = Array.isArray(data.detail)
          ? data.detail.map(e => e.msg).join(", ")
          : data.detail || "Error al crear el curso";
        setMensaje(errorMsg);
      } else {
        setMensaje(`Curso "${data.nombre}" creado con éxito!`);
        setNombreCurso("");
        setCursos(prev => [...prev, { id: data.id, nombre: data.nombre }]);
      }
    } catch (err) {
      console.error(err);
      setMensaje("Error de conexión con el servidor");
    }
  };

  const borrarCurso = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar el curso "${nombre}"?`)) return;

    try {
      const response = await fetch(`http://localhost:8000/cursos/${id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        setMensaje(data.detail || "Error al borrar el curso");
      } else {
        setMensaje(data.detail);
        setCursos(prev => prev.filter(curso => curso.id !== id));
      }
    } catch (err) {
      console.error(err);
      setMensaje("Error de conexión con el servidor");
    }
  };

  const iniciarEdicion = (curso) => {
    setEditCursoId(curso.id);
    setEditNombre(curso.nombre);
  };

  const guardarEdicion = async () => {
    try {
      const response = await fetch(`http://localhost:8000/cursos/${editCursoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: editNombre }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMensaje(data.detail || "Error al editar el curso");
      } else {
        setMensaje(`Curso "${data.nombre}" actualizado`);
        setCursos(prev =>
          prev.map(c => (c.id === editCursoId ? { ...c, nombre: data.nombre } : c))
        );
        setEditCursoId(null);
        setEditNombre("");
      }
    } catch (err) {
      console.error(err);
      setMensaje("Error de conexión con el servidor");
    }
  };

  const cancelarEdicion = () => {
    setEditCursoId(null);
    setEditNombre("");
  };

  return (
    <div>
      <Navbar />
      <div style={{ padding: "20px" }}>
        <h1>Página principal</h1>
        <p>Bienvenido a la app, tu sesión está activa.</p>

        <div style={{ marginTop: "20px" }}>
          <input
            type="text"
            placeholder="Nombre del curso"
            value={nombreCurso}
            onChange={(e) => setNombreCurso(e.target.value)}
          />
          <button onClick={crearCurso}>Crear Curso</button>
        </div>

        {mensaje && <p style={{ color: "green" }}>{mensaje}</p>}

        <div style={{ marginTop: "30px" }}>
        <h2>Tus cursos</h2>
        {cursos.length === 0 ? (
            <p>No tienes cursos aún.</p>
        ) : (
            <ul>
            {cursos.map(curso => (
                <li key={curso.id} style={{ marginBottom: "10px" }}>
                {editCursoId === curso.id ? (
                    <>
                    <input
                        type="text"
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                    />
                    <button onClick={guardarEdicion}>Guardar</button>
                    <button onClick={cancelarEdicion}>Cancelar</button>
                    </>
                ) : (
                    <>
                    {/* Nombre clickeable */}
                    <span
                        style={{ cursor: "pointer", textDecoration: "underline", color: "blue" }}
                        onClick={() => navigate(`/curso/${curso.id}`)}
                    >
                        {curso.nombre}
                    </span>

                    <button style={{ marginLeft: "10px" }} onClick={() => iniciarEdicion(curso)}>
                        Editar
                    </button>
                    <button style={{ marginLeft: "10px" }} onClick={() => borrarCurso(curso.id, curso.nombre)}>
                        Borrar
                    </button>
                    </>
                )}
                </li>
            ))}
            </ul>
        )}
        </div>

      </div>
    </div>
  );
};

export default Home;
