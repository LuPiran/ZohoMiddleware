import { BrowserRouter } from "react-router-dom";
import "./App.css";
import AppRoutes from "./routes/AppRoutes";
import { ToastProvider } from "./components/feedback/auth/ToastContainer";
import { LoadingProvider } from "./contexts/LoadingContext";
import { MenuProvider } from "./contexts/MenuContext";
import { UserProvider } from "./contexts/UserContext";
import RouteTransition from "./components/navigation/RouteTransition";
import { FaqOverlayProvider } from "./contexts/FaqOverlayContext";

function App() {
  return (
    <ToastProvider>
      <FaqOverlayProvider>
      <div className="flex min-h-screen w-full flex-1 flex-col">
        <LoadingProvider>
          <MenuProvider>
            <UserProvider>
              <BrowserRouter
                future={{
                  v7_relativeSplatPath: true,
                  v7_startTransition: true,
                }}
              >
                <RouteTransition>
                  <AppRoutes />
                </RouteTransition>
              </BrowserRouter>
            </UserProvider>
          </MenuProvider>
        </LoadingProvider>
      </div>
      </FaqOverlayProvider>
    </ToastProvider>
  );
}

export default App;
