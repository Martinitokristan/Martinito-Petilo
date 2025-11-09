import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiFileText, FiCloud, FiLock, FiXCircle } from "react-icons/fi"; // Add FiLock for disabled icon
import "../../sass/report.scss";

// Secure helper — ensure Sanctum cookie exists before requests
const ensureCsrf = async () => {
    try {
        await axios.get("/sanctum/csrf-cookie");
    } catch (_) {}
};

const REPORT_TYPES = {
    student: "student",
    faculty: "faculty",
};

const STUDENT_COLUMNS = [
    { key: "student_id", label: "Student ID" },
    { key: "name", label: "Name" },
    { key: "email_address", label: "Email" },
    { key: "course", label: "Course" },
    { key: "department", label: "Department" },
    { key: "status", label: "Status" },
];

const FACULTY_COLUMNS = [
    { key: "faculty_id", label: "Faculty ID" },
    { key: "name", label: "Name" },
    { key: "email_address", label: "Email" },
    { key: "phone_number", label: "Phone" },
    { key: "department", label: "Department" },
    { key: "position", label: "Position" },
    { key: "status", label: "Status" },
];

function Report() {
    const [reportType, setReportType] = useState(REPORT_TYPES.student);
    const [courses, setCourses] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [tableColumns, setTableColumns] = useState([]);
    const [tableRows, setTableRows] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [modalState, setModalState] = useState(""); // "", "loading", "success", "error"
    const [modalMessage, setModalMessage] = useState("");

    const hasTableData = tableRows.length > 0;

    // Fetch filter options on mount
    useEffect(() => {
        async function fetchFilters() {
            setInitialLoading(true);
            try {
                await ensureCsrf();
                const [coursesRes, departmentsRes] = await Promise.all([
                    axios.get("api/admin/reports/courses"),
                    axios.get("api/admin/reports/departments"),
                ]);
                setCourses(
                    Array.isArray(coursesRes.data) ? coursesRes.data : [],
                );
                setDepartments(
                    Array.isArray(departmentsRes.data)
                        ? departmentsRes.data
                        : [],
                );
            } catch {
                setModalState("error");
                setModalMessage("Failed to load filter options.");
            } finally {
                setInitialLoading(false);
            }
        }
        fetchFilters();
    }, []);

    // Reset filters and table when report type changes
    useEffect(() => {
        setTableColumns([]);
        setTableRows([]);
        setSelectedCourse("");
        setSelectedDepartment("");
    }, [reportType]);

    // Build table rows
    const buildStudentRows = (data) =>
        data.map((student) => ({
            student_id: student.student_id,
            name: [
                student.f_name,
                student.m_name,
                student.l_name,
                student.suffix,
            ]
                .filter(Boolean)
                .join(" "),
            email_address: student.email_address || "",
            course: student.course_name || "",
            department: student.department_name || "",
            status: student.status || "",
        }));

    const buildFacultyRows = (data) =>
        data.map((member) => ({
            faculty_id: member.faculty_id,
            name: [member.f_name, member.m_name, member.l_name, member.suffix]
                .filter(Boolean)
                .join(" "),
            email_address: member.email_address || "",
            phone_number: member.phone_number || "",
            department: member.department_name || "",
            position: member.position || "",
            status: member.status || "",
        }));

    // Generate Report
    const handleGenerateReport = async () => {
        setLoading(true);
        setTableRows([]);
        setModalState("");
        try {
            await ensureCsrf();
            if (reportType === REPORT_TYPES.student) {
                const { data } = await axios.post(
                    "/api/admin/reports/students",
                    {
                        course_id: selectedCourse || undefined,
                        export: "json",
                    },
                );
                setTableColumns(STUDENT_COLUMNS);
                setTableRows(
                    buildStudentRows(
                        Array.isArray(data.students) ? data.students : [],
                    ),
                );
            } else {
                const { data } = await axios.post(
                    "/api/admin/reports/faculty",
                    {
                        department_id: selectedDepartment || undefined,
                        export: "json",
                    },
                );
                setTableColumns(FACULTY_COLUMNS);
                setTableRows(
                    buildFacultyRows(
                        Array.isArray(data.faculty) ? data.faculty : [],
                    ),
                );
            }
        } catch {
            setModalState("error");
            setModalMessage("Failed to generate report.");
        } finally {
            setLoading(false);
        }
    };

    // Download PDF
    const handleDownloadPdf = async () => {
        if (!tableRows.length) return;
        setExporting(true);
        setModalState("loading");
        try {
            const [{ jsPDF }, autoTable] = await Promise.all([
                import("jspdf"),
                import("jspdf-autotable"),
            ]);
            const doc = new jsPDF();
            autoTable.default(doc, {
                head: [tableColumns.map((col) => col.label)],
                body: tableRows.map((row) =>
                    tableColumns.map((col) => row[col.key]),
                ),
            });
            doc.save(`${reportType}_report.pdf`);
            setModalState("success");
            setModalMessage("PDF downloaded successfully!");
        } catch {
            setModalState("error");
            setModalMessage("Failed to generate PDF.");
        } finally {
            setExporting(false);
        }
    };

    // Export to Google Sheets
    const handleExportSheets = async () => {
        if (!tableRows.length) return;
        setExporting(true);
        setModalState("loading");
        try {
            await axios.post("/api/admin/reports/export-to-sheets", {
                type: reportType,
                course_id: selectedCourse,
                department_id: selectedDepartment,
            });
            setModalState("success");
            setModalMessage("Exported to Google Sheets successfully!");
        } catch {
            setModalState("error");
            setModalMessage("Failed to export to Google Sheets.");
        } finally {
            setExporting(false);
        }
    };

    // Export Student Data (Google Sheets)
    const handleExportStudentData = async () => {
        setExporting(true);
        setModalState("loading");
        try {
            await axios.post("/api/admin/reports/students", {
                course_id: selectedCourse || undefined,
                export: "google_sheets",
            });
            setModalState("success");
            setModalMessage(
                "Student data exported to Google Sheets successfully!",
            );
        } catch (err) {
            console.error("Export Student Data Error:", err); // <-- log error
            setModalState("error");
            setModalMessage("Failed to export student data to Google Sheets.");
        } finally {
            setExporting(false);
        }
    };

    // Export Faculty Data (Google Sheets)
    const handleExportFacultyData = async () => {
        setExporting(true);
        setModalState("loading");
        try {
            await axios.post("/api/admin/reports/faculty", {
                department_id: selectedDepartment || undefined,
                export: "google_sheets",
            });
            setModalState("success");
            setModalMessage(
                "Faculty data exported to Google Sheets successfully!",
            );
        } catch (err) {
            console.error("Export Faculty Data Error:", err); // <-- log error
            setModalState("error");
            setModalMessage("Failed to export faculty data to Google Sheets.");
        } finally {
            setExporting(false);
        }
    };

    // Import Students (Google Sheets)
    const handleImportStudents = async () => {
        setLoading(true);
        try {
            await axios.post("/api/admin/reports/students/import");
            setModalState("success");
            setModalMessage("Imported students from Google Sheets!");
            // Optionally, refresh the report/table
            handleGenerateReport();
        } catch {
            setModalState("error");
            setModalMessage("Failed to import students.");
        } finally {
            setLoading(false);
        }
    };

    // Import Faculty (Google Sheets)
    const handleImportFaculty = async () => {
        setLoading(true);
        try {
            await ensureCsrf();
            const { data } = await axios.post("/api/admin/reports/faculty/import");
            if (data.success) {
                setReportType(REPORT_TYPES.faculty);
                setSelectedDepartment("");
                setModalState("success");
                setModalMessage("Imported faculty from Google Sheets!");
                handleGenerateReport();
            } else {
                setModalState("error");
                // Show error details if present
                setModalMessage(
                    data.message +
                        (data.errors && data.errors.length
                            ? "\n" + data.errors.join("\n")
                            : ""),
                );
            }
        } catch {
            setModalState("error");
            setModalMessage("Failed to import faculty from Google Sheets.");
        } finally {
            setLoading(false);
        }
    };

    const handleClearReport = () => {
        setTableColumns([]);
        setTableRows([]);
        setModalState("");
        setModalMessage("");
    };

    // Modal content for success/error/loading
    const renderModalContent = () => {
        if (modalState === "loading") {
            return (
                <div className="loading-overlay">
                    <div className="spinner-border large-spinner" role="status">
                        <span className="sr-only">Loading...</span>
                    </div>
                    <p
                        style={{
                            marginTop: 15,
                            color: "#4f46e5",
                            fontWeight: 500,
                        }}
                    >
                        Processing...
                    </p>
                </div>
            );
        }
        if (modalState === "success") {
            return (
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
                        onClick={() => setModalState("")}
                    >
                        Done
                    </button>
                </div>
            );
        }
        if (modalState === "error") {
            return (
                <div className="success-content">
                    <div className="error-icon-wrapper">
                        <svg
                            className="error-icon-svg"
                            xmlns="http://www.w3.org/2000/svg"
                            width="52"
                            height="52"
                            viewBox="0 0 52 52"
                        >
                            <path
                                fill="none"
                                stroke="#ffffff"
                                strokeWidth="5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16 16 L36 36 M36 16 L16 36"
                            />
                        </svg>
                    </div>
                    <h4 className="error-title">Error!</h4>
                    <p className="error-subtitle">{modalMessage}</p>
                    <button
                        className="btn btn-danger btn-close-message"
                        onClick={() => setModalState("")}
                    >
                        Close
                    </button>
                </div>
            );
        }
        return null;
    };

    if (initialLoading) {
        return (
            <div className="page-loading">
                <div className="spinner"></div>
                <p>Loading Reports...</p>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-card">
                <header className="page-header">
                    <div className="page-header-text">
                        <h1 className="page-title">Report Generator</h1>
                        <p className="page-subtitle">
                            Generate student or faculty reports
                        </p>
                    </div>
                    <div className="page-header-actions">
                        <button
                            className="btn btn-primary clear-report-btn"
                            onClick={handleClearReport}
                            disabled={!hasTableData || loading || exporting}
                        >
                            <FiXCircle />
                            Clear Report
                        </button>
                    </div>
                </header>

                <section className="report-config-card">
                    <div className="config-header">
                        <h2 className="config-title">Report Configuration</h2>
                    </div>
                    <div className="config-body">
                        <div className="config-grid">
                            <div className="config-field">
                                <label>Report Type</label>
                                <select
                                    className="filter"
                                    value={reportType}
                                    onChange={(e) =>
                                        setReportType(e.target.value)
                                    }
                                >
                                    <option value={REPORT_TYPES.student}>
                                        Student Report
                                    </option>
                                    <option value={REPORT_TYPES.faculty}>
                                        Faculty Report
                                    </option>
                                </select>
                            </div>
                            <div className="config-field">
                                <label>
                                    {reportType === REPORT_TYPES.student
                                        ? "Filter by Course"
                                        : "Filter by Department"}
                                </label>
                                {reportType === REPORT_TYPES.student ? (
                                    <select
                                        className="filter"
                                        value={selectedCourse}
                                        onChange={(e) =>
                                            setSelectedCourse(e.target.value)
                                        }
                                    >
                                        <option value="">All Courses</option>
                                        {courses.map((course) => (
                                            <option
                                                key={course.course_id}
                                                value={course.course_id}
                                            >
                                                {course.course_name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <select
                                        className="filter"
                                        value={selectedDepartment}
                                        onChange={(e) =>
                                            setSelectedDepartment(
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="">
                                            All Departments
                                        </option>
                                        {departments.map((dept) => (
                                            <option
                                                key={dept.department_id}
                                                value={dept.department_id}
                                            >
                                                {dept.department_name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                        <div className="report-action-row">
                            <button
                                className="btn btn-primary uniform-btn"
                                onClick={handleGenerateReport}
                                disabled={loading}
                            >
                                {loading ? (
                                    <span>
                                        <span className="spinner"></span>{" "}
                                        Generating...
                                    </span>
                                ) : (
                                    "Generate Report"
                                )}
                            </button>
                            {reportType === REPORT_TYPES.student ? (
                                <>
                                    <button
                                        className="btn btn-primary uniform-btn"
                                        onClick={handleImportStudents}
                                    >
                                        Import Students
                                    </button>
                                    <button
                                        className="btn btn-primary uniform-btn"
                                        onClick={handleExportStudentData}
                                    >
                                        Export Student Data
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        className="btn btn-primary uniform-btn"
                                        onClick={handleImportFaculty}
                                    >
                                        Import Faculty
                                    </button>
                                    <button
                                        className="btn btn-primary uniform-btn"
                                        onClick={handleExportFacultyData}
                                    >
                                        Export Faculty Data
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {hasTableData ? (
                    <div className="table-wrapper">
                        <table className="students-table">
                            <thead>
                                <tr>
                                    {tableColumns.map((col) => (
                                        <th key={col.key}>{col.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tableRows.map((row, idx) => (
                                    <tr key={idx}>
                                        {tableColumns.map((col) => (
                                            <td key={col.key}>
                                                {row[col.key]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    !loading && (
                        <div className="report-empty-state">
                            Click 'Generate Report' to see the data.
                        </div>
                    )
                )}

                <div
                    className={`report-export-row ${
                        hasTableData ? "" : "is-empty"
                    }`.trim()}
                >
                    <button
                        className="btn btn-primary"
                        onClick={handleDownloadPdf}
                        disabled={exporting}
                    >
                        <FiFileText /> Download PDF
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleExportSheets}
                        disabled={exporting}
                    >
                        <FiCloud /> Export to Google Sheets
                    </button>
                </div>
            </div>

            {modalState && (
                <div className="modal-overlay">
                    <div className="modal-card">{renderModalContent()}</div>
                </div>
            )}

            {loading && (
                <div className="page-loading report-loading">
                    <div className="spinner"></div>
                    <p>Loading Report...</p>
                </div>
            )}
        </div>
    );
}

export default Report;
