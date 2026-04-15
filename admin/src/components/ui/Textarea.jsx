import { authService } from "../../services/auth";
import { podeIgnorarCamposObrigatorios } from "../../utils/constants";

/**
 * Componente de textarea reutilizável
 */
export default function Textarea({
  label,
  value,
  onChange,
  placeholder = "",
  required = false,
  disabled = false,
  rows = 4,
  error = "",
  className = "",
  maxLength = 2000,
  ...props
}) {
  const isRequired = required && !podeIgnorarCamposObrigatorios(authService.getUser());

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-tegra-text-secondary mb-2">
          {label}
          {isRequired && <span className="text-tegra-error ml-1">*</span>}
        </label>
      )}
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={isRequired}
        aria-required={isRequired}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-tegra-teal transition ${
          error ? "border-tegra-error" : "border-tegra-gray-medium"
        } ${
          disabled ? "bg-tegra-gray-light cursor-not-allowed" : ""
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-tegra-error">{error}</p>}
    </div>
  );
}
