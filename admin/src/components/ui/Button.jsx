/**
 * Componente de botão reutilizável
 */
export default function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  onClick,
  className = "",
  ...props
}) {
  const baseClasses =
    "font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

  const variants = {
    primary:
      "bg-tegra-blue text-white hover:bg-tegra-blue-dark focus:ring-tegra-blue",
    secondary:
      "bg-white text-tegra-blue-dark border-2 border-tegra-blue-dark hover:bg-tegra-blue-light hover:text-white focus:ring-tegra-blue",
    danger: "bg-tegra-error text-white hover:bg-red-700 focus:ring-tegra-error",
    teal: "bg-tegra-teal text-white hover:bg-tegra-teal-dark focus:ring-tegra-teal",
  };

  const sizes = {
    sm: "px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm",
    md: "px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base",
    lg: "px-4 sm:px-6 py-2 sm:py-3 text-base sm:text-lg",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Carregando...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
