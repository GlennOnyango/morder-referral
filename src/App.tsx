import "./App.css";
import Header from "./components/Header";
import AppSidebar from "./components/AppSidebar";
import LocalRoutes from "./LocalRoutes";
import { useAuthContext } from "./context/useAuthContext";

const App = () => {
  const { isAuthenticated } = useAuthContext();

  if (isAuthenticated) {
    return (
      <div className="app-layout">
        <AppSidebar />
        <main className="app-main">
          <LocalRoutes />
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-clip pb-16">
      <Header />
      <main className="mt-5 w-full px-3 md:px-8 lg:px-10">
        <LocalRoutes />
      </main>
    </div>
  );
};

export default App;
