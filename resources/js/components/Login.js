import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import "../../sass/Login.scss";

function Login() {
    const location = useLocation();
    const navigate = useNavigate();

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        remember: false,
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        // Handle redirection notice (e.g., after 401 or logout)
        if (location.state?.from === "unauthorized") {
            setError("Unauthorized access. Please log in again.");
        }
    }, [location]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        setError("");

        try {
            // ✅ Step 1: Get CSRF cookie (required by Sanctum)
            await axios.get("/sanctum/csrf-cookie");

            // ✅ Step 2: Attempt login
            const response = await axios.post("/login", formData);

            if (response.data.redirect) {
                // ✅ Store the token safely (not exposed in logs)
                localStorage.setItem("token", response.data.token);

                // ✅ Redirect to dashboard
                window.location.href = response.data.redirect;
            } else {
                setError("Unexpected response from server.");
            }
        } catch (err) {
            if (err.response) {
                const { status, data } = err.response;
                if (status === 422) {
                    // Laravel validation or credential error
                    setErrors(data.errors || {});
                    if (data.errors?.username) {
                        setError(data.errors.username[0]);
                    }
                } else if (status === 403) {
                    setError("Access denied. Only admins can log in here.");
                } else if (status === 401) {
                    setError(
                        "Invalid username or password (401 Unauthorized).",
                    );
                } else {
                    setError("Unexpected error occurred. Please try again.");
                }
            } else {
                setError("Network error. Please check your connection.");
            }
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setErrors({});
        setError("");
        setFormData({ username: "", password: "", remember: false });
    };

    return (
        <div className="landing-page">
            {/* HEADER */}
            <header className="header">
                <div className="header-container">
                    <h1 className="logo">EduTech Management</h1>
                    <button
                        className="btn-admin-login"
                        onClick={() => setShowModal(true)}
                    >
                        Admin log in
                    </button>
                </div>
            </header>

            {/* HERO SECTION */}
            <section className="hero-section">
                <div className="hero-overlay">
                    <div className="hero-content">
                        <h2 className="hero-title">Welcome to</h2>
                        <h3 className="hero-subtitle">
                            Educational Tech Management
                        </h3>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="footer">
                <div className="footer-container">
                    <div className="contact-info">
                        <p className="contact-label">CONTACT US:</p>
                        <p className="contact-detail">
                            Tel Nos: +63 9639126633
                        </p>
                        <p className="contact-email">
                            Email: AKademi@edutech.com
                        </p>
                    </div>
                </div>
            </footer>

            {/* LOGIN MODAL */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-card login-modal-card">
                        <div className="modal-header-row">
                            <div className="modal-close" onClick={closeModal}>
                                <svg viewBox="0 0 24 24">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </div>
                        </div>

                        <div className="graduation-cap-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
                            </svg>
                        </div>

                        <h4 className="modal-title">Administrator Log In</h4>

                        <form className="login-form" onSubmit={handleSubmit}>
                            {errors.general && (
                                <div className="alert-error">
                                    {errors.general}
                                </div>
                            )}

                            <div className="form-group">
                                <input
                                    type="text"
                                    name="username"
                                    placeholder="Username"
                                    className={`form-input ${
                                        errors.username ? "input-error" : ""
                                    }`}
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                    autoComplete="username"
                                />
                                {errors.username && (
                                    <span className="error-message">
                                        {errors.username[0]}
                                    </span>
                                )}
                            </div>

                            <div className="form-group">
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Password"
                                    className={`form-input ${
                                        errors.password ? "input-error" : ""
                                    }`}
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    autoComplete="current-password"
                                />
                                {errors.password && (
                                    <span className="error-message">
                                        {errors.password[0]}
                                    </span>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="btn-submit"
                                disabled={loading}
                            >
                                {loading ? "Logging in..." : "Log in"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ERROR MESSAGE */}
            {error && <div className="alert alert-warning">{error}</div>}
        </div>
    );
}

export default Login;
