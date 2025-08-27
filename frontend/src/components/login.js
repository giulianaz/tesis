import React, { useState, useEffect } from "react";
import "../styles/login.css";
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../assets/logo.png';
import LogoEmpresa from '../assets/logo-empresa.png';
import ig from '../assets/instagram.png';
import mail from '../assets/mail.png';
import linkedin from '../assets/linkedin.png';


const Login = () => {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const navigate = useNavigate();
  const [mensaje, setMensaje] = useState('');

  // Si ya hay usuario en sesión, redirige al "/"
  useEffect(() => {
    const usuario = localStorage.getItem("usuario");
    if (usuario) {
      navigate("/");
    }
  }, [navigate]);

const handleSubmit = async (e) => {
  e.preventDefault();
  setMensaje(''); // Reinicia el mensaje al enviar el formulario

  try {
    const response = await fetch("http://localhost:8000/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo, contrasena }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log('Error de inicio de sesión:', data); // Para depuración
      setMensaje(data.detail || 'Correo o contraseña incorrectos'); // Mensaje de error
      return; // ¡IMPORTANTE! Detiene la función aquí si hay error
    }

    // Si el login es correcto, guardar sesión y navegar
    localStorage.setItem("usuario", JSON.stringify(data));
    navigate("/");

  } catch (err) {
    console.error(err);
  }
};


  return (
    <div className="login-background">
        <div className="login-container">
            <div className="login-left">
                <div class="login-header">
                <img src={Logo} alt="Logo" className="login-logo" />
                <h2 class="login-title-text">AI Want 2 Teach</h2>
            </div>
                <h1 className="welcome-text">¡Que gusto tenerte de vuelta!</h1>
            </div>
            <div className="login-right">
                <form className="login-form" onSubmit={handleSubmit}>
                    <h2 className="login-title">Sign In</h2>
                    <div class="form-group">
                    <label for="email">Correo</label>
                    <input
                      type="email"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      placeholder="Ingresa tu correo"
                      required
                    />
                    </div>
                    <div class="form-group">
                    <label for="password">Contraseña</label>
                    <input
                      type="password"
                      value={contrasena}
                      onChange={(e) => setContrasena(e.target.value)}
                      placeholder="Ingresa tu contraseña"
                      required
                    />
                    </div>
                    <button type="submit">Iniciar Sesión</button>
                    {mensaje && <p className="login-message">{mensaje}</p>} {/* Aquí se muestra el mensaje */}
                    <Link to="/registro" className="registro">
                        ¿No tienes cuenta? ¡Regístrate!
                    </Link>
                </form>
            </div>
        </div>
        <div class="footer">
            <img src={LogoEmpresa} alt="LogoEmpresa" class="footer-logo" />
            <p class="footer-text">created by Gohan & Lili's Code</p>
        </div>
        <footer class="secondary-footer">
        <p>Contacto a soporte:</p>
        <div class="social-icons">
            <a href="https://www.instagram.com/aiwant2teach/" target="_blank" rel="noopener noreferrer">
                <img src={ig} alt="Instagram" class="social-logo" />
            </a>
            <Link to="/reportedeerror">
            <img src={mail} alt="Email" className="social-logo" />
            </Link>
            <a href="https://www.linkedin.com/in/ai-want-2-teach" target="_blank" rel="noopener noreferrer">
                <img src={linkedin} alt="LinkedIn" class="social-logo" />
            </a>
        </div>
        </footer>
        </div>
  );
};

export default Login;
