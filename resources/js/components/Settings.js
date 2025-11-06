import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Edit } from "lucide-react";
import { BsSearch } from "react-icons/bs";
import "../../sass/settings.scss";

// Secure helper — ensure Sanctum cookie exists before requests
const ensureCsrf = async () => {
    try {
        await axios.get("/sanctum/csrf-cookie");
    } catch (_) {
        console.warn("Failed to initialize CSRF cookie");
    }
};

function Settings() {
    const [initialLoading, setInitialLoading] = useState(true);
    const [active, setActive] = useState(() => {
        try {
            return localStorage.getItem("settings_active_tab") || "courses";
        } catch (_) {
            return "courses";
        }
    });
    const [courses, setCourses] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [archivedItems, setArchivedItems] = useState([]);
    const [archiveType, setArchiveType] = useState("all");
    const [archiveFilters, setArchiveFilters] = useState({
        search: "",
        department_id: "",
        course_id: "",
        academic_year_id: "",
    });
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [form, setForm] = useState({
        course_name: "",
        department_name: "",
        department_head: "",
        department_id: "",
        school_year: "",
    });
    const [error, setError] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [modalState, setModalState] = useState("success"); // success | error
    const [modalMessage, setModalMessage] = useState("");
    const navigate = useNavigate();

    const refreshData = async () => {
        try {
            await ensureCsrf(); // 🧩 secure cookie check
            if (active === "courses") {
                const res = await axios.get("/api/admin/courses");
                setCourses(res.data.filter((c) => !c.archived_at));
                const deptRes = await axios.get("/api/admin/departments");
                setDepartments(deptRes.data);
            } else if (active === "departments") {
                const res = await axios.get("/api/admin/departments");
                setDepartments(res.data.filter((d) => !d.archived_at));
            } else if (active === "academic-years") {
                const res = await axios.get("/api/admin/academic-years");
                setAcademicYears(res.data.filter((a) => !a.archived_at));
            } else if (active === "archive") {
                // Load filter data for archive tab
                const [depts, coursesData, years] = await Promise.all([
                    axios.get("/api/admin/departments"),
                    axios.get("/api/admin/courses"),
                    axios.get("/api/admin/academic-years"),
                ]);
                setDepartments(depts.data);
                setCourses(coursesData.data);
                setAcademicYears(years.data);
                await loadArchivedItems();
            }
            setError("");
        } catch (err) {
            setError("Failed to load data");
            if (err.response?.status === 401 || err.response?.status === 403) {
                window.location.href = "/login";
            }
        }
    };

    useEffect(() => {
        const initialLoad = async () => {
            await refreshData();
            setInitialLoading(false);
        };
        initialLoad();
    }, []);

    useEffect(() => {
        if (!initialLoading) {
            refreshData();
        }
    }, [active]);

    const onOpenForm = (item) => {
        setShowForm(true);
        setIsEditing(!!item);
        setSelectedItem(item);
        setForm({
            course_name: item?.course_name || "",
            department_name: item?.department_name || "",
            department_head: item?.department_head || "",
            department_id: item?.department_id || "",
            school_year: item?.school_year || "",
        });
        setError("");
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            await ensureCsrf();
            if (active === "courses") {
                const payload = {
                    course_name: form.course_name.trim(),
                    department_id: form.department_id || undefined,
                };
                if (!payload.department_id) {
                    throw new Error("Please select a department.");
                }
                if (isEditing) {
                    await axios.put(
                        `/api/admin/courses/${selectedItem.course_id}`,
                        payload,
                    );
                } else {
                    await axios.post("/api/admin/courses", payload);
                }
                await refreshData();
            } else if (active === "departments") {
                const payload = {
                    department_name: form.department_name.trim(),
                };
                if (isEditing) {
                    await axios.put(
                        `/api/admin/departments/${selectedItem.department_id}`,
                        payload,
                    );
                } else {
                    await axios.post("/api/admin/departments", payload);
                }
                await refreshData();
            } else if (active === "academic-years") {
                const payload = {
                    school_year: form.school_year.trim(),
                };
                if (isEditing) {
                    await axios.put(
                        `/api/admin/academic-years/${selectedItem.academic_year_id}`,
                        payload,
                    );
                } else {
                    await axios.post("/api/admin/academic-years", payload);
                }
                await refreshData();
            }
            setShowForm(false);
        } catch (error) {
            setError(
                error.response?.data?.message ||
                    error.message ||
                    "Failed to save",
            );
            if (
                error.response?.status === 401 ||
                error.response?.status === 403
            ) {
                window.location.href = "/login";
            }
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to archive this item?")) return;
        try {
            await ensureCsrf();
            const url = `/api/admin/${active}/${id}/archive`;
            await axios.post(url);
            const itemType =
                active === "courses"
                    ? "Course"
                    : active === "departments"
                      ? "Department"
                      : "Academic Year";
            setModalMessage(`${itemType} has been successfully archived.`);
            setModalState("success");
            setShowModal(true);
        } catch (error) {
            setModalMessage(
                error.response?.data?.message || "Failed to archive",
            );
            setModalState("error");
            setShowModal(true);
            if (
                error.response?.status === 401 ||
                error.response?.status === 403
            ) {
                window.location.href = "/login";
            }
        }
    };

    const closeModal = async () => {
        setShowModal(false);
        setModalMessage("");
        await refreshData();
    };

    const handleEdit = (item) => {
        setIsEditing(true);
        setSelectedItem(item);
        setShowForm(true);
        setForm({
            course_name: item.course_name || "",
            department_name: item.department_name || "",
            department_head: item.department_head || "",
            department_id: item.department_id || "",
            school_year: item.school_year || "",
        });
    };

    // Archive functions
    const loadArchivedItems = async () => {
        try {
            await ensureCsrf();
            const params = new URLSearchParams();
            if (archiveFilters.search)
                params.set("search", archiveFilters.search);
            if (archiveFilters.department_id)
                params.set("department_id", archiveFilters.department_id);
            if (archiveFilters.course_id)
                params.set("course_id", archiveFilters.course_id);
            if (archiveFilters.academic_year_id)
                params.set("academic_year_id", archiveFilters.academic_year_id);
            params.set("type", archiveType);

            const res = await axios.get(
                "/api/admin/archived?" + params.toString(),
            );
            setArchivedItems(res.data.items || []);
        } catch (err) {
            console.error("Load archived error:", err);
            setError("Failed to load archived items");
        }
    };

    const handleRestore = async (item) => {
        if (!confirm("Are you sure you want to restore this item?")) return;
        try {
            await ensureCsrf();
            const typeMap = {
                course: "courses",
                department: "departments",
                academic_year: "academic-years",
                student: "students",
                faculty: "faculty",
            };
            const apiType = typeMap[item._type] || item._type;
            await axios.post(`/api/admin/${apiType}/${item._id}/restore`);
            setModalMessage(`${item._type} has been successfully restored.`);
            setModalState("success");
            setShowModal(true);
        } catch (error) {
            setModalMessage(
                error.response?.data?.message || "Failed to restore item",
            );
            setModalState("error");
            setShowModal(true);
        }
    };

    const handlePermanentDelete = async (item) => {
        if (
            !confirm(
                "Are you sure you want to permanently delete this item? This action cannot be undone!",
            )
        )
            return;
        try {
            await ensureCsrf();
            const typeMap = {
                course: "courses",
                department: "departments",
                academic_year: "academic-years",
                student: "students",
                faculty: "faculty",
            };
            const apiType = typeMap[item._type] || item._type;
            await axios.delete(`/api/admin/${apiType}/${item._id}`);
            setModalMessage(`${item._type} has been permanently deleted.`);
            setModalState("success");
            setShowModal(true);
        } catch (error) {
            setModalMessage(
                error.response?.data?.message || "Failed to delete item",
            );
            setModalState("error");
            setShowModal(true);
        }
    };

    useEffect(() => {
        if (active === "archive") {
            loadArchivedItems();
        }
    }, [archiveFilters]);

    if (initialLoading) {
        return (
            <div className="page-loading">
                <div className="spinner"></div>
                <p>Loading Settings...</p>
            </div>
        );
    }

    return (
        <div className="settings-content">
            <div className="page">
                <div className="page-card">
                    <header className="page-header">
                        <div className="page-header-text">
                            <h1 className="page-title">Settings</h1>
                            <p className="page-subtitle">
                                Manage courses, departments, and academic years
                            </p>
                        </div>
                        {active !== "archive" && (
                            <button
                                className="btn btn-primary new-btn"
                                onClick={() => onOpenForm()}
                            >
                                Add{" "}
                                {active === "courses"
                                    ? "Course"
                                    : active === "departments"
                                      ? "Department"
                                      : "Academic Year"}
                            </button>
                        )}
                    </header>

                    {error && <div className="alert-error">{error}</div>}

                    <section className="settings-tabs">
                        <div className="tabs">
                            <button
                                className={`tab ${
                                    active === "courses" ? "active" : ""
                                }`}
                                onClick={() => {
                                    setActive("courses");
                                    localStorage.setItem(
                                        "settings_active_tab",
                                        "courses",
                                    );
                                }}
                            >
                                Courses
                            </button>
                            <button
                                className={`tab ${
                                    active === "departments" ? "active" : ""
                                }`}
                                onClick={() => {
                                    setActive("departments");
                                    localStorage.setItem(
                                        "settings_active_tab",
                                        "departments",
                                    );
                                }}
                            >
                                Departments
                            </button>
                            <button
                                className={`tab ${
                                    active === "academic-years" ? "active" : ""
                                }`}
                                onClick={() => {
                                    setActive("academic-years");
                                    localStorage.setItem(
                                        "settings_active_tab",
                                        "academic-years",
                                    );
                                }}
                            >
                                Academic Years
                            </button>
                            <button
                                className={`tab ${
                                    active === "archive" ? "active" : ""
                                }`}
                                onClick={() => {
                                    setActive("archive");
                                    localStorage.setItem(
                                        "settings_active_tab",
                                        "archive",
                                    );
                                }}
                            >
                                Archive
                            </button>
                        </div>

                        <div className="tab-content">
                            {/* === Courses Table === */}
                            {active === "courses" && (
                                <div className="table-wrapper">
                                    <table className="settings-table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Department</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {courses.map((c) => (
                                                <tr key={c.course_id}>
                                                    <td>{c.course_name}</td>
                                                    <td>
                                                        {c.department
                                                            ?.department_name ||
                                                            "-"}
                                                    </td>
                                                    <td>
                                                        <button
                                                            className="btn btn-light"
                                                            onClick={() =>
                                                                onOpenForm(c)
                                                            }
                                                        >
                                                            ✎ Edit
                                                        </button>
                                                        <button
                                                            className="btn btn-success btn-sm"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    c.course_id,
                                                                )
                                                            }
                                                        >
                                                            Archive
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* === Departments Table === */}
                            {active === "departments" && (
                                <div className="table-wrapper">
                                    <table className="settings-table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Department Head</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {departments.map((d) => (
                                                <tr key={d.department_id}>
                                                    <td>{d.department_name}</td>
                                                    <td>
                                                        {d.department_head ||
                                                            "-"}
                                                    </td>
                                                    <td>
                                                        <button
                                                            className="btn btn-light"
                                                            onClick={() =>
                                                                onOpenForm(d)
                                                            }
                                                        >
                                                            ✎ Edit
                                                        </button>
                                                        <button
                                                            className="btn btn-success btn-sm"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    d.department_id,
                                                                )
                                                            }
                                                        >
                                                            Archive
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* === Academic Years Table === */}
                            {active === "academic-years" && (
                                <div className="table-wrapper">
                                    <table className="settings-table">
                                        <thead>
                                            <tr>
                                                <th>School Year</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {academicYears.map((a) => (
                                                <tr key={a.academic_year_id}>
                                                    <td>{a.school_year}</td>
                                                    <td>
                                                        <button
                                                            className="btn btn-light"
                                                            onClick={() =>
                                                                onOpenForm(a)
                                                            }
                                                        >
                                                            ✎ Edit
                                                        </button>
                                                        <button
                                                            className="btn btn-success btn-sm"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    a.academic_year_id,
                                                                )
                                                            }
                                                        >
                                                            Archive
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* === Archive Table === */}
                            {active === "archive" && (
                                <div>
                                    <div
                                        className="controls-bar"
                                        style={{
                                            display: "flex",
                                            gap: "12px",
                                            marginBottom: "20px",
                                            alignItems: "flex-end",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <div
                                            className="control-item"
                                            style={{
                                                flex: "0 0 auto",
                                                minWidth: "150px",
                                            }}
                                        >
                                            <select
                                                value={archiveType}
                                                onChange={(e) => {
                                                    setArchiveType(
                                                        e.target.value,
                                                    );
                                                    setArchiveFilters({
                                                        search: "",
                                                        department_id: "",
                                                        course_id: "",
                                                        academic_year_id: "",
                                                    });
                                                }}
                                                style={{
                                                    padding: "8px 12px",
                                                    border: "1px solid #ddd",
                                                    borderRadius: "6px",
                                                    width: "100%",
                                                    height: "40px",
                                                }}
                                            >
                                                <option value="all">
                                                    All Types
                                                </option>
                                                <option value="students">
                                                    Students
                                                </option>
                                                <option value="faculty">
                                                    Faculty
                                                </option>
                                                <option value="courses">
                                                    Courses
                                                </option>
                                                <option value="departments">
                                                    Departments
                                                </option>
                                                <option value="academic_years">
                                                    Academic Years
                                                </option>
                                            </select>
                                        </div>

                                        <div
                                            className="control-item"
                                            style={{
                                                flex: "0 0 auto",
                                                width: "320px",
                                            }}
                                        >
                                            <div
                                                style={{ position: "relative" }}
                                            >
                                                <BsSearch
                                                    style={{
                                                        position: "absolute",
                                                        left: "12px",
                                                        top: "50%",
                                                        transform:
                                                            "translateY(-50%)",
                                                        color: "#666",
                                                        pointerEvents: "none",
                                                    }}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder={`Search archived ${
                                                        archiveType === "all"
                                                            ? "items"
                                                            : archiveType
                                                    }...`}
                                                    value={
                                                        archiveFilters.search
                                                    }
                                                    onChange={(e) =>
                                                        setArchiveFilters({
                                                            ...archiveFilters,
                                                            search: e.target
                                                                .value,
                                                        })
                                                    }
                                                    style={{
                                                        width: "100%",
                                                        padding:
                                                            "8px 12px 8px 38px",
                                                        border: "1px solid #ddd",
                                                        borderRadius: "6px",
                                                        height: "40px",
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {(archiveType === "students" ||
                                            archiveType === "faculty" ||
                                            archiveType === "courses") && (
                                            <div
                                                className="control-item"
                                                style={{
                                                    flex: "0 0 auto",
                                                    minWidth: "150px",
                                                }}
                                            >
                                                <select
                                                    value={
                                                        archiveFilters.department_id
                                                    }
                                                    onChange={(e) =>
                                                        setArchiveFilters({
                                                            ...archiveFilters,
                                                            department_id:
                                                                e.target.value,
                                                            course_id: "",
                                                        })
                                                    }
                                                    style={{
                                                        padding: "8px 12px",
                                                        border: "1px solid #ddd",
                                                        borderRadius: "6px",
                                                        width: "100%",
                                                        height: "40px",
                                                    }}
                                                >
                                                    <option value="">
                                                        All Departments
                                                    </option>
                                                    {departments.map((d) => (
                                                        <option
                                                            key={
                                                                d.department_id
                                                            }
                                                            value={
                                                                d.department_id
                                                            }
                                                        >
                                                            {d.department_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {archiveType === "students" && (
                                            <div
                                                className="control-item"
                                                style={{
                                                    flex: "0 0 auto",
                                                    minWidth: "150px",
                                                }}
                                            >
                                                <select
                                                    value={
                                                        archiveFilters.course_id
                                                    }
                                                    onChange={(e) =>
                                                        setArchiveFilters({
                                                            ...archiveFilters,
                                                            course_id:
                                                                e.target.value,
                                                        })
                                                    }
                                                    style={{
                                                        padding: "8px 12px",
                                                        border: "1px solid #ddd",
                                                        borderRadius: "6px",
                                                        width: "100%",
                                                        height: "40px",
                                                    }}
                                                >
                                                    <option value="">
                                                        All Courses
                                                    </option>
                                                    {courses
                                                        .filter(
                                                            (c) =>
                                                                !archiveFilters.department_id ||
                                                                c.department_id ===
                                                                    parseInt(
                                                                        archiveFilters.department_id,
                                                                    ),
                                                        )
                                                        .map((c) => (
                                                            <option
                                                                key={
                                                                    c.course_id
                                                                }
                                                                value={
                                                                    c.course_id
                                                                }
                                                            >
                                                                {c.course_name}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>
                                        )}

                                        {archiveType === "students" && (
                                            <div
                                                className="control-item"
                                                style={{
                                                    flex: "0 0 auto",
                                                    minWidth: "150px",
                                                }}
                                            >
                                                <select
                                                    value={
                                                        archiveFilters.academic_year_id
                                                    }
                                                    onChange={(e) =>
                                                        setArchiveFilters({
                                                            ...archiveFilters,
                                                            academic_year_id:
                                                                e.target.value,
                                                        })
                                                    }
                                                    style={{
                                                        padding: "8px 12px",
                                                        border: "1px solid #ddd",
                                                        borderRadius: "6px",
                                                        width: "100%",
                                                        height: "40px",
                                                    }}
                                                >
                                                    <option value="">
                                                        All Academic Years
                                                    </option>
                                                    {academicYears.map((a) => (
                                                        <option
                                                            key={
                                                                a.academic_year_id
                                                            }
                                                            value={
                                                                a.academic_year_id
                                                            }
                                                        >
                                                            {a.school_year}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="table-wrapper">
                                        {archivedItems.length === 0 ? (
                                            <p
                                                style={{
                                                    textAlign: "center",
                                                    padding: "40px",
                                                    color: "#666",
                                                }}
                                            >
                                                No archived items found.
                                            </p>
                                        ) : (
                                            <table className="settings-table">
                                                <thead>
                                                    <tr>
                                                        <th>Type</th>
                                                        <th>Name</th>
                                                        <th>Details</th>
                                                        <th>Archived At</th>
                                                        <th
                                                            style={{
                                                                textAlign:
                                                                    "center",
                                                            }}
                                                        >
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {archivedItems.map(
                                                        (item, index) => (
                                                            <tr
                                                                key={`${item._type}-${
                                                                    item._id ||
                                                                    index
                                                                }`}
                                                            >
                                                                <td
                                                                    style={{
                                                                        textTransform:
                                                                            "capitalize",
                                                                    }}
                                                                >
                                                                    {item._type?.replace(
                                                                        "_",
                                                                        " ",
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    {
                                                                        item._label
                                                                    }
                                                                </td>
                                                                <td>
                                                                    {item._department ||
                                                                        item._course ||
                                                                        "-"}
                                                                </td>
                                                                <td>
                                                                    {item.archived_at
                                                                        ? new Date(
                                                                              item.archived_at,
                                                                          ).toLocaleDateString()
                                                                        : "-"}
                                                                </td>
                                                                <td
                                                                    style={{
                                                                        textAlign:
                                                                            "center",
                                                                    }}
                                                                >
                                                                    <div
                                                                        style={{
                                                                            display:
                                                                                "flex",
                                                                            gap: "8px",
                                                                            justifyContent:
                                                                                "center",
                                                                        }}
                                                                    >
                                                                        <button
                                                                            className="btn"
                                                                            style={{
                                                                                backgroundColor:
                                                                                    "#fbbf24",
                                                                                color: "#111827",
                                                                                border: "1px solid #fbbf24",
                                                                                padding:
                                                                                    "8px 14px",
                                                                                borderRadius:
                                                                                    "6px",
                                                                            }}
                                                                            onClick={() =>
                                                                                handleRestore(
                                                                                    item,
                                                                                )
                                                                            }
                                                                        >
                                                                            Restore
                                                                        </button>
                                                                        <button
                                                                            className="btn"
                                                                            style={{
                                                                                backgroundColor:
                                                                                    "#dc2626",
                                                                                color: "white",
                                                                                border: "1px solid #dc2626",
                                                                                padding:
                                                                                    "8px 14px",
                                                                                borderRadius:
                                                                                    "6px",
                                                                            }}
                                                                            onClick={() =>
                                                                                handlePermanentDelete(
                                                                                    item,
                                                                                )
                                                                            }
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* === Modals (Unchanged) === */}
                            {showForm && active === "courses" && (
                                <div className="modal-overlay">
                                    <div className="modal-card">
                                        <h3>
                                            {isEditing
                                                ? "Edit Course"
                                                : "Add Course"}
                                        </h3>
                                        <form onSubmit={onSubmit}>
                                            <div
                                                style={{
                                                    display: "grid",
                                                    gap: 14,
                                                }}
                                            >
                                                <div>
                                                    <label>Course Name</label>
                                                    <input
                                                        className="form-input"
                                                        value={form.course_name}
                                                        onChange={(e) =>
                                                            setForm({
                                                                ...form,
                                                                course_name:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label>Department</label>
                                                    <select
                                                        className="form-input"
                                                        value={
                                                            form.department_id
                                                        }
                                                        onChange={(e) =>
                                                            setForm({
                                                                ...form,
                                                                department_id:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        required
                                                    >
                                                        <option
                                                            value=""
                                                            disabled
                                                        >
                                                            Select department
                                                        </option>
                                                        {departments.map(
                                                            (d) => (
                                                                <option
                                                                    key={
                                                                        d.department_id
                                                                    }
                                                                    value={
                                                                        d.department_id
                                                                    }
                                                                >
                                                                    {
                                                                        d.department_name
                                                                    }
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    marginTop: 20,
                                                    display: "flex",
                                                    justifyContent: "flex-end",
                                                    gap: 12,
                                                }}
                                            >
                                                <button
                                                    className="btn"
                                                    type="button"
                                                    onClick={() =>
                                                        setShowForm(false)
                                                    }
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className="btn btn-primary"
                                                    type="submit"
                                                >
                                                    {isEditing
                                                        ? "Update Course"
                                                        : "Add Course"}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {showForm && active === "departments" && (
                                <div className="modal-overlay">
                                    <div className="modal-card">
                                        <h3>
                                            {isEditing
                                                ? "Edit Department"
                                                : "Add Department"}
                                        </h3>
                                        <form onSubmit={onSubmit}>
                                            <div
                                                style={{
                                                    display: "grid",
                                                    gap: 14,
                                                }}
                                            >
                                                <div>
                                                    <label>
                                                        Department Name
                                                    </label>
                                                    <input
                                                        className="form-input"
                                                        placeholder="Department Name"
                                                        name="department_name"
                                                        value={
                                                            form.department_name
                                                        }
                                                        onChange={(e) =>
                                                            setForm({
                                                                ...form,
                                                                department_name:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    marginTop: 20,
                                                    display: "flex",
                                                    justifyContent: "flex-end",
                                                    gap: 12,
                                                }}
                                            >
                                                <button
                                                    className="btn"
                                                    type="button"
                                                    onClick={() =>
                                                        setShowForm(false)
                                                    }
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className="btn btn-primary"
                                                    type="submit"
                                                >
                                                    {isEditing
                                                        ? "Update Department"
                                                        : "Add Department"}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {showForm && active === "academic-years" && (
                                <div className="modal-overlay">
                                    <div className="modal-card">
                                        <h3>
                                            {isEditing
                                                ? "Edit Academic Year"
                                                : "Add Academic Year"}
                                        </h3>
                                        <form onSubmit={onSubmit}>
                                            <div
                                                style={{
                                                    display: "grid",
                                                    gap: 14,
                                                }}
                                            >
                                                <div>
                                                    <label>School Year</label>
                                                    <input
                                                        className="form-input"
                                                        value={form.school_year}
                                                        onChange={(e) =>
                                                            setForm({
                                                                ...form,
                                                                school_year:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    marginTop: 20,
                                                    display: "flex",
                                                    justifyContent: "flex-end",
                                                    gap: 12,
                                                }}
                                            >
                                                <button
                                                    className="btn"
                                                    type="button"
                                                    onClick={() =>
                                                        setShowForm(false)
                                                    }
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className="btn btn-primary"
                                                    type="submit"
                                                >
                                                    {isEditing
                                                        ? "Save Changes"
                                                        : "Add Academic Year"}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {showModal && (
                                <div className="modal-overlay">
                                    <div className="modal-card">
                                        {modalState === "success" ? (
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
                                                <h4 className="success-title">
                                                    Success!
                                                </h4>
                                                <p className="success-subtitle">
                                                    {modalMessage}
                                                </p>
                                                <button
                                                    className="btn btn-primary btn-close-message"
                                                    onClick={closeModal}
                                                >
                                                    Done
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="success-content">
                                                <div className="error-icon-wrapper">
                                                    <svg
                                                        className="error-icon-svg"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 52 52"
                                                    >
                                                        <path
                                                            className="error-x-path"
                                                            fill="none"
                                                            d="M16 16 36 36 M36 16 16 36"
                                                        />
                                                    </svg>
                                                </div>
                                                <h4 className="error-title">
                                                    Error!
                                                </h4>
                                                <p className="error-subtitle">
                                                    {modalMessage}
                                                </p>
                                                <button
                                                    className="btn btn-danger btn-close-message"
                                                    onClick={closeModal}
                                                >
                                                    Close
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default Settings;
