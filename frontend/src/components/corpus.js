// src/components/corpus.js
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import Navbar from "./navbar";
import Plus from "../assets/plus.png"; // Ícono de plus
import '../styles/corpus.css';

const Corpus = () => {
  const navigate = useNavigate();
  const { unidadId } = useParams();
  const [corpus, setCorpus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showCrearCorpusForm, setShowCrearCorpusForm] = useState(false);
  const [isUploadingNew, setIsUploadingNew] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [cursoId, setCursoId] = useState(null);

  // Comprobar usuario en sesión
  useEffect(() => {
    const usuario = localStorage.getItem("usuario");
    if (!usuario) {
      navigate("/login");
    }
  }, [navigate]);

  // Obtener corpus de la unidad
  useEffect(() => {
    const fetchCorpus = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/corpus/unidad/${unidadId}`);
        // Ahora cada c tendrá: id, nombre, material (file_id), vector_id
        const corpusConIds = response.data.corpus.map(c => ({
          ...c,
          vector_id: response.data.vector_id || null  // si quieres pasar vector_id de unidad
        }));
        setCorpus(corpusConIds);
        setCursoId(response.data.curso_id);
      } catch (error) {
        console.error('Error fetching corpus:', error);
        setCorpus([]);
      } finally {
        setLoading(false);
      }
    };

    if (unidadId) fetchCorpus();
  }, [unidadId]);

  const handleFileChange = (event) => {
    setSelectedFiles(Array.from(event.target.files));
  };

  const handleAgregarCorpus = async (event) => {
    event.preventDefault();
    if (selectedFiles.length === 0) return;

    setIsUploadingNew(true);

    try {
      // Espera 1.5s para simular el spinner
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Subir archivos al backend
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("archivo", file);

        await axios.post(`http://localhost:8000/corpus/unidad/${unidadId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // Actualizar lista de corpus después de subir
      const response = await axios.get(`http://localhost:8000/corpus/unidad/${unidadId}`);
      const corpusConIds = response.data.corpus.map(c => ({
        ...c,
        vector_id: response.data.vector_id || null
      }));
      setCorpus(corpusConIds);

      alert(`Archivo(s) "${selectedFiles.map(f => f.name).join(', ')}" subido.`);
      setSelectedFiles([]);
      setShowCrearCorpusForm(false);
      setSuccessMessage('Archivo(s) subido(s) correctamente.');
    } catch (error) {
      console.error("Error al subir archivos:", error);
      setSuccessMessage("Error al subir los archivos.");
    } finally {
      setIsUploadingNew(false);
    }
  };

  const handleEliminarCorpus = async (corpusId, fileId, vectorId) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este archivo?")) return;

    if (!fileId || !vectorId) {
      alert("No se pueden eliminar los archivos: faltan IDs");
      return;
    }

    try {
      await axios.delete(`http://localhost:8000/corpus/${corpusId}`, {
        params: { file_id: fileId, vector_id: vectorId }
      });

      setCorpus(prev => prev.filter(c => c.id !== corpusId));
      alert("Archivo eliminado correctamente.");
    } catch (error) {
      console.error("Error al eliminar archivo:", error);
      alert("No se pudo eliminar el archivo.");
    }
  };

  return (
    <div className="container-corpus">
      <Navbar />
      <div className='volver'>
        {cursoId && (
          <Link to={`/curso/${cursoId}`} className="link-back">
            🡐 Volver
          </Link>
        )}
      </div>

      <div className='container-body-corpus'>
        <div className="titulopag">
          <h2>Recursos para la Unidad</h2>
        </div>

        {/* Sección para agregar/subir archivos */}
        <div className="crear-corpus">
          {!showCrearCorpusForm ? (
            <button
              type="button"
              className="btn btn-agregar"
              onClick={() => setShowCrearCorpusForm(true)}
            >
              <img src={Plus} alt="Ícono Más" className="icono-plus" />
              Agregar Recurso
            </button>
          ) : (
            <form onSubmit={handleAgregarCorpus} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
              <label htmlFor="fileUpload">Seleccionar archivo:</label>
              <input
                type="file"
                id="fileUpload"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                multiple
              />
              <button
                type="button"
                onClick={() => document.getElementById('fileUpload').click()}
                className="btn-examinar"
                style={{ marginLeft: '10px' }}
              >
                Examinar
              </button>
              {selectedFiles.length > 0 && (
                <div style={{ marginLeft: '10px' }}>
                  {selectedFiles.map((file, index) => (
                    <p key={index}>Archivo seleccionado: {file.name}</p>
                  ))}
                </div>
              )}
              <div className="form-buttons">
                <button type="submit" className="btn-agregar2">Guardar</button>
                <button type="button" className="btn-cancelar2" onClick={() => setShowCrearCorpusForm(false)}>Cancelar</button>
              </div>
            </form>
          )}
          {isUploadingNew && (
            <div className="loading-spinner">
              <div className="loading-ring"></div>
              <p className="loading-text">Subiendo archivo...</p>
            </div>
          )}
        </div>
        {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}

        {/* Lista de corpus */}
        {loading ? (
          <p>Cargando corpus...</p>
        ) : corpus.length === 0 ? (
          <p>No hay corpus para esta unidad.</p>
        ) : (
          <ul className="corpus-list">
            {corpus.map(c => (
              <li key={c.id} className="corpus-item">
                <div className="corpus-card">
                  <div className="corpus-line"></div>
                  <div className="corpus-content">
                    <div className='titulo-corpus'>{c.nombre}</div>
                    <button
                      className="btn-danger btn-eliminar-corpus"
                      onClick={() => handleEliminarCorpus(c.id, c.material, c.vector_id)}
                    >
                      Eliminar material
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Corpus;
