"use client";

import { useState, useEffect } from "react";

export default function ThemeToggle() {
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("theme") as "light" | "dark" | null;
        const preferred = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        setTheme(preferred);
        document.documentElement.dataset.theme = preferred;
        setMounted(true);
    }, []);

    const toggle = () => {
        const next = theme === "light" ? "dark" : "light";
        setTheme(next);
        document.documentElement.dataset.theme = next;
        localStorage.setItem("theme", next);
    };

    // Avoid hydration mismatch — render nothing until mounted
    if (!mounted) return <div style={{ width: 36, height: 36 }} />;

    return (
        <button
            className="theme-toggle"
            onClick={toggle}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
            <span className={`theme-toggle-icon ${theme === "light" ? "theme-icon-sun" : "theme-icon-moon"}`}>
                {theme === "light" ? "🌙" : "☀️"}
            </span>
        </button>
    );
}
