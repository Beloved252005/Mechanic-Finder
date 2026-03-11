"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Middleware handles redirection based on role
        router.replace("/dashboard");
    }, [router]);

    return (
        <div className="loading-center" style={{ minHeight: "60vh" }}>
            <span className="spinner" />
        </div>
    );
}
