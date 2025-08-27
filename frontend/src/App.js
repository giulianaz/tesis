import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Registro from "./components/registro";
import Login from "./components/login";
import Home from "./components/home";
import Curso from "./components/curso"; // <-- Nuevo componente
import '@fortawesome/fontawesome-free/css/all.min.css';
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/registro" element={<Registro />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route path="/curso/:idCurso" element={<Curso />} /> {/* <-- Ruta dinámica */}
      </Routes>
    </Router>
  );
}

export default App;
