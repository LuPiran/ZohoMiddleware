import logo from "../../../assets/Logo-TegraPharma.webp";

/**
 * Componente de Splash Screen
 * Tela de carregamento reutilizável
 */
export default function SplashScreen({ message = "Carregando..." }) {
  return (
    <div className="fixed inset-0 bg-tegra-bg-primary flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6">
        {/* Logo com círculo girando em volta */}
        <div className="relative w-40 h-40 flex items-center justify-center">
          {/* Círculo girando em volta */}
          <div className="absolute inset-0 border-4 border-tegra-teal border-t-transparent rounded-full animate-spin"></div>

          {/* Logo no centro */}
          <div className="relative z-10">
            <img
              src={logo}
              alt="Logo TegraPharma"
              className="h-20 w-auto object-contain"
            />
          </div>
        </div>

        {/* Mensagem opcional */}
        {message && (
          <p className="text-tegra-text-secondary text-sm font-medium animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
