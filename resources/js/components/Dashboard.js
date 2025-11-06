import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";
import { GraduationCap, Users, Building, BookOpen } from "lucide-react";
import "../../sass/dashboard.scss";
import { extractAcronym } from "./format";

// Secure helper — ensure Sanctum cookie exists before requests
const ensureCsrf = async () => {
    try {
        await axios.get("/sanctum/csrf-cookie");
    } catch (_) {
        console.warn("Failed to initialize CSRF cookie");
    }
};

function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total_students: 0,
        total_faculty: 0,
        total_departments: 0,
        total_courses: 0,
        students_by_course: [],
        faculty_by_department: [],
    });
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchStats = async () => {
            try {
                await ensureCsrf(); // 🔒 Secure CSRF protection
                const response = await axios.get("/api/dashboard");
                setStats(response.data);
            } catch (error) {
                setError("Error loading dashboard data");
                console.error("Error:", error);
                if (
                    error.response?.status === 401 ||
                    error.response?.status === 403
                ) {
                    window.location.href = "/login";
                }
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="page-loading">
                <div className="spinner"></div>
                <p>Loading Dashboard...</p>
            </div>
        );
    }

    const COLORS = ["#4f46e5", "#f59e0b", "#10b981", "#ef4444", "#3b82f6"];

    return (
        <div className="dashboard-content">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Overview</h1>
                    <p className="page-subtitle">
                        Welcome Back! Here's your system overview.
                    </p>
                </div>
            </header>

            {error && <div className="alert-error">{error}</div>}

            <section className="stats-cards">
                <div className="stat-card purple">
                    <div className="stat-icon">
                        <GraduationCap size={24} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-label">Students</div>
                        <div className="stat-value">{stats.total_students}</div>
                    </div>
                </div>

                <div className="stat-card orange">
                    <div className="stat-icon">
                        <Users size={24} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-label">Faculty</div>
                        <div className="stat-value">{stats.total_faculty}</div>
                    </div>
                </div>

                <div className="stat-card yellow">
                    <div className="stat-icon">
                        <Building size={24} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-label">Department</div>
                        <div className="stat-value">
                            {stats.total_departments}
                        </div>
                    </div>
                </div>

                <div className="stat-card navy">
                    <div className="stat-icon">
                        <BookOpen size={24} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-label">Courses</div>
                        <div className="stat-value">{stats.total_courses}</div>
                    </div>
                </div>
            </section>

            <div className="charts">
                <div className="chart-card">
                    <h3>Students per Course</h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart
                            data={stats.students_by_course.map((item) => ({
                                ...item,
                                label: extractAcronym(item.label) || item.label,
                            }))}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar
                                dataKey="count"
                                fill="#8b5cf6"
                                radius={[6, 6, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-card">
                    <h3>Faculty per Department</h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                            <Pie
                                data={stats.faculty_by_department.map(
                                    (item) => ({
                                        ...item,
                                        label:
                                            extractAcronym(item.label) ||
                                            item.label,
                                    }),
                                )}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="count"
                                nameKey="label"
                            >
                                {stats.faculty_by_department.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Legend />
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
