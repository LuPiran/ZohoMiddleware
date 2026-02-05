import { useState } from "react";
import { getInitials, getUserPhoto } from "../../utils/avatar";

/**
 * Componente de Avatar do usuário
 * Mostra a foto se disponível, senão mostra as iniciais
 */
export default function Avatar({ user, size = "md", className = "" }) {
  const foto = getUserPhoto(user);
  const nome =
    user?.nome || user?.Nome || user?.Name || user?.email || "Usuário";
  const iniciais = getInitials(nome);
  const [imageError, setImageError] = useState(false);

  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  };

  const sizeClass = sizes[size] || sizes.md;

  // Se não tem foto ou houve erro ao carregar, mostra as iniciais
  const showInitials = !foto || imageError;

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold text-tegra-text-inverse bg-tegra-teal overflow-hidden ${className}`}
    >
      {!showInitials && foto ? (
        <img
          src={foto}
          alt={nome}
          className="w-full h-full rounded-full object-cover"
          onError={() => {
            // Se a imagem falhar ao carregar, mostra as iniciais
            setImageError(true);
          }}
        />
      ) : (
        <span className="w-full h-full rounded-full flex items-center justify-center">
          {iniciais}
        </span>
      )}
    </div>
  );
}
