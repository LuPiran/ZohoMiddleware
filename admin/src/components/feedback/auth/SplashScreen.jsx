import logo from "../../../assets/LogoTegra.png";

/**
 * Componente de Splash Screen
 * Tela de carregamento reutilizável
 */
export default function SplashScreen({ message = "Carregando...", className = "" }) {
  return (
    <div className={`splash-overlay ${className}`}>
      <div className="splash-card">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <div className="splash-ring"></div>
          <div className="splash-ring splash-ring--slow"></div>

          <div className="relative z-10">
            <img
              src={logo}
              alt="Logo TegraPharma"
              className="h-20 w-auto object-contain"
            />
          </div>
        </div>

        {message && (
          <div className="flex flex-col items-center gap-3">
            <p className="splash-message">{message}</p>
            <div className="splash-dots" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
