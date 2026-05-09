import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User, BarChart3, Kanban, Zap, List, Calendar, UserCheck } from "lucide-react";
import { CheckSquare } from "lucide-react";

const FlowFrameLogo = ({ size = 40, className = "" }) => (
  <div className={`relative ${className}`} style={{ width: size, height: size }}>
    <div className="absolute top-2 left-2 w-8 h-3 bg-gray-300 rounded-sm"></div>
    <div className="absolute top-5 left-2 w-6 h-3 bg-blue-300 rounded-sm"></div>
    <div className="absolute top-2 left-2 w-3 h-8 bg-indigo-300 rounded-sm"></div>
  </div>
);

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const isProjectManager = user && user.roles && user.roles.includes("project_manager");
  const isDeveloper = user && user.roles && user.roles.some(role => ["developer", "designer", "tester"].includes(role));

  const navigationItems = [
    { name: "Dashboard", path: "/home", icon: BarChart3 },
    ...(isProjectManager ? [{ name: "Epic", path: "/epic-generator", icon: CheckSquare }] : []),
    ...(isDeveloper ? [{ name: "For You", path: "/for-you", icon: UserCheck }] : []),
    { name: "Boards", path: "/boards", icon: Kanban },
    ...(isProjectManager ? [{ name: "Sprints", path: "/sprints", icon: Calendar }] : []),
    { name: "Backlog", path: "/backlog", icon: List },
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="w-full flex items-center justify-between px-12 py-3 bg-white border-b border-gray-200 shadow-sm">
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => handleNavigation("/home")}
      >
        <FlowFrameLogo size={40} className="group-hover:scale-105 transition-transform duration-200" />
        <span className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
          FlowFrame
        </span>
      </div>

      <div className="flex items-center gap-1">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.path)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive(item.path)
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                  : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
              }`}
            >
              <IconComponent size={16} />
              {item.name}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-semibold text-gray-800">
              {user.name}
            </span>
          </div>
        )}
        <button
          className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white hover:shadow-lg transition-all duration-200"
          onClick={() => handleNavigation("/profile")}
        >
          <User size={16} />
        </button>
      </div>
    </nav>
  );
}
