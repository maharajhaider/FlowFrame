import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Mail, Send, CheckCircle, AlertCircle, User } from "lucide-react";
import axios from "../api/axios";

function InviteUserForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const roles = [
    { value: "user", label: "User", description: "Basic user with limited permissions" },
    { value: "developer", label: "Developer", description: "Can create and manage tasks" },
    { value: "designer", label: "Designer", description: "Can work on design-related tasks" },
    { value: "tester", label: "Tester", description: "Can test and report issues" },
    { value: "project_manager", label: "Project Manager", description: "Can manage projects and invite users" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    try {
      await axios.post("/api/invites", { email, role });

      setMessage({
        type: "success",
        text: `Invitation sent successfully to ${email} as ${roles.find(r => r.value === role)?.label}`,
      });
      setEmail("");
      setRole("user");
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to send invitation",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Invite Team Member
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-gray-700 font-medium text-sm">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-9 text-sm"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="role" className="text-gray-700 font-medium text-sm">
            Role
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
            <Select value={role} onValueChange={setRole} disabled={isLoading}>
              <SelectTrigger className="pl-10 h-9 text-sm">
                <SelectValue>
                  {roles.find((r) => r.value === role)?.label || "Select a role"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {roles.map((roleOption) => (
                  <SelectItem key={roleOption.value} value={roleOption.value}>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{roleOption.label}</span>
                      <span className="text-xs text-gray-500">{roleOption.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {message.text && (
          <div
            className={`flex items-center gap-2 p-2 rounded-md text-xs ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            <span className="text-xs">{message.text}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading || !email}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Sending...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Send className="h-3 w-3" />
              <span>Send Invitation</span>
            </div>
          )}
        </Button>
      </form>

      <div className="mt-3 text-xs text-gray-600">
        <p>
          The invited user will receive an email with a link to create their account.
          They will be assigned the selected role and need to verify their email address before they can log in.
        </p>
      </div>
    </div>
  );
}

export default InviteUserForm; 