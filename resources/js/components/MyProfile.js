import React, { useState, useEffect, useMemo } from "react";
import "../../sass/profile.scss";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const formatRelativeTime = (date) => {
    if (!date) return "";
    const diffMs = Date.now() - date.getTime();
    const tense = diffMs >= 0 ? "ago" : "from now";
    const absMs = Math.abs(diffMs);
    const totalSeconds = Math.floor(absMs / 1000);

    if (totalSeconds < 1) return diffMs >= 0 ? "Just now" : "In moments";
    if (totalSeconds < 60) return `${totalSeconds}s ${tense}`;

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes < 60) {
        const minuteLabel = `${minutes} minute${minutes === 1 ? "" : "s"}`;
        const secondLabel = seconds
            ? ` ${seconds.toString().padStart(2, "0")}s`
            : "";
        return `${minuteLabel}${secondLabel} ${tense}`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const hourLabel = `${hours} hour${hours === 1 ? "" : "s"}`;
    const minuteLabel = remainingMinutes
        ? ` ${remainingMinutes.toString().padStart(2, "0")}m`
        : "";
    const secondLabel = seconds
        ? ` ${seconds.toString().padStart(2, "0")}s`
        : "";
    if (hours < 24) return `${hourLabel}${minuteLabel}${secondLabel} ${tense}`;

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    const dayLabel = `${days} day${days === 1 ? "" : "s"}`;
    const hourPart = remainingHours
        ? ` ${remainingHours.toString().padStart(2, "0")}h`
        : "";
    const minutePart = remainingMinutes
        ? ` ${remainingMinutes.toString().padStart(2, "0")}m`
        : "";
    if (days < 30)
        return `${dayLabel}${hourPart}${minutePart}${secondLabel} ${tense}`;

    const months = Math.floor(days / 30);
    if (months < 12)
        return `${months} month${months === 1 ? "" : "s"} ${tense}`;

    const years = Math.floor(days / 365);
    return `${years} year${years === 1 ? "" : "s"} ${tense}`;
};

const getDateParts = (isoString) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return null;

    return {
        dateLabel: date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
        }),
        timeLabel: date.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
        }),
        relativeLabel: formatRelativeTime(date),
    };
};

const describeAgent = (agent) => {
    if (!agent) return "Unknown device";
    const lowered = agent.toLowerCase();
    if (lowered.includes("edg")) return "Microsoft Edge";
    if (lowered.includes("chrome")) return "Google Chrome";
    if (lowered.includes("firefox")) return "Mozilla Firefox";
    if (lowered.includes("safari") && !lowered.includes("chrome"))
        return "Safari";
    if (lowered.includes("opr") || lowered.includes("opera")) return "Opera";
    if (lowered.includes("msie") || lowered.includes("trident"))
        return "Internet Explorer";
    return agent;
};

function MyProfile() {
    const navigate = useNavigate();
    const DEFAULT_ROLE_DISPLAY = "System Administrator";

    // Ensure axios sends cookies for Sanctum session auth
    axios.defaults.withCredentials = true;

    const [profile, setProfile] = useState({
        first_name: "",
        last_name: "",
        email: "",
        role: DEFAULT_ROLE_DISPLAY,
        avatar: null,
        created_at: null,
        last_login_at: null,
        last_login_agent: null,
    });
    const [initialProfile, setInitialProfile] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [timeTick, setTimeTick] = useState(Date.now());
    const [isEditing, setIsEditing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState("");
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    // password-related transient fields (kept separate so we don't accidentally persist them)
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
    const [passwordValidation, setPasswordValidation] = useState({
        isValid: true,
        message: "",
        strength: "",
    });

    // Password validation function
    const validatePassword = (password) => {
        if (!password) {
            return { isValid: true, message: "", strength: "" };
        }

        const hasMinLength = password.length >= 8;
        const hasNumber = /\d/.test(password);
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        let strength = "";
        let strengthScore = 0;

        if (hasMinLength) strengthScore++;
        if (hasNumber) strengthScore++;
        if (hasUpperCase) strengthScore++;
        if (hasLowerCase) strengthScore++;
        if (hasSpecialChar) strengthScore++;

        if (strengthScore <= 2) strength = "Weak";
        else if (strengthScore === 3) strength = "Medium";
        else if (strengthScore >= 4) strength = "Strong";

        // Validation messages
        if (!hasMinLength) {
            return {
                isValid: false,
                message: "Password must be at least 8 characters",
                strength: "",
            };
        }
        if (!hasNumber) {
            return {
                isValid: false,
                message: "Password must contain at least one number",
                strength,
            };
        }

        return { isValid: true, message: "", strength };
    };

    // Handle password change with validation
    const handlePasswordChange = (value) => {
        setNewPassword(value);
        const validation = validatePassword(value);
        setPasswordValidation(validation);
    };

    useEffect(() => {
        loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const intervalId = setInterval(() => setTimeTick(Date.now()), 1000);
        return () => clearInterval(intervalId);
    }, []);

    const ensureCsrf = async () => {
        try {
            await axios.get("/sanctum/csrf-cookie");
        } catch (err) {
            console.warn("Failed to fetch CSRF cookie:", err);
        }
    };

    const loadProfile = async () => {
        setLoading(true);
        setError("");
        try {
            await ensureCsrf();

            const response = await axios.get("/api/profile", {
                withCredentials: true,
            });

            if (response.status === 401 || response.status === 403) {
                navigate("/401");
                return;
            }

            const data = response.data;
            const userProfile = {
                ...data.user,
                role: data.user.role || DEFAULT_ROLE_DISPLAY,
                email: data.user.email || "AKademi@edutech.com",
            };

            setProfile(userProfile);
            setInitialProfile(userProfile);

            // clear password fields if any
            setCurrentPassword("");
            setNewPassword("");
            setNewPasswordConfirmation("");
        } catch (err) {
            console.error("Error loading profile:", err);
            if (
                err.response &&
                (err.response.status === 401 || err.response.status === 403)
            ) {
                navigate("/401");
                return;
            }
            setError("Error loading profile");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfile((prev) => ({ ...prev, [name]: value }));
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfile((prev) => ({ ...prev, avatar: file }));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError("");

        try {
            await ensureCsrf();

            const formData = new FormData();
            formData.append("first_name", profile.first_name);
            formData.append("last_name", profile.last_name);
            formData.append("email", profile.email);

            // Avatar: only append if it's a File (i.e., user selected a new file)
            if (profile.avatar && typeof profile.avatar !== "string") {
                formData.append("avatar", profile.avatar);
            }

            // Append password fields only if user entered a new password (and/or current)
            if (newPassword) {
                // current_password is required_with:new_password on backend
                if (currentPassword) {
                    formData.append("current_password", currentPassword);
                }
                formData.append("new_password", newPassword);
                formData.append(
                    "new_password_confirmation",
                    newPasswordConfirmation,
                );
            }

            // Laravel accepts file uploads more reliably via POST + _method=PUT
            formData.append("_method", "PUT");

            const response = await axios.post("/api/profile", formData, {
                withCredentials: true,
                headers: {
                    Accept: "application/json",
                    "Content-Type": "multipart/form-data",
                },
            });

            if (response.status === 200 || response.status === 201) {
                const data = response.data;
                const updatedProfile = {
                    ...data.user,
                    role: data.user.role || DEFAULT_ROLE_DISPLAY,
                };

                setProfile(updatedProfile);
                setInitialProfile(updatedProfile);
                setCurrentPassword("");
                setNewPassword("");
                setNewPasswordConfirmation("");
                setError("");
                setIsEditing(false);
                setModalMessage("Profile updated successfully!");
                setShowModal(true);

                // Refresh profile data in the background
                fetchProfile().catch((refreshErr) => {
                    console.error("Failed to refresh profile", refreshErr);
                });
            } else {
                setError("Failed to update profile");
            }
        } catch (err) {
            console.error("Error updating profile:", err);
            if (err.response) {
                if (
                    err.response.status === 401 ||
                    err.response.status === 403
                ) {
                    navigate("/401");
                    return;
                }
                const data = err.response.data;
                if (data && data.errors) {
                    // Flatten the errors into a single message string
                    const messages = [];
                    Object.keys(data.errors).forEach((key) => {
                        if (Array.isArray(data.errors[key])) {
                            messages.push(...data.errors[key]);
                        } else if (typeof data.errors[key] === "string") {
                            messages.push(data.errors[key]);
                        }
                    });
                    setError(messages.join(" "));
                } else if (data && data.message) {
                    setError(data.message);
                } else {
                    setError("Error updating profile");
                }
            } else {
                setError("Network error updating profile");
            }
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setProfile(initialProfile);
        setIsEditing(false);
        setError("");
        setCurrentPassword("");
        setNewPassword("");
        setNewPasswordConfirmation("");
    };

    const handleLogoutClick = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = async () => {
        setShowLogoutModal(false);
        setLoggingOut(true);
        try {
            await ensureCsrf();
            await axios.post("/logout", {}, { withCredentials: true });
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            try {
                localStorage.removeItem("token");
                delete axios.defaults.headers.common["Authorization"];
            } catch (_) {}
            navigate("/login", { replace: true });
        }
    };

    const getAvatarUrl = (avatar) => {
        if (!avatar) return null;
        if (typeof avatar === "string") {
            // backend may return either a path (avatars/...) or full URL. If it's a path, prefix with /storage/
            if (
                avatar.startsWith("http://") ||
                avatar.startsWith("https://") ||
                avatar.startsWith("/storage/")
            ) {
                return avatar;
            }
            return `/storage/${avatar}`;
        }
        return URL.createObjectURL(avatar);
    };

    const createdParts = useMemo(
        () => getDateParts(profile.created_at),
        [profile.created_at, timeTick],
    );
    const lastLoginParts = useMemo(
        () => getDateParts(profile.last_login_at),
        [profile.last_login_at, timeTick],
    );
    const lastLoginDevice = describeAgent(profile.last_login_agent);

    if (loading) {
        return (
            <div className="profile-loading">
                <div className="spinner"></div>
                <p>Loading Profile...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Header Area */}
            <div className="profile-header">
                <div>
                    <h1 className="page-title">My Profile</h1>
                    <p className="page-subtitle subtle">
                        Update your personal details and contact information
                    </p>
                </div>
                <button
                    className="btn btn-danger log-out-top"
                    onClick={handleLogoutClick}
                >
                    <i className="fas fa-sign-out-alt"></i> Log out
                </button>
            </div>

            <div className="profile-main-content">
                <div className="profile-grid">
                    <div className="profile-card">
                        <div className="avatar">
                            {profile.avatar ? (
                                <img
                                    src={getAvatarUrl(profile.avatar)}
                                    alt="User Avatar"
                                />
                            ) : (
                                <div className="avatar-placeholder"></div>
                            )}
                        </div>
                        <h2 className="profile-name">
                            {profile.first_name || "AKademi"}
                        </h2>
                        <p className="profile-email">
                            {profile.email || "AKademi@edutech.com"}
                        </p>
                        <p className="profile-role admin">ADMIN</p>

                        {isEditing && (
                            <div className="avatar-upload-field below-role">
                                <label
                                    htmlFor="avatar-upload-input"
                                    className="btn btn-secondary btn-small"
                                >
                                    Change Avatar
                                </label>
                                <input
                                    id="avatar-upload-input"
                                    type="file"
                                    accept="image/png,image/jpeg"
                                    onChange={handleAvatarChange}
                                    style={{ display: "none" }}
                                />
                            </div>
                        )}

                        <div className="profile-meta">
                            <div className="meta-card login">
                                <h4>Last Login</h4>
                                {lastLoginParts ? (
                                    <>
                                        <div className="meta-date">
                                            {lastLoginParts.dateLabel}
                                        </div>
                                        <div className="meta-time">
                                            {lastLoginParts.timeLabel}
                                        </div>
                                        <div className="meta-relative">
                                            {lastLoginParts.relativeLabel}
                                        </div>
                                    </>
                                ) : (
                                    <div className="meta-empty">
                                        First session
                                    </div>
                                )}
                                <div className="meta-device">
                                    {lastLoginDevice}
                                </div>
                            </div>

                            <div className="meta-card created">
                                <h4>Account Created</h4>
                                {createdParts ? (
                                    <>
                                        <div className="meta-date">
                                            {createdParts.dateLabel}
                                        </div>
                                        <div className="meta-time">
                                            {createdParts.timeLabel}
                                        </div>
                                        <div className="meta-relative">
                                            {createdParts.relativeLabel}
                                        </div>
                                    </>
                                ) : (
                                    <div className="meta-empty">
                                        No creation date
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="card form-card">
                        <div className="form-row">
                            <label htmlFor="first_name">First Name</label>
                            <input
                                id="first_name"
                                type="text"
                                name="first_name"
                                value={profile.first_name}
                                onChange={handleInputChange}
                                readOnly={!isEditing}
                                className={!isEditing ? "read-only-input" : ""}
                            />
                        </div>

                        <div className="form-row">
                            <label htmlFor="last_name">Last Name</label>
                            <input
                                id="last_name"
                                type="text"
                                name="last_name"
                                value={profile.last_name}
                                onChange={handleInputChange}
                                readOnly={!isEditing}
                                className={!isEditing ? "read-only-input" : ""}
                            />
                        </div>

                        {/* Inline Change Password section (appears only when editing) */}
                        {isEditing && (
                            <>
                                <div
                                    className="form-note"
                                    style={{
                                        marginBottom: 8,
                                        color: "#6b7280",
                                    }}
                                >
                                    Leave password fields empty if you do not
                                    want to change your password.
                                </div>

                                <div className="form-row">
                                    <label htmlFor="current_password">
                                        Current Password
                                    </label>
                                    <input
                                        id="current_password"
                                        type="password"
                                        name="current_password"
                                        value={currentPassword}
                                        onChange={(e) =>
                                            setCurrentPassword(e.target.value)
                                        }
                                        className="form-input"
                                        placeholder="Enter current password"
                                    />
                                </div>

                                <div className="form-row">
                                    <label htmlFor="new_password">
                                        New Password
                                    </label>
                                    {newPassword &&
                                        !passwordValidation.isValid && (
                                            <div className="password-validation-error">
                                                {passwordValidation.message}
                                            </div>
                                        )}
                                    {newPassword &&
                                        passwordValidation.isValid &&
                                        passwordValidation.strength && (
                                            <div
                                                className={`password-strength-indicator ${passwordValidation.strength.toLowerCase()}`}
                                            >
                                                Password Strength:{" "}
                                                {passwordValidation.strength}
                                            </div>
                                        )}
                                    <input
                                        id="new_password"
                                        type="password"
                                        name="new_password"
                                        value={newPassword}
                                        onChange={(e) =>
                                            handlePasswordChange(e.target.value)
                                        }
                                        className={`form-input ${
                                            newPassword &&
                                            !passwordValidation.isValid
                                                ? "invalid-input"
                                                : ""
                                        }`}
                                        placeholder="Enter new password (min 8 chars)"
                                    />
                                </div>

                                <div className="form-row">
                                    <label htmlFor="new_password_confirmation">
                                        Confirm New Password
                                    </label>
                                    {newPasswordConfirmation && newPassword && (
                                        <div
                                            className={`password-match-indicator ${
                                                newPasswordConfirmation ===
                                                newPassword
                                                    ? "match"
                                                    : "no-match"
                                            }`}
                                        >
                                            {newPasswordConfirmation ===
                                            newPassword
                                                ? " Passwords match"
                                                : " Passwords do not match"}
                                        </div>
                                    )}
                                    <input
                                        id="new_password_confirmation"
                                        type="password"
                                        name="new_password_confirmation"
                                        value={newPasswordConfirmation}
                                        onChange={(e) =>
                                            setNewPasswordConfirmation(
                                                e.target.value,
                                            )
                                        }
                                        className={`form-input ${
                                            newPasswordConfirmation &&
                                            newPassword &&
                                            newPasswordConfirmation !==
                                                newPassword
                                                ? "invalid-input"
                                                : ""
                                        }`}
                                        placeholder="Confirm new password"
                                    />
                                </div>
                            </>
                        )}

                        <div className="form-row">
                            <label>Role</label>
                            <input
                                type="text"
                                value={profile.role}
                                readOnly
                                disabled
                            />
                        </div>

                        <div className="form-actions">
                            {!isEditing ? (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setIsEditing(true)}
                                >
                                    Edit Profile
                                </button>
                            ) : (
                                <>
                                    <button
                                        className="btn"
                                        onClick={handleCancel}
                                        disabled={saving}
                                        style={{ marginRight: "8px" }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSave}
                                        disabled={saving}
                                    >
                                        {saving ? "Saving..." : "Save Profile"}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="account-action">
                    <div className="action-title">Account Action</div>
                    <div
                        className="logout-box"
                        onClick={handleLogoutClick}
                        style={{ cursor: "pointer" }}
                    >
                        Log out from Account <br />
                        <span>
                            This will end your session and redirect you to the
                            log in page.
                        </span>
                    </div>
                </div>
            </div>

            {error && <div className="alert error">{error}</div>}

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div
                    className="modal-overlay"
                    onClick={() => setShowLogoutModal(false)}
                >
                    <div
                        className="modal-card"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: "400px" }}
                    >
                        <div className="success-content">
                            <h4 className="success-title">Confirm Logout</h4>
                            <p className="success-subtitle">
                                Are you sure you want to log out from your
                                account?
                            </p>
                            <div
                                style={{
                                    display: "flex",
                                    gap: "10px",
                                    justifyContent: "center",
                                    marginTop: "20px",
                                }}
                            >
                                <button
                                    className="btn"
                                    onClick={() => setShowLogoutModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={confirmLogout}
                                >
                                    Yes, Log out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Logging Out Modal */}
            {loggingOut && (
                <div className="modal-overlay">
                    <div className="modal-card" style={{ maxWidth: "400px" }}>
                        <div className="loading-overlay">
                            <div
                                className="spinner-border large-spinner"
                                role="status"
                            >
                                <span className="sr-only">Loading...</span>
                            </div>
                            <p
                                style={{
                                    marginTop: 15,
                                    color: "#4f46e5",
                                    fontWeight: 500,
                                    fontSize: "16px",
                                }}
                            >
                                Logging out...
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showModal && (
                <div
                    className="modal-overlay"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="modal-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="success-content">
                            <div className="success-icon-wrapper">
                                <svg
                                    className="success-icon-svg"
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="52"
                                    height="52"
                                    viewBox="0 0 52 52"
                                >
                                    <path
                                        fill="none"
                                        stroke="#ffffff"
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M16 28 L24 36 L40 20"
                                    />
                                </svg>
                            </div>
                            <h4 className="success-title">Success!</h4>
                            <p className="success-subtitle">{modalMessage}</p>
                            <button
                                className="btn btn-primary btn-close-message"
                                onClick={() => setShowModal(false)}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyProfile;
