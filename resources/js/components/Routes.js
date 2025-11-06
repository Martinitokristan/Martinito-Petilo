import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
    BrowserRouter as Router,
    Routes as RouterRoutes,
    Route,
    Navigate,
} from "react-router-dom";

import Login from "./Login";
import Dashboard from "./Dashboard";
import Settings from "./Settings";
import Sidebar from "./Sidebar";
import Students from "./Students";
import Faculty from "./Faculty";
import Report from "./Report";
import MyProfile from "./MyProfile";
import Unauthorized from "./Unauthorized";
import axios from "axios";

// ✅ Secure ProtectedRoute using Sanctum session
function ProtectedRoute({ children }) {
    const [authorized, setAuthorized] = useState(null);

    useEffect(() => {
        axios
            .get("/api/user")
            .then(() => setAuthorized(true))
            .catch(() => setAuthorized(false));
    }, []);

    if (authorized === null) return null;
    if (!authorized) return <Navigate to="/401" replace />;
    return children;
}

function AppRoutes() {
    return (
        <Router>
            <RouterRoutes>
                {/* Public routes */}
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/401" element={<Unauthorized />} />

                {/* Protected routes */}
                <Route
                    element={
                        <ProtectedRoute>
                            <Sidebar />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/students" element={<Students />} />
                    <Route path="/faculty" element={<Faculty />} />
                    <Route path="/reports" element={<Report />} />
                    <Route path="/profile" element={<MyProfile />} />
                </Route>
            </RouterRoutes>
        </Router>
    );
}

export default AppRoutes;

const appElement = document.getElementById("tan");
if (appElement) {
    const root = createRoot(appElement);
    root.render(<AppRoutes />);
}
