window._ = require("lodash");

try {
    require("bootstrap");
} catch (e) {}

/**
 * Load axios with CSRF + Sanctum cookie setup
 */
window.axios = require("axios");
window.axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
window.axios.defaults.withCredentials = true;

// ✅ Initialize Sanctum CSRF cookie once
if (typeof window.__sanctumInitialized === "undefined") {
    window.__sanctumInitialized = true;
    window.axios.get("/sanctum/csrf-cookie").catch(() => {});
}

/**
 * ✅ Axios interceptor to catch unauthorized users
 */
window.axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && [401, 403].includes(error.response.status)) {
            window.location.href = "/401";
        }
        return Promise.reject(error);
    },
);
