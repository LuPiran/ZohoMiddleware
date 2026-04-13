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
  iconRightDisabled = false,
  iconClear,
  onClearClick,
  showIconClear = false,
  ...props
}) {
  return (
    <div>
      {label && (
        <label className="block text-xs sm:text-sm font-medium text-tegra-text-secondary mb-1.5 sm:mb-2">
          {label}
          {required && <span className="text-tegra-error ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-tegra-text-secondary">
            <div className="text-base sm:text-xl">{icon}</div>
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          aria-required={required}
          disabled={disabled}
          className={`w-full border rounded-lg py-2 sm:py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-tegra-teal transition ${
            icon ? "pl-9 sm:pl-10" : "px-2.5 sm:px-3"
          } ${
            showIconClear && iconClear && iconRight
              ? "pr-16 sm:pr-20"
              : showIconClear && iconClear
                ? "pr-9 sm:pr-10"
                : iconRight
                  ? "pr-9 sm:pr-10"
                  : ""
          } ${
            error ? "border-tegra-error" : "border-tegra-gray-medium"
          } ${
            disabled ? "bg-tegra-gray-light cursor-not-allowed" : ""
          } ${className}`}
          {...props}
        />
        {showIconClear && iconClear && (
          <button
            type="button"
            onClick={onClearClick}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-tegra-text-secondary hover:text-tegra-error cursor-pointer transition z-10"
            tabIndex={-1}
            aria-label="Limpar campo"
          >
            <div className="text-base sm:text-xl">{iconClear}</div>
          </button>
        )}
        {iconRight && (
          <button
            type="button"
            onClick={onIconClick}
            disabled={iconRightDisabled}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition z-10 ${
              iconRightDisabled
                ? "text-tegra-gray-medium cursor-not-allowed opacity-50"
                : "text-tegra-text-secondary hover:text-tegra-text-primary cursor-pointer"
            }`}
            tabIndex={-1}
          >
            <div className="text-base sm:text-xl">{iconRight}</div>
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-tegra-error">{error}</p>}
    </div>
  );
}
