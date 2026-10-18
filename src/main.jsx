import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class AppBoundary extends React.Component {
  state={error:null};
  static getDerivedStateFromError(error){return {error};}
  componentDidCatch(error){console.error('BRAVA app render failed',error);}
  render(){return this.state.error?<div className="app-render-error"><h1>No se pudo cargar esta sección.</h1><p>{String(this.state.error.message||this.state.error)}</p><button onClick={()=>window.location.reload()}>Recargar la tienda</button></div>:this.props.children;}
}

createRoot(document.getElementById('root')).render(<React.StrictMode><AppBoundary><App /></AppBoundary></React.StrictMode>);
