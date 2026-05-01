"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Something went wrong");
                setLoading(false);
                return;
            }

            setSubmitted(true);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="card">
                    <h1 className="auth-title">Reset Password</h1>
                    <p className="auth-subtitle">
                        Enter your email and we&apos;ll send you a reset link
                    </p>

                    {submitted ? (
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📧</div>
                            <p style={{ color: "var(--text-secondary)", marginBottom: "24px", lineHeight: 1.6 }}>
                                If an account exists with <strong>{email}</strong>, you&apos;ll receive
                                a password reset link shortly.
                            </p>
                            <Link href="/auth/login" className="btn btn-primary" style={{ width: "100%" }}>
                                Back to Sign In
                            </Link>
                        </div>
                    ) : (
                        <>
                            {error && <div className="alert alert-error">{error}</div>}

                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: "100%" }}
                                    disabled={loading}
                                >
                                    {loading ? <span className="spinner" /> : "Send Reset Link"}
                                </button>
                            </form>

                            <p className="auth-footer">
                                Remember your password?{" "}
                                <Link href="/auth/login">Sign in</Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
