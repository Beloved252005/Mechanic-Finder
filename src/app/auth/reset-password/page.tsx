"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    if (!token) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="card" style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>❌</div>
                        <h1 className="auth-title">Invalid Link</h1>
                        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
                            This password reset link is invalid or has expired.
                        </p>
                        <Link href="/auth/forgot-password" className="btn btn-primary">
                            Request New Link
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirm) {
            setError("Passwords do not match");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong");
                setLoading(false);
                return;
            }

            setSuccess(true);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="card" style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>✅</div>
                        <h1 className="auth-title">Password Reset!</h1>
                        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
                            Your password has been successfully reset. You can now sign in with your new password.
                        </p>
                        <Link href="/auth/login" className="btn btn-primary" style={{ width: "100%" }}>
                            Sign In
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="card">
                    <h1 className="auth-title">New Password</h1>
                    <p className="auth-subtitle">Enter your new password below</p>

                    {error && <div className="alert alert-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: "100%" }}
                            disabled={loading}
                        >
                            {loading ? <span className="spinner" /> : "Reset Password"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="auth-container">
                <div className="loading-center"><span className="spinner" /></div>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
