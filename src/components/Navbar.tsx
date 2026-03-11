"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
    const { data: session } = useSession();

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <Link href="/" className="navbar-brand">
                    🚗 Auto-Link
                </Link>
                <div className="navbar-links">
                    {session ? (
                        <>
                            <Link href="/dashboard" className="navbar-link">
                                Dashboard
                            </Link>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "0 8px" }}>
                                {session.user.name}
                            </span>
                            <button
                                onClick={() => signOut({ callbackUrl: "/" })}
                                className="btn btn-secondary btn-sm"
                            >
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/auth/login" className="navbar-link">
                                Sign In
                            </Link>
                            <Link href="/auth/register" className="btn btn-primary btn-sm">
                                Get Started
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
