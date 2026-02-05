/**
 * Componente de input reutilizável
 */
export default function Input({
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
  required = false,
  disabled = false,
  error = "",
  className = "",
  icon,
  iconRight,
  onIconClick,
  ...props
}) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-tegra-text-secondary mb-2">
          {label}
          {required && <span className="text-tegra-error ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tegra-text-secondary">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full border rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-tegra-teal transition ${
            icon ? "pl-10" : "px-3"
          } ${iconRight ? "pr-10" : ""} ${
            error ? "border-tegra-error" : "border-tegra-gray-medium"
          } ${
            disabled ? "bg-tegra-gray-light cursor-not-allowed" : ""
          } ${className}`}
          {...props}
        />
        {iconRight && (
          <button
            type="button"
            onClick={onIconClick}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-tegra-text-secondary hover:text-tegra-text-primary transition cursor-pointer"
            tabIndex={-1}
          >
            {iconRight}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-tegra-error">{error}</p>}
    </div>
  );
}
