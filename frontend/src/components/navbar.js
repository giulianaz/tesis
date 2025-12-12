import React, { useState } from "react";
import { useNavigate, Link } from 'react-router-dom';
import "../styles/navbar.css"; // Puedes crear estilos simples para el navbar
import Logo from '../assets/logo2.png';


const Navbar = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const usuario = JSON.parse(localStorage.getItem("usuario"));

  const handleLogout = () => {
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };


  if (!usuario) return null; // Si no hay usuario, no mostramos navbar

  return (
        <header className="header">
            <div className="header-left">
                <Link to="/" className='logo-link'>
                    <img src={Logo} alt="LOGO" className="logo-image" />
                </Link>
            </div>

            <div className="header-right">
                {/* Si el usuario no es de tipo 3, mostrar las opciones de "Mis Cursos" y notificaciones */}
                        <div className="menu">
                            <Link to="/" className='mis-cursos'>
                                <div className="header-menu">Mis Cursos</div>
                            </Link>
                        </div>
                        <div className="separator-line"></div> {/* Línea de separación */}


                {/* Icono de perfil y dropdown */}
                <div className="profile-info" onClick={toggleDropdown}>
                    <div className="profile-image-container">
                        <i className="fas fa-user profile-image"></i> {/* Cambia img por un icono */}
                        <div className="arrow-down"></div> {/* Flecha al lado derecho del icono */}
                    </div>
                    <p className="profile-name">{usuario.nombre}</p> {/* Nombre debajo */}
                </div>
                {showDropdown && (
                    <div className="dropdown-menu show">
                        <Link to="/perfil" className="dropdown-item">Mi Perfil</Link>

                        <div onClick={handleLogout} className="dropdown-item">Cerrar Sesión</div>
                    </div>
                )}


            </div>
        </header>

  );
};

export default Navbar;
