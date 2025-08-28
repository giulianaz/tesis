import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Registro from "./components/registro";
import Login from "./components/login";
import Home from "./components/home";
import Curso from "./components/curso"; // <-- Nuevo componente
import Perfil from "./components/perfil";
import Evaluacion from "./components/evaluacion"; // <-- Importa tu componente
import Corpus from "./components/corpus";
import '@fortawesome/fontawesome-free/css/all.min.css';
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/registro" element={<Registro />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/curso/:idCurso" element={<Curso />} /> {/* <-- Ruta dinámica */}
        <Route path="/evaluacion/:idEvaluacion" element={<Evaluacion />} /> {/* <-- Nueva ruta */}
        <Route path="/corpus/:unidadId" element={<Corpus />} /> {/* <-- Nueva ruta */}
      </Routes>
    </Router>
  );
}

export default App;
