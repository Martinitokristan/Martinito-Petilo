import React, { useEffect, useMemo, useState } from "react";
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
    LineChart,
    Line,
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
        current_academic_year: null,
        course_distribution_year: null,
        students_by_course: [],
        faculty_by_department: [],
        students_over_time: [],
        student_growth: null,
        student_status_breakdown: {},
        faculty_status_breakdown: {},
        top_departments: [],
        idle_courses: [],
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

    const formatEnrolleeCount = (value) => {
        const numeric = Number(value);
        if (Number.isNaN(numeric)) {
            if (!value) {
                return "0";
            }
            return value;
        }
        return numeric.toLocaleString("en-US");
    };

    const activeLegendYear = useMemo(() => {
        if (!stats.students_over_time || stats.students_over_time.length === 0) {
            return null;
        }

        if (stats.current_academic_year) {
            const match = stats.students_over_time.find(
                (item) => item.label === stats.current_academic_year,
            );
            if (match) {
                return match.label;
            }
        }

        return stats.students_over_time[stats.students_over_time.length - 1].label;
    }, [stats.current_academic_year, stats.students_over_time]);

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
                        Welcome Back, Admin! Here's your system overview.
                    </p>
                </div>
            </header>

            {error && <div className="alert-error">{error}</div>}

            <section className="stats-cards">
                <div className="stat-card purple">
                    <div className="stat-icon">
                        <GraduationCap size={26} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Students</span>
                        <span className="stat-value">{formatEnrolleeCount(stats.total_students)}</span>
                    </div>
                </div>

                <div className="stat-card peach">
                    <div className="stat-icon">
                        <Users size={26} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Faculty</span>
                        <span className="stat-value">{formatEnrolleeCount(stats.total_faculty)}</span>
                    </div>
                </div>

                <div className="stat-card gold">
                    <div className="stat-icon">
                        <Building size={26} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Departments</span>
                        <span className="stat-value">{formatEnrolleeCount(stats.total_departments)}</span>
                    </div>
                </div>

                <div className="stat-card blue">
                    <div className="stat-icon">
                        <BookOpen size={26} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Courses</span>
                        <span className="stat-value">{formatEnrolleeCount(stats.total_courses)}</span>
                    </div>
                </div>
            </section>

            <div className="charts-grid">
                <div className="chart-card">
                    <div className="chart-header">
                        <div>
                            <h3>Students per Course</h3>
                            {(stats.course_distribution_year || stats.current_academic_year) && (
                                <p className="chart-subtitle">
                                    Distribution for {stats.course_distribution_year || stats.current_academic_year}
                                </p>
                            )}
                            {stats.course_distribution_year &&
                                stats.current_academic_year &&
                                stats.course_distribution_year !== stats.current_academic_year && (
                                    <p className="chart-note">
                                        Showing latest academic year with enrolments.
                                    </p>
                                )}
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={340}>
                        <BarChart
                            data={stats.students_by_course.map((item) => ({
                                ...item,
                                label: extractAcronym(item.label) || item.label,
                            }))}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip cursor={{ fill: "#f3f4ff" }} />
                            <Bar
                                dataKey="count"
                                fill="#6d28d9"
                                radius={[12, 12, 0, 0]}
                                barSize={42}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-card">
                    <div className="chart-header">
                        <h3>Faculty per Department</h3>
                        <p className="chart-subtitle">
                            Active faculty members across departments
                        </p>
                    </div>
                    <ResponsiveContainer width="100%" height={340}>
                        <PieChart>
                            <Pie
                                data={stats.faculty_by_department.map((item) => ({
                                    ...item,
                                    label: extractAcronym(item.label) || item.label,
                                }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={65}
                                outerRadius={120}
                                paddingAngle={4}
                                dataKey="count"
                                nameKey="label"
                            >
                                {stats.faculty_by_department.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                        stroke="#fff"
                                        strokeWidth={2}
                                    />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend
                                layout="vertical"
                                align="right"
                                verticalAlign="middle"
                                iconType="circle"
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="charts-grid single">
                <div className="chart-card">
                    <div className="chart-header">
                        <h3>Student Enrollees across Academic Years</h3>
                        <p className="chart-subtitle">
                            Track enrolment trends across recent academic years
                        </p>
                    </div>
                    <div className="chart-layout">
                        <div className="chart-visual">
                            {stats.students_over_time.length >= 2 ? (
                                <ResponsiveContainer width="100%" height={320}>
                                    <LineChart data={stats.students_over_time}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                        <Tooltip />
                                        <Line
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#f97316"
                                            strokeWidth={3}
                                            dot={(dotProps) => {
                                                const isActive =
                                                    activeLegendYear &&
                                                    dotProps.payload?.label === activeLegendYear;
                                                const radius = isActive ? 6 : 5;
                                                const fill = isActive ? "#0f172a" : "#ffffff";
                                                return (
                                                    <circle
                                                        cx={dotProps.cx}
                                                        cy={dotProps.cy}
                                                        r={radius}
                                                        stroke="#f97316"
                                                        strokeWidth={isActive ? 3 : 2}
                                                        fill={fill}
                                                    />
                                                );
                                            }}
                                            activeDot={{ r: 7, strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="chart-empty">
                                    Need at least two academic years to draw a trend line.
                                </div>
                            )}
                        </div>
                        <div className="chart-legend">
                            {stats.students_over_time.length > 0 ? (
                                <ul className="chart-legend-list">
                                    {stats.students_over_time.map((item, index) => (
                                        <li
                                            key={item.label || index}
                                            className={
                                                activeLegendYear && item.label === activeLegendYear
                                                    ? "active"
                                                    : ""
                                            }
                                        >
                                            <span className="legend-dot" />
                                            <div className="legend-text">
                                                <span className="legend-year">
                                                    {item.label || "N/A"}
                                                </span>
                                                <span className="legend-count">
                                                    The total enrollees in {item.label || "this academic year"} is {formatEnrolleeCount(item.count)}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="legend-empty">
                                    No enrolment records available yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <section className="status-panels">
                <div className="status-card">
                    <h3>Top Departments</h3>
                    <ul className="summary-list">
                        {stats.top_departments?.length ? (
                            stats.top_departments.map((dept) => (
                                <li key={dept.department_id}>
                                    <span>{dept.name}</span>
                                    <span className="summary-value">{formatEnrolleeCount(dept.active_students)} students</span>
                                </li>
                            ))
                        ) : (
                            <li className="empty">No departments found</li>
                        )}
                    </ul>
                </div>
                <div className="status-card">
                    <h3>Top Courses by Enrollees</h3>
                    <ul className="summary-list">
                        {stats.top_courses?.length ? (
                            stats.top_courses.map((course) => (
                                <li key={course.course_id}>
                                    <span>
                                        {course.name}
                                        {course.department_name
                                            ? ` (${course.department_name})`
                                            : ""}
                                    </span>
                                    <span className="summary-value">
                                        {formatEnrolleeCount(course.active_students)} students
                                    </span>
                                </li>
                            ))
                        ) : (
                            <li className="empty">No enrolment data available</li>
                        )}
                    </ul>
                </div>
            </section>
        </div>
    );
}

export default Dashboard;
