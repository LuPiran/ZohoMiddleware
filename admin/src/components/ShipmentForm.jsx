import { useState } from "react";
import axios from "axios";

export default function ShipmentForm() {
  const [clientId, setClientId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [base64, setBase64] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await axios.post("http://localhost:3000/api/upload-invoice", {
        clientId,
        orderId,
        base64,
      });

      setMessage("✅ Arquivo enviado com sucesso");
      setClientId("");
      setOrderId("");
      setBase64("");
    } catch (error) {
      setMessage("❌ Erro ao enviar arquivo");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-lg">
      <h1 className="text-2xl font-semibold text-center mb-6">
        Envio de Invoice (UPS)
      </h1>

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
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">ID do Pedido</label>
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
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
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          {loading ? "Enviando ..." : "Enviar"}
        </button>

        {message && <p className="text-center text-sm mt-2">{message}</p>}
      </form>
    </div>
  );
}
