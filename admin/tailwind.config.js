/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Cores Principais da Logo
        tegra: {
          // Azul Principal
          blue: {
            DEFAULT: "#2E4A86",
            light: "#4D6FA9",
            dark: "#1A2F5B",
          },
          // Verde-Água Principal
          teal: {
            DEFAULT: "#21B3B3",
            light: "#4ECDC4",
            dark: "#1A8A8A",
          },
          // Verde-Azulado Secundário
          "blue-green": {
            DEFAULT: "#3DA2B8",
            light: "#5DB8C8",
            dark: "#2D7A8A",
          },
          // Cinza Escuro
          gray: {
            DEFAULT: "#666666",
            light: "#F5F5F5",
            medium: "#E0E0E0",
            dark: "#333333",
          },
          // Cores de Feedback
          success: {
            DEFAULT: "#4CAF50",
            light: "#E8F5E9",
          },
          error: {
            DEFAULT: "#F44336",
            light: "#FFEBEE",
          },
          warning: {
            DEFAULT: "#FFC107",
            light: "#FFF8E1",
          },
          info: {
            DEFAULT: "#2196F3",
            light: "#E3F2FD",
          },
          // Backgrounds
          bg: {
            primary: "#FFFFFF",
            secondary: "#F5F5F5",
            accent: "#E3F2FD",
          },
          // Texto
          text: {
            primary: "#333333",
            secondary: "#666666",
            light: "#999999",
            inverse: "#FFFFFF",
          },
        },
      },
    },
  },
  plugins: [],
};
