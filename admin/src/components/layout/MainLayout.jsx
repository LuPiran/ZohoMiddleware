import Header from "./Header";
import Navbar from "./Navbar";

/**
 * Layout principal da aplicação
 * Inclui Header e Navbar
 */
export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-tegra-bg-secondary">
      <Header />
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
