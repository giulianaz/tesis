import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/navbar.css"; // Puedes crear estilos simples para el navbar

const Navbar = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const usuario = JSON.parse(localStorage.getItem("usuario"));

  const handleLogout = () => {
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  if (!usuario) return null; // Si no hay usuario, no mostramos navbar

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <span
          className="usuario-nombre"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          {usuario.nombre} ▼
        </span>
        {showDropdown && (
          <div className="dropdown">
            <button onClick={handleLogout}>Cerrar sesión</button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
