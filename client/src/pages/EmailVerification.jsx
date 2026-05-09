import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import axios from "../api/axios";

function EmailVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      verifyEmail(token);
    } else {
      setStatus("error");
      setMessage("Invalid verification link");
    }
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      await axios.post("/api/auth/verify-email", { token });

      setStatus("success");
      setMessage("Email verified successfully! You can now log in to your account.");
    } catch (error) {
      setStatus("error");
      setMessage(error.response?.data?.error || "Verification failed");
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "verifying":
        return <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>;
      case "success":
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case "error":
        return <XCircle className="w-8 h-8 text-red-500" />;
      default:
        return <AlertCircle className="w-8 h-8 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "text-green-700 bg-green-50 border-green-200";
      case "error":
        return "text-red-700 bg-red-50 border-red-200";
      default:
        return "text-blue-700 bg-blue-50 border-blue-200";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="relative w-16 h-16">
              <div className="absolute top-3 left-3 w-10 h-4 bg-gray-300 rounded-sm"></div>
              <div className="absolute top-8 left-3 w-8 h-4 bg-blue-300 rounded-sm"></div>
              <div className="absolute top-3 left-3 w-4 h-10 bg-indigo-300 rounded-sm"></div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Verification</h1>
          <p className="text-gray-600">Verifying your email address</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            
            <div className={`p-4 rounded-lg border ${getStatusColor()} mb-6`}>
              <p className="text-sm font-medium">{message}</p>
            </div>

            {status === "success" && (
              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Your email has been verified successfully. You can now access all features of FlowFrame.
                </p>
                <Button
                  onClick={() => navigate("/login")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Continue to Login
                </Button>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  There was an issue verifying your email. This could be due to an expired or invalid link.
                </p>
                <div className="space-y-2">
                  <Button
                    onClick={() => navigate("/login")}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Go to Login
                  </Button>
                  <Link
                    to="/signup"
                    className="block w-full text-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Create New Account
                  </Link>
                </div>
              </div>
            )}

            {status === "verifying" && (
              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Please wait while we verify your email address...
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Need help? Contact our support team.</p>
        </div>
      </div>
    </div>
  );
}

export default EmailVerification; 