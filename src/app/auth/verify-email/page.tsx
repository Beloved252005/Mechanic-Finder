"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    if (error) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="card" style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>❌</div>
                        <h1 className="auth-title">Verification Failed</h1>
                        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
                            This verification link is invalid or has already been used.
                        </p>
                        <Link href="/auth/login" className="btn btn-primary">
                            Go to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="card" style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "16px" }}>✉️</div>
                    <h1 className="auth-title">Check Your Email</h1>
                    <p style={{ color: "var(--text-secondary)", marginBottom: "24px", lineHeight: 1.6 }}>
                        We&apos;ve sent a verification link to your email address.
                        Please click the link to verify your account.
                    </p>
                    <Link href="/auth/login" className="btn btn-primary" style={{ width: "100%" }}>
                        Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="auth-container">
                <div className="loading-center"><span className="spinner" /></div>
            </div>
        }>
            <VerifyContent />
        </Suspense>
    );
}
