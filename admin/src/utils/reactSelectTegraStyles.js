/**
 * Estilos do react-select alinhados à paleta Tegra (bordas arredondadas, hover, foco).
 * @param {{ menuPortalZIndex?: number }} [opts]
 */
export function getTegraSelectStyles(opts = {}) {
  const menuPortalZIndex = opts.menuPortalZIndex ?? 100;
  const border = "#e0e0e0";
  const borderHover = "#8FA9C1";
  const borderFocus = "#3da2b8";
  const text = "#333333";
  const textMuted = "#666666";
  const bg = "#ffffff";
  const bgHover = "#f5f5f5";
  const bgSelected = "#e3f2fd";

  return {
    control: (base, state) => ({
      ...base,
      minHeight: 42,
      borderRadius: "0.5rem",
      borderWidth: "1px",
      borderColor: state.isFocused ? borderFocus : border,
      boxShadow: state.isFocused ? `0 0 0 2px rgba(61, 162, 184, 0.25)` : "none",
      backgroundColor: bg,
      "&:hover": {
        borderColor: borderHover,
      },
      cursor: "pointer",
    }),
    valueContainer: (base) => ({
      ...base,
      paddingLeft: "0.625rem",
      paddingRight: "0.625rem",
    }),
    placeholder: (base) => ({
      ...base,
      color: textMuted,
      fontSize: "0.875rem",
    }),
    singleValue: (base) => ({
      ...base,
      color: text,
      fontSize: "0.875rem",
    }),
    input: (base) => ({
      ...base,
      color: text,
    }),
    menu: (base) => ({
      ...base,
      borderRadius: "0.5rem",
      border: `1px solid ${border}`,
      boxShadow: "0 10px 25px rgba(26, 47, 91, 0.12)",
      overflow: "hidden",
      zIndex: menuPortalZIndex,
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: menuPortalZIndex,
    }),
    menuList: (base) => ({
      ...base,
      padding: "0.25rem",
    }),
    option: (base, state) => ({
      ...base,
      borderRadius: "0.375rem",
      fontSize: "0.875rem",
      backgroundColor: state.isSelected
        ? bgSelected
        : state.isFocused
          ? bgHover
          : bg,
      color: text,
      "&:active": {
        backgroundColor: bgHover,
      },
    }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base, state) => ({
      ...base,
      color: borderHover,
      "&:hover": { color: borderFocus },
      transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : undefined,
      transition: "transform 0.2s ease",
    }),
    clearIndicator: (base) => ({
      ...base,
      color: textMuted,
      "&:hover": { color: text },
    }),
  };
}
