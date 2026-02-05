/**
 * Componente de alerta reutilizável
 */
export default function Alert({ type = "info", message, className = "" }) {
  const variants = {
    success: "bg-tegra-success-light border-tegra-success text-tegra-success",
    error: "bg-tegra-error-light border-tegra-error text-tegra-error",
    warning: "bg-tegra-warning-light border-tegra-warning text-tegra-warning",
    info: "bg-tegra-info-light border-tegra-info text-tegra-info",
  };

  if (!message) return null;

  return (
    <div
      className={`border px-4 py-3 rounded-lg text-sm ${variants[type]} ${className}`}
    >
      {message}
    </div>
  );
}
