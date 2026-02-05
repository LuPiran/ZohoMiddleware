import { NavLink } from "react-router-dom";
import {
  MdDashboard,
  MdPeople,
  MdShoppingCart,
  MdAssignment,
  MdReport,
} from "react-icons/md";
import { ROUTES } from "../../utils/constants";

/**
 * Componente de Navegação
 */
export default function Navbar() {
  const navItems = [
    {
      path: ROUTES.DASHBOARD,
      label: "Dashboard",
      icon: <MdDashboard className="text-xl" />,
    },
    {
      path: ROUTES.USUARIOS,
      label: "Usuários",
      icon: <MdPeople className="text-xl" />,
    },
    {
      path: ROUTES.RECOMPRA,
      label: "Recompra",
      icon: <MdShoppingCart className="text-xl" />,
    },
    {
      path: ROUTES.COMPRA,
      label: "Compra",
      icon: <MdAssignment className="text-xl" />,
    },
    {
      path: ROUTES.OCORRENCIA,
      label: "Ocorrência",
      icon: <MdReport className="text-xl" />,
    },
  ];

  return (
    <nav className="bg-tegra-bg-primary border-b border-tegra-gray-medium">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  isActive
                    ? "text-tegra-blue-dark border-tegra-blue-dark"
                    : "text-tegra-text-secondary border-transparent hover:text-tegra-blue-dark hover:border-tegra-blue-dark"
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
