import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Login from "./pages/Login";
import ShipmentFolders from "./pages/ShipmentFolders";
import ProtectedRoute from "./components/ProtectedRoute";
import { authService } from "./services/api";

function App() {
  return (
    <BrowserRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
    >
      <Routes>
        <Route
          path="/login"
          element={
            authService.isAuthenticated() ? (
              <Navigate to="/shipment-folders" replace />
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/shipment-folders"
          element={
            <ProtectedRoute>
              <ShipmentFolders />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/shipment-folders" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
