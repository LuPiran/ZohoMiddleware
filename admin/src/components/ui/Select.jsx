import ReactSelect from "react-select";
import { useMemo, useEffect } from "react";

/**
 * Componente de Select reutilizável usando react-select com design customizado
 */
export default function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Selecione uma opção",
  disabled = false,
  required = false,
  error = "",
  className = "",
  loading = false,
  ...props
}) {
  // Mapeia as opções para o formato do react-select
  const mappedOptions = useMemo(() => {
    return options.map((option) => {
      const optValue = option.value || option.nome || option;
      const optLabel = option.label || option.nome || option;
      return {
        value: optValue,
        label: optLabel,
        id: option.id,
        nome: option.nome || optValue,
      };
    });
  }, [options]);

  // Converte o valor para o formato do react-select
  const selectedValue = useMemo(() => {
    if (!value || !mappedOptions || mappedOptions.length === 0) return null;

    const found = mappedOptions.find((opt) => {
      return (
        String(opt.value) === String(value) ||
        String(opt.nome) === String(value)
      );
    });

    return found || null;
  }, [value, mappedOptions]);

  // Handler para mudança de valor
  const handleChange = (selectedOption) => {
    if (onChange && selectedOption) {
      // Passa o objeto completo da opção selecionada para permitir acesso ao ID
      const event = {
        target: {
          value: selectedOption.value || selectedOption.nome || selectedOption,
        },
        // Adiciona a opção completa para acesso ao ID e outros dados
        selectedOption: selectedOption,
      };
      onChange(event);
    } else if (onChange && !selectedOption) {
      // Quando deseleciona (null)
      const event = {
        target: {
          value: "",
        },
        selectedOption: null,
      };
      onChange(event);
    }
  };

  // Estilos customizados para react-select usando cores do tema TegraPharma
  const customStyles = {
    control: (base, state) => ({
      ...base,
      border: "1px solid",
      borderColor: error
        ? "#f44336" // tegra-error
        : "#e0e0e0", // tegra-gray-medium (mesma cor dos outros campos)
      borderRadius: "0.5rem",
      backgroundColor: "#ffffff", // fundo branco
      boxShadow: "none",
      minHeight: "42px",
      "&:hover": {
        borderColor: error ? "#f44336" : "#e0e0e0", // mantém a mesma cor no hover
      },
      ...(state.isFocused && {
        borderColor: error ? "#f44336" : "#E5989B", // tegra-teal (mesma cor de foco dos outros campos)
        boxShadow: "0 0 0 2px rgba(229, 152, 155, 0.2)", // ring effect como nos outros campos
      }),
      ...(disabled && {
        backgroundColor: "#f5f5f5", // tegra-gray-light
        cursor: "not-allowed",
        opacity: 0.5,
      }),
    }),
    placeholder: (base) => ({
      ...base,
      color: "#666666", // tegra-text-secondary
      fontSize: "0.875rem",
    }),
    singleValue: (base) => ({
      ...base,
      color: "#1a2f5b", // tegra-blue-dark
      fontWeight: "700",
      fontSize: "0.875rem",
    }),
    input: (base) => ({
      ...base,
      color: "#1a2f5b", // tegra-blue-dark
      fontWeight: "700",
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "#ffffff", // fundo branco
      border: "1px solid #e0e0e0",
      borderRadius: "0.5rem",
      boxShadow:
        "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      marginTop: "4px",
      zIndex: 9999,
    }),
    menuList: (base) => ({
      ...base,
      padding: "0",
      maxHeight: "200px",
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#4d6fa9" // tegra-blue-light
        : state.isFocused
          ? "#e8f0f8" // azul claro para hover (mais claro que tegra-blue-dark)
          : "transparent",
      color: "#1a2f5b", // tegra-blue-dark (sempre azul escuro)
      fontWeight: "700",
      fontSize: "0.875rem",
      padding: "10px 12px",
      cursor: "pointer",
      "&:active": {
        backgroundColor: state.isSelected ? "#4d6fa9" : "#e8f0f8",
      },
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: "#000000",
      padding: "8px",
      "&:hover": {
        color: "#000000",
      },
    }),
    loadingIndicator: (base) => ({
      ...base,
      color: "#1a2f5b",
    }),
    noOptionsMessage: (base) => ({
      ...base,
      color: "#666666",
      fontSize: "0.875rem",
      padding: "12px",
    }),
  };

  // Adiciona estilos CSS globais para o scrollbar do select
  useEffect(() => {
    const styleId = "tegra-select-scrollbar-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .tegra-select__menu-list::-webkit-scrollbar {
          width: 8px;
        }
        .tegra-select__menu-list::-webkit-scrollbar-track {
          background: #f5f5f5;
          border-radius: 4px;
        }
        .tegra-select__menu-list::-webkit-scrollbar-thumb {
          background: #1a2f5b;
          border-radius: 4px;
        }
        .tegra-select__menu-list::-webkit-scrollbar-thumb:hover {
          background: #8FA9C1;
        }
        /* Para Firefox */
        .tegra-select__menu-list {
          scrollbar-width: thin;
          scrollbar-color: #1a2f5b #f5f5f5;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-tegra-text-secondary mb-2">
          {label}
          {required && <span className="text-tegra-error ml-1">*</span>}
        </label>
      )}
      <ReactSelect
        value={selectedValue}
        onChange={handleChange}
        options={mappedOptions}
        placeholder={loading ? "Carregando..." : placeholder}
        isDisabled={disabled || loading}
        isLoading={loading}
        isSearchable={true}
        styles={customStyles}
        className={className}
        classNamePrefix="tegra-select"
        menuPortalTarget={document.body}
        menuPlacement="auto"
        {...props}
      />
      {error && <p className="mt-1 text-sm text-tegra-error">{error}</p>}
    </div>
  );
}
