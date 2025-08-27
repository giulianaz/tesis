import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './navbar';
import Editar from '../assets/editar.png';
import Perfil2 from '../assets/perfil2.png';
import '../styles/perfil.css';

const Perfil = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [nacimiento, setNacimiento] = useState('');
    const [mensaje, setMensaje] = useState('');

useEffect(() => {
    const usuario = localStorage.getItem('usuario');
    if (!usuario) {
        navigate('/login');
        return;
    }
    const parsedUser = JSON.parse(usuario);
    setUser(parsedUser);
    setNombre(parsedUser.nombre || '');
    setCorreo(parsedUser.correo || '');

    if (parsedUser.nacimiento) {
        // Convertimos a Date y luego formateamos solo YYYY-MM-DD
        const fecha = new Date(parsedUser.nacimiento);
        const fechaFormateada = fecha.getFullYear() + '-' +
            String(fecha.getMonth() + 1).padStart(2, '0') + '-' +
            String(fecha.getDate()).padStart(2, '0');
        setNacimiento(fechaFormateada);
    } else {
        setNacimiento('');
    }
}, [navigate]);



    const handleEditClick = () => setIsEditing(true);

    const handleCancelClick = () => {
        setIsEditing(false);
        if(user){
            setNombre(user.nombre);
            setCorreo(user.correo);
            setContrasena('');
            setNacimiento(user.nacimiento);
        }
    };

const handleSaveClick = async () => {
  if (!user) return;

  // Crear objeto de datos para enviar
  const bodyData = { nombre, correo, nacimiento };
  if (contrasena) bodyData.contrasena = contrasena; // solo incluir si se cambió

  try {
    const response = await fetch(`http://localhost:8000/perfil/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.detail && Array.isArray(data.detail)) {
        // Para errores de validación (422)
        const mensajes = data.detail.map(err => `${err.loc[1]}: ${err.msg}`).join(", ");
        setMensaje(mensajes);
      } else {
        setMensaje(data.detail || "Error al actualizar perfil");
      }
      return;
    }

    // Actualizar usuario en estado y localStorage
    setUser(data);
    localStorage.setItem('usuario', JSON.stringify(data));
    setIsEditing(false);
    setContrasena(''); // limpiar campo
    setMensaje('Perfil actualizado correctamente');
  } catch (error) {
    console.error(error);
    setMensaje('Error de conexión con el servidor');
  }
};



    const handleDeleteClick = async () => {
        if (!user) return;
        const confirmDelete = window.confirm("¿Estás seguro de que deseas eliminar tu perfil? Esta acción es permanente.");
        if (!confirmDelete) return;

        try {
            const response = await fetch(`http://localhost:8000/perfil/${user.id}`, { method: 'DELETE' });
            const data = await response.json();

            if (!response.ok) {
                setMensaje(data.detail || "Error al eliminar perfil");
                return;
            }

            alert("Perfil eliminado correctamente");
            localStorage.removeItem('usuario');
            navigate('/login');
        } catch (error) {
            console.error(error);
            setMensaje("Error de conexión con el servidor");
        }
    };

    if (!user) return <p>Cargando perfil...</p>;

    return (
        <div className="perfil-container-home">
            <Header />
            <div className="perfil-container-body">
                <div className="perfil-content">
                    <div className="profile-image-container">
                        <img src={Perfil2} alt="Perfil" />
                    </div>
                    <div className='perfil-derecha'>
                        <h2>Mi Perfil</h2>
                        <div className="perfil-details">
                            <div className="perfil-item">
                                <strong>Nombre:</strong>
                                <p>
                                    {isEditing ? (
                                        <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} />
                                    ) : (
                                        user.nombre
                                    )}
                                </p>
                            </div>
                            <div className="perfil-item">
                                <strong>Correo:</strong>
                                <p>
                                    {isEditing ? (
                                        <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} />
                                    ) : (
                                        user.correo
                                    )}
                                </p>
                            </div>
                            <div className="perfil-item">
                                <strong>Contraseña:</strong>
                                <p>
                                    {isEditing ? (
                                        <input type="password" placeholder="Nueva contraseña" value={contrasena} onChange={e => setContrasena(e.target.value)} />
                                    ) : (
                                        '********'
                                    )}
                                </p>
                            </div>
                            <div className="perfil-item">
                                <strong>Nacimiento:</strong>
                                <p>
                                    {isEditing ? (
                                        <input type="date" value={nacimiento || ''} onChange={e => setNacimiento(e.target.value)} />
                                    ) : (
                                        user.nacimiento ? new Date(user.nacimiento).toISOString().split('T')[0] : '-'
                                    )}
                                </p>
                            </div>
                            {isEditing && (
                                <button className="btn-delete" onClick={handleDeleteClick}>Eliminar Perfil</button>
                            )}
                        </div>
                        {mensaje && <p className="mensaje-home">{mensaje}</p>}
                    </div>
                    <div className="perfil-actions">
                        {isEditing ? (
                            <div className='guardar-cancelar'>
                                <button className="btn-save" onClick={handleSaveClick}>Guardar</button>
                                <button className="btn-cancel" onClick={handleCancelClick}>Cancelar</button>
                            </div>
                        ) : (
                            <div className="btn-edit" onClick={handleEditClick}>
                                <img src={Editar} alt="Editar perfil" />Editar
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Perfil;
