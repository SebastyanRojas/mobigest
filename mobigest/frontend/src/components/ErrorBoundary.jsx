import React from "react";
 
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
 
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
 
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary capturó un error:", error, errorInfo);
  }
 
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };
 
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h2>Algo salió mal.</h2>
          <p>Ocurrió un error inesperado en la aplicación.</p>
          <button onClick={this.handleReset}>Intentar de nuevo</button>
        </div>
      );
    }
 
    return this.props.children;
  }
}
 
export default ErrorBoundary;
 