/**
 * Componente de checkbox reutilizável
 */
export default function Checkbox({
  id,
  label,
  checked,
  onChange,
  disabled = false,
  className = "",
  ...props
}) {
  return (
    <div className={`flex items-center ${className}`}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={`w-4 h-4 rounded border-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed appearance-none ${
          checked
            ? "bg-tegra-blue border-tegra-blue"
            : "bg-tegra-bg-primary border-tegra-gray-medium"
        } focus:ring-2 focus:ring-tegra-blue focus:ring-offset-0`}
        style={{
          ...(checked && {
            backgroundImage: `url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L4 12.586l7.793-7.793a1 1 0 011.414 0z'/%3e%3c/svg%3e")`,
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }),
        }}
        {...props}
      />
      {label && (
        <label
          htmlFor={id}
          className={`ml-2 text-sm text-tegra-text-secondary cursor-pointer select-none ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {label}
        </label>
      )}
    </div>
  );
}
