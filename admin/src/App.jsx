import { BrowserRouter } from "react-router-dom";
import "./App.css";
import AppRoutes from "./routes/AppRoutes";
import { ToastProvider } from "./components/feedback/auth/ToastContainer";

function App() {
  return (
    <ToastProvider>
      <BrowserRouter
        future={{
          v7_relativeSplatPath: true,
          v7_startTransition: true,
        }}
      >
        <AppRoutes />
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
