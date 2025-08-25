import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./navbar";

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const usuario = localStorage.getItem("usuario");
    if (!usuario) {
      navigate("/login"); // Redirige al login si no hay sesión
    }
  }, [navigate]);

  return (
    <div>
      <Navbar />
      <div>
        <h1>Página principal</h1>
        <p>Bienvenido a la app, tu sesión está activa.</p>
      </div>
    </div>
  );
};

export default Home;
