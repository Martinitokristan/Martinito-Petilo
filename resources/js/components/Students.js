import React, { useEffect, useRef, useState } from "react";

import axios from "axios";
import { useNavigate } from "react-router-dom";
import { BsSearch } from "react-icons/bs";
import "../../sass/students.scss";
import { formatWithAcronym, generateInstitutionEmail } from "./format";

const getCsrfCookie = async () => {
    try {
        await axios.get("/sanctum/csrf-cookie");
    } catch (e) {
        // ignore
    }
};

function Students() {
    const navigate = useNavigate();
    const [initialLoading, setInitialLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [students, setStudents] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [modalContentState, setModalContentState] = useState("form"); // form | loading | success | error
    const [modalMessage, setModalMessage] = useState("");
    const [error, setError] = useState("");
    const [filters, setFilters] = useState({
        search: "",
        department_id: "",
        course_id: "",
        academic_year_id: "",
    });
    const initialFormState = {
        f_name: "",
        m_name: "",
        l_name: "",
        suffix: "",
        date_of_birth: "",
        age: "",
        sex: "male",
        phone_number: "",
        email_address: "",
        address: "",
        region: "",
        province: "",
        municipality: "",
        status: "active",
        department_id: "",
        course_id: "",
        academic_year_id: "",
        year_level: "1st",
    };
    const [form, setForm] = useState(initialFormState);
    const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);
    const [emailWarning, setEmailWarning] = useState("");
    const [regions, setRegions] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [municipalities, setMunicipalities] = useState([]);
    const [selectedRegionCode, setSelectedRegionCode] = useState("");
    const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
    const [selectedMunicipalityCode, setSelectedMunicipalityCode] = useState("");
    const [filtersLoading, setFiltersLoading] = useState(true);
    const isMountedRef = useRef(true);

    const getItemCode = (item = {}) =>
        item?.code ||
        item?.psgcCode ||
        item?.id ||
        item?.regionCode ||
        item?.provinceCode ||
        item?.cityCode ||
        item?.munCode;
    const getRegionName = (item = {}) => item?.regionName || item?.name || "";
    const getProvinceName = (item = {}) =>
        item?.name || item?.provinceName || "";
    const getMunicipalityName = (item = {}) =>
        item?.name || item?.cityName || item?.municipalityName || "";

    const loadProvinces = async (code) => {
        if (!code) {
            setProvinces([]);
            return [];
        }
        try {
            const res = await axios.get(
                `/api/admin/locations/regions/${code}/provinces`,
            );
            const list = res.data || [];
            setProvinces(list);
            return list;
        } catch (err) {
            console.error("Failed to load provinces", err);
            setProvinces([]);
            return [];
        }
    };

    const loadMunicipalities = async (code) => {
        if (!code) {
            setMunicipalities([]);
            return [];
        }
        try {
            const res = await axios.get(
                `/api/admin/locations/provinces/${code}/municipalities`,
            );
            const list = res.data || [];
            setMunicipalities(list);
            return list;
        } catch (err) {
            console.error("Failed to load municipalities", err);
            setMunicipalities([]);
            return [];
        }
    };

    const handleRegionChange = (code) => {
        setSelectedRegionCode(code);
        const selected = regions.find((item) => getItemCode(item) === code);
        const regionName = getRegionName(selected);
        setForm((prev) => ({
            ...prev,
            region: regionName,
            province: "",
            municipality: "",
        }));
        setSelectedProvinceCode("");
        setSelectedMunicipalityCode("");
        setProvinces([]);
        setMunicipalities([]);
        loadProvinces(code);
    };

    const handleProvinceChange = (code) => {
        setSelectedProvinceCode(code);
        const selected = provinces.find((item) => getItemCode(item) === code);
        const provinceName = getProvinceName(selected);
        setForm((prev) => ({
            ...prev,
            province: provinceName,
            municipality: "",
        }));
        setSelectedMunicipalityCode("");
        setMunicipalities([]);
        loadMunicipalities(code);
    };

    const handleMunicipalityChange = (code) => {
        setSelectedMunicipalityCode(code);
        const selected = municipalities.find(
            (item) => getItemCode(item) === code,
        );
        const municipalityName = getMunicipalityName(selected);
        setForm((prev) => ({
            ...prev,
            municipality: municipalityName,
        }));
    };

    const refresh = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.search) params.set("search", filters.search);
            if (filters.department_id)
                params.set("department_id", filters.department_id);
            if (filters.course_id) params.set("course_id", filters.course_id);
            if (filters.academic_year_id)
                params.set("academic_year_id", filters.academic_year_id);

            const qs = params.toString();
            const url = "/api/admin/students" + (qs ? "?" + qs : "");
            const response = await axios.get(url);

            if (isMountedRef.current) {
                setStudents(response.data || []);
                setError("");
            }
        } catch (e) {
            console.error("API Error:", e);
            if (isMountedRef.current) {
                setError("Failed to load students");
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        const loadInitialStudents = async () => {
            setInitialLoading(true);
            try {
                await refresh();
            } finally {
                if (isMountedRef.current) {
                    setInitialLoading(false);
                }
            }
        };

        const loadAncillaryData = async () => {
            setFiltersLoading(true);
            try {
                const [coursesRes, deptsRes, yearsRes, regionsRes] =
                    await Promise.all([
                        axios.get("/api/admin/courses"),
                        axios.get("/api/admin/departments"),
                        axios.get("/api/admin/academic-years"),
                        axios.get("/api/admin/locations/regions"),
                    ]);
                if (isMountedRef.current) {
                    setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
                    setDepartments(
                        Array.isArray(deptsRes.data) ? deptsRes.data : [],
                    );
                    setAcademicYears(
                        Array.isArray(yearsRes.data) ? yearsRes.data : [],
                    );
                    setRegions(Array.isArray(regionsRes.data) ? regionsRes.data : []);
                }
            } catch (err) {
                console.error("Failed to load student filters", err);
                if (isMountedRef.current) {
                    setCourses([]);
                    setDepartments([]);
                    setAcademicYears([]);
                    setRegions([]);
                }
            } finally {
                if (isMountedRef.current) {
                    setFiltersLoading(false);
                }
            }
        };

        isMountedRef.current = true;
        loadInitialStudents();
        loadAncillaryData();

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        refresh();
    }, [filters]);

    if (initialLoading) {
        return (
            <div className="page-loading">
                <div className="spinner"></div>
                <p>Loading Students...</p>
            </div>
        );
    }

    const computeAge = (date) => {
        if (!date) return "";
        const birth = new Date(date);
        if (Number.isNaN(birth.getTime())) return "";
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birth.getDate())
        ) {
            age -= 1;
        }
        return age < 0 ? "" : age;
    };

    const onOpenForm = () => {
        setEditingId(null);
        setShowForm(true);
        setModalContentState("form");
        setForm({ ...initialFormState });
        setEmailManuallyEdited(false);
        setEmailWarning("");
        setError("");
        setSelectedRegionCode("");
        setSelectedProvinceCode("");
        setSelectedMunicipalityCode("");
        setProvinces([]);
        setMunicipalities([]);
    };

    const findCodeByName = (items, targetName, nameGetter) => {
        const normalized = (targetName || "").trim().toLowerCase();
        if (!normalized) return "";
        const match = items.find(
            (item) =>
                (nameGetter(item) || "").trim().toLowerCase() === normalized,
        );
        return match ? getItemCode(match) : "";
    };

    const onOpenEditForm = async (student) => {
        const formatDate = (dateString) =>
            dateString ? new Date(dateString).toISOString().split("T")[0] : "";

        setEditingId(student.student_id);
        setShowForm(true);
        setModalContentState("form");
        setForm({
            f_name: student.f_name || "",
            m_name: student.m_name || "",
            l_name: student.l_name || "",
            suffix: student.suffix || "",
            date_of_birth: formatDate(student.date_of_birth),
            age: student.age ?? computeAge(student.date_of_birth),
            sex: student.sex || "male",
            phone_number: student.phone_number || "",
            email_address: student.email_address || "",
            address: student.address || "",
            region: student.region || "",
            province: student.province || "",
            municipality: student.municipality || "",
            status: student.status || "active",
            department_id: student.department_id || "",
            course_id: student.course_id || "",
            academic_year_id: student.academic_year_id || "",
            year_level: student.year_level || "1st",
        });
        setEmailManuallyEdited(true);
        setEmailWarning("");
        setSelectedProvinceCode("");
        setSelectedMunicipalityCode("");

        const regionCode = findCodeByName(
            regions,
            student.region,
            getRegionName,
        );
        setSelectedRegionCode(regionCode);

        if (regionCode) {
            const provinceList = await loadProvinces(regionCode);
            const provinceCode = findCodeByName(
                provinceList,
                student.province,
                getProvinceName,
            );
            setSelectedProvinceCode(provinceCode);

            if (provinceCode) {
                const municipalityList = await loadMunicipalities(provinceCode);
                const municipalityCode = findCodeByName(
                    municipalityList,
                    student.municipality,
                    getMunicipalityName,
                );
                setSelectedMunicipalityCode(municipalityCode);
            } else {
                setMunicipalities([]);
                setSelectedMunicipalityCode("");
            }
        } else {
            setProvinces([]);
            setMunicipalities([]);
            setSelectedRegionCode("");
        }
    };

    const normalizeEmail = (email) => email?.trim().toLowerCase() || "";

    const validateDuplicateEmail = (email, currentId = null) => {
        const normalized = normalizeEmail(email);
        if (!normalized) {
            setEmailWarning("");
            return false;
        }
        const duplicate = students.some(
            (student) =>
                student.email_address &&
                normalizeEmail(student.email_address) === normalized &&
                student.student_id !== currentId,
        );
        setEmailWarning(duplicate ? "Email already exists." : "");
        return duplicate;
    };

    const handleEmailChange = (value) => {
        setEmailManuallyEdited(true);
        setForm((prev) => ({ ...prev, email_address: value }));
        validateDuplicateEmail(value, editingId);
    };

    const handleFirstNameChange = (value) => {
        const shouldAutoEmail = !emailManuallyEdited && !editingId;
        const generatedEmail = shouldAutoEmail
            ? generateInstitutionEmail(value, form.l_name)
            : "";

        setForm((prev) => ({
            ...prev,
            f_name: value,
            ...(shouldAutoEmail ? { email_address: generatedEmail } : {}),
        }));

        if (shouldAutoEmail) {
            validateDuplicateEmail(generatedEmail, editingId);
        }
    };

    const handleLastNameChange = (value) => {
        const shouldAutoEmail = !emailManuallyEdited && !editingId;
        const generatedEmail = shouldAutoEmail
            ? generateInstitutionEmail(form.f_name, value)
            : "";

        setForm((prev) => ({
            ...prev,
            l_name: value,
            ...(shouldAutoEmail ? { email_address: generatedEmail } : {}),
        }));

        if (shouldAutoEmail) {
            validateDuplicateEmail(generatedEmail, editingId);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (validateDuplicateEmail(form.email_address, editingId)) {
            setModalContentState("form");
            setError("Email already exists.");
            return;
        }

        setModalContentState("loading");
        setError("");

        try {
            await getCsrfCookie();
            const payload = { ...form };
            let response;

            if (editingId) {
                response = await axios.put(
                    `/api/admin/students/${editingId}`,
                    payload,
                );
            } else {
                response = await axios.post("/api/admin/students", payload);
            }

            if (response.status === 200 || response.status === 201) {
                setModalContentState("success");
                refresh().catch((loadErr) => {
                    console.error("Failed to refresh student list", loadErr);
                });
            } else {
                setModalContentState("form");
                setError("Unexpected response from API");
            }
        } catch (err) {
            console.error("Save error:", err);
            const emailErrors =
                err.response?.status === 422
                    ? err.response?.data?.errors?.email_address
                    : null;
            if (emailErrors?.length) {
                setModalContentState("form");
                setError(emailErrors[0]);
                setEmailWarning(emailErrors[0]);
                return;
            }

            setModalContentState("error");
            setModalMessage(
                err.response?.data?.error ||
                    err.response?.data?.message ||
                    "Failed to save student",
            );
        }
    };
    const handleArchive = async (id) => {
            if (!confirm("Are you sure you want to archive this student?")) return;
            try {
                await axios.post(`/api/admin/students/${id}/archive`);
                await refresh();
                setModalMessage("Student has been successfully archived.");
                setModalContentState("success");
                setShowForm(true);
            } catch (error) {
                console.error("Archive error:", error);
                setModalMessage(
                    error.response?.data?.message || "Failed to archive student",
                );
                setModalContentState("error");
                setShowForm(true);
                if ([401, 403].includes(error.response?.status)) {
                    window.location.href = "/login";
                }
            }
        };

    const closeModalAndReset = async () => {
        await refresh();
        setShowForm(false);
        setModalContentState("form");
        setEditingId(null);
        setError("");
        setForm({ ...initialFormState });
        setSelectedRegionCode("");
        setEmailManuallyEdited(false);
        setSelectedProvinceCode("");
        setSelectedMunicipalityCode("");
        setProvinces([]);
        setMunicipalities([]);
    };

    const renderModalContent = () => {
        if (modalContentState === "loading") {
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
                        {editingId
                            ? "Updating Student Data..."
                            : "Saving New Student Data..."}
                    </p>
                </div>
            );
        }

        if (modalContentState === "success") {
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
                    <p className="success-subtitle">
                        {modalMessage ||
                            (editingId
                                ? "Student record has been updated."
                                : "New student has been successfully added.")}
                    </p>
                    <button
                        className="btn btn-primary btn-close-message"
                        onClick={closeModalAndReset}
                    >
                        Done
                    </button>
                </div>
            );
        }

        if (modalContentState === "error") {
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
                    <p className="error-subtitle">
                        {modalMessage || "An error occurred. Please try again."}
                    </p>
                    <button
                        className="btn btn-danger btn-close-message"
                        onClick={closeModalAndReset}
                    >
                        Close
                    </button>
                </div>
            );
        }

        return (
            <>
                <div className="modal-header-new">
                    <h3 className="modal-title-new">
                        {editingId ? "Edit Student" : "Add New Students"}
                    </h3>
                    <p className="modal-subtitle-new">
                        {editingId
                            ? "Update student details below"
                            : "Enter students details to add them to the system"}
                    </p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-grid-new">
                        <label className="form-label-new">Department</label>
                        <select
                            className="form-input-new"
                            value={form.department_id}
                            onChange={(e) => {
                                const deptId = e.target.value;
                                setForm((prev) => {
                                    const courseStillValid = courses.some(
                                        (c) =>
                                            c.course_id == prev.course_id &&
                                            c.department_id == deptId,
                                    );
                                    return {
                                        ...prev,
                                        department_id: deptId,
                                        course_id: courseStillValid
                                            ? prev.course_id
                                            : "",
                                    };
                                });
                            }}
                            required
                            disabled={filtersLoading}
                        >
                            <option value="">Select Department</option>
                            {departments.map((d) => (
                                <option
                                    key={d.department_id}
                                    value={d.department_id}
                                >
                                    {formatWithAcronym(d.department_name)}
                                </option>
                            ))}
                        </select>

                        <label className="form-label-new">Course</label>
                        <select
                            className="form-input-new"
                            value={form.course_id}
                            onChange={(e) =>
                                setForm({ ...form, course_id: e.target.value })
                            }
                            required
                            disabled={filtersLoading}
                        >
                            <option value="">Select Course</option>
                            {courses
                                .filter((c) => {
                                    if (!form.department_id) {
                                        return true;
                                    }
                                    return (
                                        c.department_id == form.department_id
                                    );
                                })
                                .map((c) => (
                                    <option
                                        key={c.course_id}
                                        value={c.course_id}
                                    >
                                        {formatWithAcronym(c.course_name)}
                                    </option>
                                ))}
                        </select>

                        <label className="form-label-new">First Name</label>
                        <input
                            className="form-input-new"
                            placeholder="First Name"
                            value={form.f_name}
                            onChange={(e) =>
                                handleFirstNameChange(e.target.value)
                            }
                            required
                        />

                        <label className="form-label-new">MI.Name</label>
                        <input
                            className="form-input-new"
                            placeholder="Middle Name"
                            value={form.m_name}
                            onChange={(e) =>
                                setForm({ ...form, m_name: e.target.value })
                            }
                        />

                        <label className="form-label-new">Last Name</label>
                        <input
                            className="form-input-new"
                            placeholder="Last Name"
                            value={form.l_name}
                            onChange={(e) =>
                                handleLastNameChange(e.target.value)
                            }
                            required
                        />

                        <label className="form-label-new">Suffix</label>
                        <input
                            className="form-input-new"
                            placeholder="Suffix"
                            value={form.suffix}
                            onChange={(e) =>
                                setForm({ ...form, suffix: e.target.value })
                            }
                        />

                        <label className="form-label-new">Date Birth</label>
                        <input
                            className="form-input-new"
                            value={form.date_of_birth}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    date_of_birth: e.target.value,
                                    age: computeAge(e.target.value),
                                })
                            }
                            type="date"
                            required
                        />

                        <label className="form-label-new">Sex</label>
                        <select
                            className="form-input-new"
                            value={form.sex}
                            onChange={(e) =>
                                setForm({ ...form, sex: e.target.value })
                            }
                            required
                        >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>

                        <label className="form-label-new">Phone No.</label>
                        <input
                            className="form-input-new"
                            placeholder="09XXXXXXXXX"
                            value={form.phone_number}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                if (value.length <= 11) {
                                    setForm({
                                        ...form,
                                        phone_number: value,
                                    });
                                }
                            }}
                            type="tel"
                            pattern="09[0-9]{9}"
                            maxLength="11"
                            title="Please enter a valid Philippine mobile number (11 digits starting with 09)"
                            required
                        />

                        <label className="form-label-new">Age</label>
                        <input
                            className="form-input-new"
                            value={form.age}
                            placeholder="Auto-calculated"
                            readOnly
                        />

                        <label className="form-label-new">Email</label>
                        <div className="input-with-error">
                            {emailWarning && (
                                <span className="inline-error">
                                    {emailWarning}
                                </span>
                            )}
                            <input
                                className={`form-input-new ${
                                    emailWarning ? "invalid-input" : ""
                                }`}
                                placeholder="Email Address"
                                value={form.email_address}
                                onChange={(e) =>
                                    handleEmailChange(e.target.value)
                                }
                                required
                            />
                        </div>

                        <label className="form-label-new">Year Level</label>
                        <select
                            className="form-input-new"
                            value={form.year_level}
                            onChange={(e) =>
                                setForm({ ...form, year_level: e.target.value })
                            }
                            required
                        >
                            <option value="1st">1st Year</option>
                            <option value="2nd">2nd Year</option>
                            <option value="3rd">3rd Year</option>
                            <option value="4th">4th Year</option>
                        </select>

                        <label className="form-label-new">Status</label>
                        <select
                            className="form-input-new"
                            value={form.status}
                            onChange={(e) =>
                                setForm({ ...form, status: e.target.value })
                            }
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="graduated">Graduated</option>
                            <option value="dropped">Dropped</option>
                        </select>

                        <label className="form-label-new">Academic Year</label>
                        <select
                            className="form-input-new"
                            value={form.academic_year_id}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    academic_year_id: e.target.value,
                                })
                            }
                            required
                            disabled={filtersLoading}
                        >
                            <option value="">Select Academic Year</option>
                            {academicYears.map((a) => (
                                <option
                                    key={a.academic_year_id}
                                    value={a.academic_year_id}
                                >
                                    {a.school_year}
                                </option>
                            ))}
                        </select>

                        <label className="form-label-new">Region</label>
                        <select
                            className="form-input-new"
                            value={selectedRegionCode}
                            onChange={async (e) => {
                                const code = e.target.value;
                                handleRegionChange(code);
                            }}
                            required
                            disabled={filtersLoading}
                        >
                            <option value="">Select Region</option>
                            {regions.map((region) => (
                                <option
                                    key={getItemCode(region)}
                                    value={getItemCode(region)}
                                >
                                    {getRegionName(region)}
                                </option>
                            ))}
                        </select>

                        <label className="form-label-new">Province</label>
                        <select
                            className="form-input-new"
                            value={selectedProvinceCode}
                            onChange={(e) =>
                                handleProvinceChange(e.target.value)
                            }
                            required
                            disabled={
                                !selectedRegionCode || provinces.length === 0
                            }
                        >
                            <option value="">Select Province</option>
                            {provinces.map((province) => (
                                <option
                                    key={getItemCode(province)}
                                    value={getItemCode(province)}
                                >
                                    {getProvinceName(province)}
                                </option>
                            ))}
                        </select>

                        <label className="form-label-new">
                            Municipality / City
                        </label>
                        <select
                            className="form-input-new"
                            value={selectedMunicipalityCode}
                            onChange={(e) =>
                                handleMunicipalityChange(e.target.value)
                            }
                            required
                            disabled={
                                !selectedProvinceCode ||
                                municipalities.length === 0
                            }
                        >
                            <option value="">Select Municipality / City</option>
                            {municipalities.map((municipality) => (
                                <option
                                    key={getItemCode(municipality)}
                                    value={getItemCode(municipality)}
                                >
                                    {getMunicipalityName(municipality)}
                                </option>
                            ))}
                        </select>

                        <label className="form-label-new full-width-label">
                            Address
                        </label>
                        <input
                            className="form-input-new full-width-input"
                            placeholder="Address"
                            value={form.address}
                            onChange={(e) =>
                                setForm({ ...form, address: e.target.value })
                            }
                            required
                        />
                    </div>

                    {error && (
                        <div className="alert-error full-width-error">
                            {error}
                        </div>
                    )}

                    <div className="modal-footer-new">
                        <button
                            className="btn btn-cancel-new"
                            type="button"
                            onClick={closeModalAndReset}
                        >
                            Cancel
                        </button>
                        <button className="btn btn-save-new" type="submit">
                            {editingId ? "Save Changes" : "Save Profile"}
                        </button>
                    </div>
                </form>
            </>
        );
    };

    return (
        <div className="page students-page">
            <div className="page-card">
                <header className="page-header">
                    <div className="page-header-text">
                        <h1 className="page-title">Students</h1>
                        <p className="page-subtitle">Manage student profiles</p>
                    </div>
                    <button
                        className="btn btn-primary new-btn"
                        onClick={onOpenForm}
                    >
                        Add Student
                    </button>
                </header>

                <div className="actions-row">
                    <div
                        className="filters"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "24px",
                        }}
                    >
                        <div
                            className="search"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                width: "260px",
                                background: "#fff",
                                borderRadius: "10px",
                                border: "1px solid #e5e7eb",
                                padding: "0 12px",
                            }}
                        >
                            <BsSearch
                                className="icon"
                                style={{ marginRight: 8, fontSize: 18 }}
                            />
                            <input
                                className="search-input"
                                style={{
                                    border: "none",
                                    outline: "none",
                                    width: "100%",
                                    fontSize: "1rem",
                                    background: "transparent",
                                }}
                                placeholder="Search here..."
                                value={filters.search}
                                onChange={(e) =>
                                    setFilters({
                                        ...filters,
                                        search: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <select
                            className="filter"
                            value={filters.department_id}
                            onChange={(e) => {
                                const deptId = e.target.value;
                                setFilters({
                                    ...filters,
                                    department_id: deptId,
                                    course_id: "",
                                });
                            }}
                            style={{ minWidth: 180 }}
                            disabled={filtersLoading}
                        >
                            <option value="">⚗ All Department</option>
                            {departments
                                .filter((d) => {
                                    if (filters.course_id) {
                                        const selectedCourse = courses.find(
                                            (c) =>
                                                c.course_id ==
                                                filters.course_id,
                                        );
                                        return selectedCourse
                                            ? d.department_id ==
                                                  selectedCourse.department_id
                                            : true;
                                    }
                                    return true;
                                })
                                .map((d) => (
                                    <option
                                        key={d.department_id}
                                        value={d.department_id}
                                    >
                                        {formatWithAcronym(d.department_name)}
                                    </option>
                                ))}
                        </select>

                        <select
                            className="filter"
                            value={filters.course_id}
                            onChange={(e) => {
                                const courseId = e.target.value;
                                const selectedCourse = courses.find(
                                    (c) => c.course_id == courseId,
                                );
                                setFilters({
                                    ...filters,
                                    course_id: courseId,
                                    department_id:
                                        courseId && selectedCourse
                                            ? selectedCourse.department_id
                                            : filters.department_id,
                                });
                            }}
                            style={{ minWidth: 180 }}
                            disabled={filtersLoading}
                        >
                            <option value="">⚗ All Course</option>
                            {courses
                                .filter((c) => {
                                    if (filters.department_id) {
                                        return (
                                            c.department_id ==
                                            filters.department_id
                                        );
                                    }
                                    return true;
                                })
                                .map((c) => (
                                    <option
                                        key={c.course_id}
                                        value={c.course_id}
                                    >
                                        {formatWithAcronym(c.course_name)}
                                    </option>
                                ))}
                        </select>

                        <select
                            className="filter"
                            value={filters.academic_year_id}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    academic_year_id: e.target.value,
                                })
                            }
                            style={{ minWidth: 180 }}
                            disabled={filtersLoading}
                        >
                            <option value="">⚗ All Academic Year</option>
                            {academicYears.map((a) => (
                                <option
                                    key={a.academic_year_id}
                                    value={a.academic_year_id}
                                >
                                    {a.school_year}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="table-wrapper">
                    <table className="students-table">
                        <thead>
                            <tr>
                                <th>Student ID</th>
                                <th>Student Name</th>
                                <th>Department</th>
                                <th>Course</th>
                                <th>Year Level</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((s) => (
                                <tr key={s.student_id}>
                                    <td>{s.student_id}</td>
                                    <td>
                                        {s.fullName ||
                                            `${s.f_name} ${
                                                s.m_name ? s.m_name + " " : ""
                                            }${s.l_name}${
                                                s.suffix ? " " + s.suffix : ""
                                            }`}
                                    </td>
                                    <td>
                                        {formatWithAcronym(
                                            s.department?.department_name ||
                                                "——————",
                                        )}
                                    </td>
                                    <td>
                                        {formatWithAcronym(
                                            s.course?.course_name ||
                                                "——————",
                                        )}
                                    </td>
                                    <td>
                                        {typeof s.year_level === "object" &&
                                        s.year_level !== null
                                            ? s.year_level.name ||
                                              s.year_level.label
                                            : s.year_level || "-"}
                                    </td>
                                    <td>
                                        <span
                                            className={`badge ${
                                                s.status === "active"
                                                    ? "badge-success"
                                                    : "badge-danger"
                                            }`}
                                        >
                                            {s.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-light"
                                            onClick={() => onOpenEditForm(s)}
                                        >
                                            Edit
                                        </button>
                                        {s.archived_at ? (
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() =>
                                                    handleRestore(s.student_id)
                                                }
                                            >
                                                Restore
                                            </button>
                                        ) : (
                                            <button
                                                className="btn btn-success"
                                                onClick={() =>
                                                    handleArchive(s.student_id)
                                                }
                                            >
                                                Archive
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-card">{renderModalContent()}</div>
                </div>
            )}

            {error && <div className="alert-error">{error}</div>}
        </div>
    );
}

export default Students;