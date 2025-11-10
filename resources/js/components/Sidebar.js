import React from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    FileText,
    Settings,
    User,
} from "lucide-react";
import "../../sass/sidebar.scss";

function Sidebar() {
    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <Link to="/dashboard" className="brand">
                    <div className="brand-logo">🎓</div>
                    <div className="brand-text">
                        <div className="brand-title">M&P EduTech</div>
                        <div className="brand-subtitle">
                            Academic Management
                        </div>
                    </div>
                </Link>

                {/* Navigation */}
                <nav className="nav">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) =>
                            `nav-item ${isActive ? "active" : ""}`
                        }
                    >
                        <LayoutDashboard size={18} /> <span>Dashboard</span>
                    </NavLink>

                    <NavLink
                        to="/faculty"
                        className={({ isActive }) =>
                            `nav-item ${isActive ? "active" : ""}`
                        }
                    >
                        <Users size={18} /> <span>Faculty</span>
                    </NavLink>

                    <NavLink
                        to="/students"
                        className={({ isActive }) =>
                            `nav-item ${isActive ? "active" : ""}`
                        }
                    >
                        <GraduationCap size={18} /> <span>Students</span>
                    </NavLink>

                    <NavLink
                        to="/reports"
                        className={({ isActive }) =>
                            `nav-item ${isActive ? "active" : ""}`
                        }
                    >
                        <FileText size={18} /> <span>Reports</span>
                    </NavLink>

                    <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                            `nav-item ${isActive ? "active" : ""}`
                        }
                    >
                        <Settings size={18} /> <span>Settings</span>
                    </NavLink>

                    <NavLink
                        to="/profile"
                        className={({ isActive }) =>
                            `nav-item ${isActive ? "active" : ""}`
                        }
                    >
                        <User size={18} /> <span>Admin</span>
                    </NavLink>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="main">
                <Outlet />
            </main>
        </div>
    );
}

export default Sidebar;
