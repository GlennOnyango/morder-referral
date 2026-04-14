import "./App.css";
import Header from "./components/Header";
import LocalRoutes from "./LocalRoutes";

const App = () => (
  <div className="relative min-h-screen w-full overflow-x-clip pb-16">
    <Header />
    <main className="mt-5 w-full px-3 md:px-8 lg:px-10">
      <LocalRoutes />
    </main>
  </div>
);

export default App;
