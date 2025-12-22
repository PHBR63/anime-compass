import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerCustomSW } from "./lib/serviceWorkerMessaging";

// Registra o Service Worker customizado para push notifications
registerCustomSW();

createRoot(document.getElementById("root")!).render(<App />);
