"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("MOTORIST");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, role }),
        });

        const data = await res.json();

        if (!res.ok) {
            setError(data.error);
            setLoading(false);
            return;
        }

        router.push("/auth/login?registered=true");
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="card">
                    <h1 className="auth-title">Create Account</h1>
                    <p className="auth-subtitle">Join Auto-Link today</p>

                    {error && <div className="alert alert-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">I am a</label>
                            <select
                                className="form-select"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            >
                                <option value="MOTORIST">Motorist — I need a mechanic</option>
                                <option value="MECHANIC">Mechanic — I offer services</option>
                            </select>
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
                            {loading ? <span className="spinner" /> : "Create Account"}
                        </button>
                    </form>

                    <p className="auth-footer">
                        Already have an account?{" "}
                        <Link href="/auth/login">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
