// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Historial from "./pages/Historial";

import "./App.css";

function App() {
  return (
    <Router>
      <div className="layout">
        <Sidebar />

        <main className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/historial" element={<Historial />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;