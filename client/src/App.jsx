import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Layout/Navbar.jsx";
import AnalyticsDashboard from "./pages/AnalyticsDashboard.jsx";
import Boards from "./pages/Boards.jsx";
import SprintBoard from "./pages/SprintBoard.jsx";
import Epic from "@/pages/Epic.jsx";
import Backlog from "./pages/Backlog.jsx";
import TaskDetail from "./pages/TaskDetail.jsx";
import ForYou from "./pages/ForYou.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import EmailVerification from "./pages/EmailVerification.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Profile from "./pages/Profile.jsx";


function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Auth Route Component (redirects to home if already logged in)
function AuthRoute({ children }) {
  const token = localStorage.getItem("token");
  if (token) {
    return <Navigate to="/home" replace />;
  }
  return children;
}

function ProjectManagerRoute({ children }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user.roles || !user.roles.includes("project_manager")) {
    return <Navigate to="/home" replace />;
  }
  return children;
}

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup" || location.pathname === "/verify-email" || location.pathname === "/forgot-password" || location.pathname.startsWith("/reset-password");

  return (
    <div className="min-h-screen bg-gray-50">
      {!isAuthPage && <Navbar />}

      <div>
        <Routes>
          <Route 
            path="/" 
            element={
              localStorage.getItem("token") ? (
                <Navigate to="/home" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
          <Route path="/signup" element={<AuthRoute><Signup /></AuthRoute>} />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/forgot-password" element={<AuthRoute><ForgotPassword /></AuthRoute>} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/home" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
          <Route path="/for-you" element={<ProtectedRoute><ForYou /></ProtectedRoute>} />
          <Route path="/boards" element={<ProtectedRoute><Boards /></ProtectedRoute>} />
          <Route path="/sprints" element={<ProtectedRoute><SprintBoard /></ProtectedRoute>} />
          <Route path="/backlog" element={<ProtectedRoute><Backlog /></ProtectedRoute>} />
          <Route path="/task/:taskId" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />
          <Route path={"/epic-generator"} element={<ProtectedRoute><ProjectManagerRoute><Epic /></ProjectManagerRoute></ProtectedRoute>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div className="p-6">
                  <h1 className="text-2xl font-bold">
                    Dashboard - Coming Soon
                  </h1>
                </div>
              </ProtectedRoute>
            }
          />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route
            path="/sprint"
            element={
              <ProtectedRoute>
                <div className="p-6">
                  <h1 className="text-2xl font-bold">
                    Sprint Page - Coming Soon
                  </h1>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
