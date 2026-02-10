import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Suprime logs HTTP 403 de conta inativa no console do navegador
// Intercepta antes que o React monte para capturar todos os logs
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

// Intercepta console.error para filtrar logs de erro 403 de login
console.error = (...args) => {
  const message = args.join(" ").toLowerCase();
  // Não loga se for erro 403 de login (conta inativa)
  if (
    message.includes("403") &&
    (message.includes("/v1/auth/login") || message.includes("forbidden"))
  ) {
    return;
  }
  originalError.apply(console, args);
};

// Intercepta console.warn também
console.warn = (...args) => {
  const message = args.join(" ").toLowerCase();
  // Não loga se for erro 403 de login (conta inativa)
  if (
    message.includes("403") &&
    (message.includes("/v1/auth/login") || message.includes("forbidden"))
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

// Intercepta console.log também (alguns navegadores logam erros HTTP aqui)
console.log = (...args) => {
  const message = args.join(" ").toLowerCase();
  // Não loga se for erro 403 de login (conta inativa)
  if (
    message.includes("403") &&
    (message.includes("/v1/auth/login") || message.includes("forbidden"))
  ) {
    return;
  }
  originalLog.apply(console, args);
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
