import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import { registerCustomSW } from "./lib/serviceWorkerMessaging";

// Registra o Service Worker customizado para push notifications
registerCustomSW();

// Renderiza a aplicação envolvida pelo ErrorBoundary global
// para capturar e registrar erros automaticamente
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
