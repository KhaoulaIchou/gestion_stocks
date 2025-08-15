// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MachineStockList from "./components/MachineStockList";
import DestinationList from "./components/DestinationList";
import DelivreeMachineList from "./components/DelivreeMachineList";
import HistoryList from "./components/HistoryList";
import Login from "./components/Login";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./ProtectedRoute";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="p-8 max-w-6xl mx-auto">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MachineStockList />
                </ProtectedRoute>
              }
            />
            <Route path="/destinations" element={<ProtectedRoute><DestinationList /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><HistoryList /></ProtectedRoute>} />
            <Route path="/delivrees" element={<ProtectedRoute><DelivreeMachineList /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
export default App;
