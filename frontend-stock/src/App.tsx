import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
//import AddMachine from "./components/AddMachine";
import MachineStockList from "./components/MachineStockList";
import DestinationList from "./components/DestinationList";
import DelivreeMachineList from "./components/DelivreeMachineList"
import HistoryList from "./components/HistoryList";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {/* NAVBAR */}
        <header className="bg-white shadow">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">Gestion de Stock</h1>
            <nav className="space-x-6">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive
                    ? "text-blue-600 font-semibold underline"
                    : "text-gray-600 hover:text-blue-500"
                }
              >
                Stock
              </NavLink>
              <NavLink
                to="/destinations"
                className={({ isActive }) =>
                  isActive
                    ? "text-blue-600 font-semibold underline"
                    : "text-gray-600 hover:text-blue-500"
                }
              >
                Destinations
              </NavLink>
              <NavLink
                to="/history"
                className={({ isActive }) =>
                  isActive
                    ? "text-blue-600 font-semibold underline"
                    : "text-gray-600 hover:text-blue-500"
                }
              >
                Historique
            </NavLink>
            <NavLink to="/delivrees" className={({ isActive }) =>
              isActive ? "text-blue-600 font-semibold underline" : "text-gray-600 hover:text-blue-500"
            }>
              Machines délivrées
            </NavLink>
            </nav>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="p-8 max-w-6xl mx-auto">
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <MachineStockList />
                </>
              }
            />
            <Route path="/destinations" element={<DestinationList />} />
            <Route path="/history" element={<HistoryList />} />
            <Route path="/delivrees" element={<DelivreeMachineList />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
