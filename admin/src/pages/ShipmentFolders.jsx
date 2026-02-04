import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/api";
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://zohomiddleware-x12ad.sevalla.app";

export default function ShipmentFolders() {
  const [clientId, setClientId] = useState("");
  const [base64, setBase64] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // Verifica se está autenticado ao montar o componente
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate("/login");
    }
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post(`${API_BASE_URL}/api/upload`, {
        clientId,
        base64,
      });

      if (response.data.success) {
        setMessage("✅ Arquivo enviado com sucesso");
        setClientId("");
        setBase64("");
      } else {
        setMessage("❌ Erro ao enviar arquivo");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "Erro ao enviar arquivo";
      setMessage(`❌ ${errorMessage}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    authService.logout();
    navigate("/login");
  }

  const user = authService.getUser();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800">
            Shipment Folders
          </h1>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm font-medium text-gray-700">
                {user.nome ||
                  user.Nome ||
                  user.Name ||
                  user.email ||
                  user.Email ||
                  "Usuário"}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-lg mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-6">
            Envio de Invoice (UPS)
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                ID do Cliente
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
                placeholder="ID do cliente no Zoho CRM"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Base64 do Arquivo
              </label>
              <textarea
                rows="6"
                value={base64}
                onChange={(e) => setBase64(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
                placeholder="Cole aqui o Base64 retornado pela UPS"
                required
              />
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Enviando ..." : "Enviar"}
            </button>

            {message && <p className="text-center text-sm mt-2">{message}</p>}
          </form>
        </div>
      </main>
    </div>
  );
}
