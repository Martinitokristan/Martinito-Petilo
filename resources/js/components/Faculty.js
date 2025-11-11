import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { BsSearch } from "react-icons/bs";
import "../../sass/faculty.scss";
import { formatWithAcronym, generateInstitutionEmail } from "./format";

function Faculty() {
    const [faculty, setFaculty] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [modalContentState, setModalContentState] = useState("form"); // form | loading | success | error
    const [modalMessage, setModalMessage] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [filters, setFilters] = useState({ search: "", department_id: "" });
    const navigate = useNavigate();

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
        department_id: "",
        position: "Dean",
        status: "active",
    };
    const [formData, setFormData] = useState(initialFormState);
    const [regions, setRegions] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [municipalities, setMunicipalities] = useState([]);
    const [selectedRegionCode, setSelectedRegionCode] = useState("");
    const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
    const [selectedMunicipalityCode, setSelectedMunicipalityCode] =
        useState("");
    const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);
    const [emailWarning, setEmailWarning] = useState("");
    const [filtersLoading, setFiltersLoading] = useState(true);
    const isMountedRef = useRef(true);

    const selectedDepartmentId = formData.department_id
        ? Number(formData.department_id)
        : null;
    const editingFacultyId = editingId ? Number(editingId) : null;
    const selectedDepartment = useMemo(() => {
        if (!selectedDepartmentId) return null;
        return (
            departments.find(
                (dept) => Number(dept.department_id) === selectedDepartmentId,
            ) || null
        );
    }, [departments, selectedDepartmentId]);

    const currentDeanIds = Array.isArray(selectedDepartment?.current_dean_ids)
        ? selectedDepartment.current_dean_ids.map(Number)
        : [];
    const departmentHeadUnavailable = Boolean(
        selectedDepartment?.has_department_head &&
            selectedDepartment?.current_department_head_id !== editingFacultyId,
    );
    const deanUnavailable = Boolean(
        selectedDepartment?.has_dean &&
            (editingFacultyId === null || !currentDeanIds.includes(editingFacultyId)),
    );

    useEffect(() => {
        if (!selectedDepartment) return;
        setFormData((prev) => {
            let nextPosition = prev.position;
            if (
                departmentHeadUnavailable &&
                prev.position === "Department Head"
            ) {
                nextPosition = "Instructor";
            }
            if (deanUnavailable && prev.position === "Dean") {
                nextPosition = "Instructor";
            }
            if (nextPosition === prev.position) {
                return prev;
            }
            return { ...prev, position: nextPosition };
        });
    }, [departmentHeadUnavailable, deanUnavailable, selectedDepartment]);

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

    const loadFaculty = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.search) params.set("search", filters.search);
            if (filters.department_id)
                params.set("department_id", filters.department_id);
            const qs = params.toString();
            const url = "/api/admin/faculty" + (qs ? "?" + qs : "");
            const r = await axios.get(url);
            if (isMountedRef.current) {
                setFaculty(r.data.filter((f) => !f.archived_at));
            }
        } catch (error) {
            console.error("Failed to load faculty", error);
            if (isMountedRef.current) {
                setError("Failed to load faculty");
                if ([401, 403].includes(error.response?.status)) {
                    window.location.href = "/login";
                }
            }
        }
    };

    const loadDepartments = async () => {
        try {
            const r = await axios.get("/api/admin/departments");
            if (isMountedRef.current) {
                setDepartments(r.data);
            }
        } catch (error) {
            console.error("Failed to load departments", error);
            if (isMountedRef.current) {
                setError("Failed to load departments");
                if ([401, 403].includes(error.response?.status)) {
                    window.location.href = "/login";
                }
            }
        }
    };

    const loadRegions = async () => {
        try {
            const response = await axios.get("/api/admin/locations/regions");
            if (isMountedRef.current) {
                setRegions(response.data || []);
            }
        } catch (error) {
            console.error("Failed to load regions", error);
            if (isMountedRef.current) {
                setRegions([]);
            }
        }
    };

    const loadProvinces = async (code) => {
        if (!code) {
            setProvinces([]);
            return [];
        }
        try {
            const response = await axios.get(
                `/api/admin/locations/regions/${code}/provinces`,
            );
            const list = response.data || [];
            setProvinces(list);
            return list;
        } catch (error) {
            console.error("Failed to load provinces", error);
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
            const response = await axios.get(
                `/api/admin/locations/provinces/${code}/municipalities`,
            );
            const list = response.data || [];
            setMunicipalities(list);
            return list;
        } catch (error) {
            console.error("Failed to load municipalities", error);
            setMunicipalities([]);
            return [];
        }
    };

    const closeModalAndReset = async () => {
        setShowForm(false);
        setModalContentState("form");
        setEditingId(null);
        setError("");
        setFormData({ ...initialFormState });
        setSelectedRegionCode("");
        setEmailManuallyEdited(false);
        setSelectedProvinceCode("");
        setSelectedMunicipalityCode("");
        setProvinces([]);
        setMunicipalities([]);
        setEmailWarning("");
        await loadFaculty();
    };

    useEffect(() => {
        const loadInitialFaculty = async () => {
            setInitialLoading(true);
            try {
                await Promise.all([loadFaculty(), loadDepartments()]);
            } finally {
                if (isMountedRef.current) {
                    setInitialLoading(false);
                }
            }
        };

        const loadFilters = async () => {
            setFiltersLoading(true);
            try {
                await Promise.all([loadDepartments(), loadRegions()]);
            } finally {
                if (isMountedRef.current) {
                    setFiltersLoading(false);
                }
            }
        };

        isMountedRef.current = true;
        loadInitialFaculty();
        loadFilters();

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!initialLoading) {
            loadFaculty();
        }
    }, [filters]);

    if (initialLoading) {
        return (
            <div className="page-loading">
                <div className="spinner"></div>
                <p>Loading Faculty...</p>
            </div>
        );
    }

    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const normalizeEmail = (email) => email?.trim().toLowerCase() || "";

    const validateDuplicateEmail = (email, currentId = null) => {
        const normalized = normalizeEmail(email);
        if (!normalized) {
            setEmailWarning("");
            return false;
        }
        const duplicate = faculty.some(
            (member) =>
                member.email_address &&
                normalizeEmail(member.email_address) === normalized &&
                member.faculty_id !== currentId,
        );
        setEmailWarning(duplicate ? "Email already exists." : "");
        return duplicate;
    };

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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "email_address") {
            setEmailManuallyEdited(true);
        }
        setFormData((prev) => ({
            ...prev,
            [name]: value,
            ...(name === "date_of_birth" ? { age: computeAge(value) } : {}),
        }));
        if (name === "email_address") {
            validateDuplicateEmail(value, editingId);
        }
    };

    const handleFirstNameChange = (value) => {
        const shouldAutoEmail = !emailManuallyEdited && !editingId;
        const generatedEmail = shouldAutoEmail
            ? generateInstitutionEmail(value, formData.l_name)
            : "";

        setFormData((prev) => ({
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
            ? generateInstitutionEmail(formData.f_name, value)
            : "";

        setFormData((prev) => ({
            ...prev,
            l_name: value,
            ...(shouldAutoEmail ? { email_address: generatedEmail } : {}),
        }));

        if (shouldAutoEmail) {
            validateDuplicateEmail(generatedEmail, editingId);
        }
    };

    const handleRegionChange = (code) => {
        setSelectedRegionCode(code);
        const selected = regions.find((item) => getItemCode(item) === code);
        const regionName = getRegionName(selected);
        setFormData((prev) => ({
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
        setFormData((prev) => ({
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
        setFormData((prev) => ({
            ...prev,
            municipality: municipalityName,
        }));
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

    const onOpenForm = () => {
        setEditingId(null);
        setShowForm(true);
        setModalContentState("form");
        setFormData({ ...initialFormState });
        setEmailWarning("");
        setError("");
        setSelectedRegionCode("");
        setSelectedProvinceCode("");
        setSelectedMunicipalityCode("");
        setProvinces([]);
        setMunicipalities([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (validateDuplicateEmail(formData.email_address, editingId)) {
            setModalContentState("form");
            setError("Email already exists.");
            return;
        }

        setModalContentState("loading");
        setError("");
        try {
            const payload = {
                ...formData,
                department_id: formData.department_id || null,
            };
            let response;
            if (editingId) {
                response = await axios.put(
                    `/api/admin/faculty/${editingId}`,
                    payload,
                );
            } else {
                response = await axios.post("/api/admin/faculty", payload);
            }
            if ([200, 201].includes(response.status)) {
                setModalContentState("success");
                // Refresh lists in the background so the success modal appears immediately
                Promise.all([loadFaculty(), loadDepartments()]).catch((loadErr) => {
                    console.error("Failed to refresh faculty/departments", loadErr);
                });
            }
        } catch (error) {
            console.error("Save error:", error);
            const emailErrors =
                error.response?.status === 422
                    ? error.response?.data?.error?.email_address ||
                      error.response?.data?.errors?.email_address
                    : null;
            if (emailErrors?.length) {
                const message = Array.isArray(emailErrors)
                    ? emailErrors[0]
                    : emailErrors;
                setModalContentState("form");
                setError(message);
                setEmailWarning(message);
                return;
            }

            setModalContentState("error");
            setModalMessage(
                error.response?.data?.error ||
                    error.response?.data?.message ||
                    "Failed to save faculty",
            );
            if ([401, 403].includes(error.response?.status)) {
                window.location.href = "/login";
            }
        }
    };

    const handleArchive = async (id) => {
        if (!confirm("Are you sure you want to archive this faculty?")) return;
        try {
            await axios.post(`/api/admin/faculty/${id}/archive`);
            await Promise.all([loadFaculty(), loadDepartments()]);
            setModalMessage("Faculty has been successfully archived.");
            setModalContentState("success");
            setShowForm(true);
        } catch (error) {
            console.error("Archive error:", error);
            setModalMessage(
                error.response?.data?.message || "Failed to archive faculty",
            );
            setModalContentState("error");
            setShowForm(true);
            if ([401, 403].includes(error.response?.status)) {
                window.location.href = "/login";
            }
        }
    };

    const onOpenEditForm = async (facultyMember) => {
        setEditingId(facultyMember.faculty_id);
        setFormData({
            f_name: facultyMember.f_name,
            m_name: facultyMember.m_name || "",
            l_name: facultyMember.l_name,
            suffix: facultyMember.suffix || "",
            date_of_birth: facultyMember.date_of_birth,
            age: facultyMember.age ?? computeAge(facultyMember.date_of_birth),
            sex: facultyMember.sex,
            phone_number: facultyMember.phone_number,
            email_address: facultyMember.email_address,
            address: facultyMember.address,
            region: facultyMember.region || "",
            province: facultyMember.province || "",
            municipality: facultyMember.municipality || "",
            department_id: facultyMember.department_id || "",
            position: facultyMember.position || "Dean",
            status: facultyMember.status || "active",
        });
        setEmailManuallyEdited(true);
        setEmailWarning("");
        setShowForm(true);
        setModalContentState("form");

        const regionCode = findCodeByName(
            regions,
            facultyMember.region,
            getRegionName,
        );
        setSelectedRegionCode(regionCode);

        if (regionCode) {
            const provinceList = await loadProvinces(regionCode);
            const provinceCode = findCodeByName(
                provinceList,
                facultyMember.province,
                getProvinceName,
            );
            setSelectedProvinceCode(provinceCode);

            if (provinceCode) {
                const municipalityList = await loadMunicipalities(provinceCode);
                const municipalityCode = findCodeByName(
                    municipalityList,
                    facultyMember.municipality,
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
            setSelectedProvinceCode("");
            setSelectedMunicipalityCode("");
        }
    };

    const renderModalContent = () => {
        if (modalContentState === "loading") {
            return (
                <div className="loading-overlay">
                    <div
                        className="spinner-border large-spinner"
                        role="status"
                    ></div>
                    <p className="loading-text">
                        {editingId
                            ? "Updating Faculty Data..."
                            : "Saving New Faculty Data..."}
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
                                ? "Faculty record has been updated."
                                : "New faculty has been successfully added.")}
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
                            viewBox="0 0 52 52"
                        >
                            <path
                                className="error-x-path"
                                fill="none"
                                d="M16 16 36 36 M36 16 16 36"
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
                        {editingId ? "Edit Faculty" : "Add New Faculty"}
                    </h3>
                    <p className="modal-subtitle-new">
                        {editingId
                            ? "Update faculty details below"
                            : "Enter faculty details to add them to the system"}
                    </p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-grid-new">
                        <label className="form-label-new">Department</label>
                        <select
                            className="form-input-new"
                            name="department_id"
                            value={formData.department_id}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Select Department</option>
                            {departments.map((dept) => (
                                <option
                                    key={dept.department_id}
                                    value={dept.department_id}
                                >
                                    {formatWithAcronym(dept.department_name)}
                                </option>
                            ))}
                        </select>

                        <label className="form-label-new">Position</label>
                        <select
                            className="form-input-new"
                            name="position"
                            value={formData.position}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="Dean" disabled={deanUnavailable}>
                                Dean
                            </option>
                            <option value="Instructor">Instructor</option>
                            <option value="Part-time">Part-time</option>
                            <option
                                value="Department Head"
                                disabled={departmentHeadUnavailable}
                            >
                                Department Head
                            </option>
                        </select>

                        <label className="form-label-new">First Name</label>
                        <input
                            className="form-input-new"
                            placeholder="First Name"
                            name="f_name"
                            value={formData.f_name}
                            onChange={(e) =>
                                handleFirstNameChange(e.target.value)
                            }
                            required
                        />

                        <label className="form-label-new">MI.Name</label>
                        <input
                            className="form-input-new"
                            placeholder="Middle Name"
                            name="m_name"
                            value={formData.m_name}
                            onChange={handleInputChange}
                        />

                        <label className="form-label-new">Last Name</label>
                        <input
                            className="form-input-new"
                            placeholder="Last Name"
                            name="l_name"
                            value={formData.l_name}
                            onChange={(e) =>
                                handleLastNameChange(e.target.value)
                            }
                            required
                        />

                        <label className="form-label-new">Suffix</label>
                        <input
                            className="form-input-new"
                            placeholder="Suffix"
                            name="suffix"
                            value={formData.suffix}
                            onChange={handleInputChange}
                        />

                        <label className="form-label-new">Date Birth</label>
                        <input
                            className="form-input-new"
                            type="date"
                            name="date_of_birth"
                            value={formData.date_of_birth}
                            onChange={handleInputChange}
                            required
                        />

                        <label className="form-label-new">Sex</label>
                        <select
                            className="form-input-new"
                            name="sex"
                            value={formData.sex}
                            onChange={handleInputChange}
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
                            name="phone_number"
                            value={formData.phone_number}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                if (value.length <= 11) {
                                    handleInputChange({
                                        target: {
                                            name: "phone_number",
                                            value: value,
                                        },
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
                            value={formData.age}
                            placeholder="Auto-filled"
                            readOnly
                        />

                        <label className="form-label-new">Status</label>
                        <select
                            className="form-input-new"
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>

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
                                placeholder="Email"
                                name="email_address"
                                value={formData.email_address}
                                onChange={handleInputChange}
                                type="email"
                                required
                            />
                        </div>

                        <label className="form-label-new">Region</label>
                        <select
                            className="form-input-new"
                            value={selectedRegionCode}
                            onChange={(e) => handleRegionChange(e.target.value)}
                            required
                        >
                            {!selectedRegionCode && (
                                <option value="">Select Region</option>
                            )}
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
                            {!selectedProvinceCode && (
                                <option value="">Select Province</option>
                            )}
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
                            {!selectedMunicipalityCode && (
                                <option value="">
                                    Select Municipality / City
                                </option>
                            )}
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
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
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
                            type="button"
                            className="btn btn-cancel-new"
                            onClick={closeModalAndReset}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-save-new">
                            {editingId ? "Save Changes" : "Save Profile"}
                        </button>
                    </div>
                </form>
            </>
        );
    };

    return (
        <div className="page">
            <div className="page-card">
                <header className="page-header">
                    <div className="page-header-text">
                        <h1 className="page-title">Faculty</h1>
                        <p className="page-subtitle">Manage faculty profiles</p>
                    </div>
                    <button
                        className="btn btn-primary new-btn"
                        onClick={onOpenForm}
                    >
                        Add Faculty
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
                                placeholder="Search by name or email..."
                                value={filters.search}
                                onChange={(e) =>
                                    handleFilterChange("search", e.target.value)
                                }
                                onBlur={loadFaculty}
                            />
                        </div>
                        <select
                            className="filter"
                            value={filters.department_id}
                            onChange={(e) =>
                                handleFilterChange(
                                    "department_id",
                                    e.target.value,
                                )
                            }
                            style={{ minWidth: 180 }}
                        >
                            <option value="">All Departments</option>
                            {departments.map((dept) => (
                                <option
                                    key={dept.department_id}
                                    value={dept.department_id}
                                >
                                    {dept.department_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="table-wrapper">
                    <table className="faculty-table">
                        <thead>
                            <tr>
                                <th>Faculty ID</th>
                                <th>Faculty Name</th>
                                <th>Department</th>
                                <th>Position</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {faculty.map((f) => (
                                <tr key={f.faculty_id}>
                                    <td>{f.faculty_id}</td>
                                    <td>{`${f.f_name} ${
                                        f.m_name ? f.m_name + " " : ""
                                    }${f.l_name}${
                                        f.suffix ? ", " + f.suffix : ""
                                    }`}</td>
                                    <td>
                                        {formatWithAcronym(
                                            f.department?.department_name ||
                                                "——————",
                                        )}
                                    </td>
                                    <td>{f.position || "——————"}</td>
                                    <td>
                                        <span
                                            className={`badge ${
                                                f.status === "active"
                                                    ? "badge-success"
                                                    : "badge-danger"
                                            }`}
                                        >
                                            {f.status || "active"}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-light"
                                            onClick={() => onOpenEditForm(f)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="btn btn-success"
                                            onClick={() =>
                                                handleArchive(f.faculty_id)
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

                {showForm && (
                    <div className="modal-overlay">
                        <div className="modal-card">{renderModalContent()}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Faculty;
