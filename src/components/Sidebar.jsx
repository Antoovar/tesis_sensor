import React from "react";
import { NavLink } from "react-router-dom";
import { Home, LayoutDashboard, History } from "lucide-react";
import "../App.css";

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Sensor</h2>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          <Home size={20} />
          <span>Inicio</span>
        </NavLink>

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/historial"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          <History size={20} />
          <span>Historial</span>
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;