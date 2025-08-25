import React, { useState, useEffect } from "react";
import "../styles/registro.css";
import { useNavigate } from "react-router-dom";

const Registro = () => {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [nacimiento, setNacimiento] = useState("");
  const [mensaje, setMensaje] = useState("");

  const navigate = useNavigate();

  // Redirigir si hay sesión activa
  useEffect(() => {
    const usuario = localStorage.getItem("usuario");
    if (usuario) {
      navigate("/"); // Redirige al inicio
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:8000/usuarios/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, correo, contrasena, nacimiento }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMensaje(data.detail || "Error al registrarse");
      } else {
        setMensaje(`Usuario ${data.nombre} registrado con éxito!`);
        // Limpiar formulario
        setNombre("");
        setCorreo("");
        setContrasena("");
        setNacimiento("");
      }
    } catch (error) {
      console.error(error);
      setMensaje("Error de conexión con el servidor");
    }
  };

  return (
    <div className="registro-container">
      <h2>Registro</h2>
      <form className="registro-form" onSubmit={handleSubmit}>
        <label>Nombre:</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ingresa tu nombre"
        />

        <label>Correo:</label>
        <input
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="Ingresa tu correo"
        />

        <label>Contraseña:</label>
        <input
          type="password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          placeholder="Ingresa tu contraseña"
        />

        <label>Fecha de nacimiento:</label>
        <input
          type="date"
          value={nacimiento}
          onChange={(e) => setNacimiento(e.target.value)}
        />

        <button type="submit">Registrarse</button>
      </form>

      {mensaje && <p className="mensaje">{mensaje}</p>}

      <a href="/login">Iniciar Sesion</a>
    </div>
  );
};

export default Registro;
