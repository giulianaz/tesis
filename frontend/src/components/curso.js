import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "./navbar";

const Curso = () => {
  const { idCurso } = useParams();
  const navigate = useNavigate();
  const [curso, setCurso] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const usuario = localStorage.getItem("usuario");
    if (!usuario) {
      navigate("/login"); // Redirige al login si no hay sesión
      return;
    }

    const usuarioObj = JSON.parse(usuario);

    const fetchCurso = async () => {
      try {
        // Enviamos el usuario_id como query parameter
        const response = await fetch(
          `http://localhost:8000/curso/${idCurso}?usuario_id=${usuarioObj.id}`
        );

        if (!response.ok) {
          if (response.status === 403) {
            navigate("/"); // Curso no pertenece al usuario
          } else if (response.status === 404) {
            alert("Curso no encontrado");
            navigate("/"); // Curso no existe
          }
          return;
        }

        const data = await response.json();
        setCurso(data);
      } catch (err) {
        console.error(err);
        navigate("/"); // Redirige a home si hay error
      } finally {
        setCargando(false);
      }
    };

    fetchCurso();
  }, [idCurso, navigate]);

  if (cargando) return <p>Cargando curso...</p>;
  if (!curso) return null;

  return (
    <div>
      <Navbar />
      <h1>{curso.nombre}</h1>
      <h2>Unidades</h2>
      {curso.unidades.length === 0 ? (
        <p>No hay unidades aún.</p>
      ) : (
        <ul>
          {curso.unidades.map((unidad) => (
            <li key={unidad.id}>{unidad.nombre}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Curso;
