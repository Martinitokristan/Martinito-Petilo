const STOP_WORDS = new Set(["OF", "IN", "AND", "FOR", "THE", "A", "AN"]);

export const extractAcronym = (name, fallback = "") => {
    if (!name || typeof name !== "string") {
        return fallback;
    }

    const words = name.match(/\b[A-Za-z0-9']+\b/g);
    if (!words || words.length === 0) {
        return fallback;
    }

    const filtered = words
        .map((word) => {
            const upper = word.toUpperCase();
            if (STOP_WORDS.has(upper)) {
                return "";
            }
            return upper[0];
        })
        .filter(Boolean);

    if (filtered.length > 0) {
        return filtered.join("");
    }

    const letters = name.match(/\b[A-Za-z0-9]/g);
    if (!letters || letters.length === 0) {
        return fallback;
    }
    return letters.join("").toUpperCase();
};

export const formatWithAcronym = (name, fallback = "-") => {
    if (!name || typeof name !== "string") {
        return fallback;
    }
    const acronym = extractAcronym(name);
    if (!acronym || acronym === name.toUpperCase()) {
        return name;
    }
    return `${name} (${acronym})`;
};
