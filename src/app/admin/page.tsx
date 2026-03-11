"use client";

import { useState, useEffect, useCallback } from "react";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
}

interface MechanicProfile {
    id: string;
    specialty: string | null;
    location: string | null;
    documentUrl: string | null;
    verificationStatus: string;
    averageRating: number;
    totalReviews: number;
    user: { name: string; email: string };
}

interface Booking {
    id: string;
    date: string;
    time: string;
    status: string;
    motorist: { name: string; email: string };
    mechanic: { user: { name: string } };
}

interface Review {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    motorist: { name: string };
    mechanic: { user: { name: string } };
}

export default function AdminDashboard() {
    const [tab, setTab] = useState<"verification" | "users" | "bookings" | "reviews">("verification");

    const [mechanics, setMechanics] = useState<MechanicProfile[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        if (tab === "verification") {
            const res = await fetch("/api/admin/mechanics");
            setMechanics(await res.json());
        } else if (tab === "users") {
            const res = await fetch("/api/admin/users");
            setUsers(await res.json());
        } else if (tab === "bookings") {
            const res = await fetch("/api/admin/bookings");
            setBookings(await res.json());
        } else if (tab === "reviews") {
            const res = await fetch("/api/admin/reviews");
            setReviews(await res.json());
        }
        setLoading(false);
    }, [tab]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleVerification = async (mechanicId: string, status: string) => {
        await fetch("/api/admin/mechanics", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mechanicId, status }),
        });
        fetchData();
    };

    const handleDeleteReview = async (reviewId: string) => {
        await fetch(`/api/admin/reviews?id=${reviewId}`, { method: "DELETE" });
        fetchData();
    };

    const getStatusBadge = (status: string) => {
        const cls =
            status === "PENDING" ? "badge-pending" :
                status === "APPROVED" ? "badge-approved" :
                    status === "IN_PROGRESS" ? "badge-in-progress" :
                        status === "COMPLETED" ? "badge-completed" :
                            status === "REJECTED" ? "badge-rejected" :
                                "badge-cancelled";
        return <span className={`badge ${cls}`}>{status.replace("_", " ")}</span>;
    };

    const renderStars = (rating: number) => (
        <span className="stars">
            {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} className={`star ${s <= rating ? "filled" : ""}`}>★</span>
            ))}
        </span>
    );

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Admin Dashboard</h1>
                <p className="page-subtitle">
                    System monitoring and management
                </p>
            </div>

            <div className="tabs">
                <button className={`tab ${tab === "verification" ? "active" : ""}`} onClick={() => setTab("verification")}>
                    🛡️ Verification
                </button>
                <button className={`tab ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>
                    👥 Users
                </button>
                <button className={`tab ${tab === "bookings" ? "active" : ""}`} onClick={() => setTab("bookings")}>
                    📅 Bookings
                </button>
                <button className={`tab ${tab === "reviews" ? "active" : ""}`} onClick={() => setTab("reviews")}>
                    ⭐ Reviews
                </button>
            </div>

            {loading ? (
                <div className="loading-center"><span className="spinner" /></div>
            ) : (
                <>
                    {/* Verification Tab */}
                    {tab === "verification" && (
                        <>
                            {mechanics.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-state-icon">🛡️</div>
                                    <p className="empty-state-text">No mechanics registered yet.</p>
                                </div>
                            ) : (
                                <div className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Email</th>
                                                <th>Specialty</th>
                                                <th>Location</th>
                                                <th>Document</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mechanics.map((m) => (
                                                <tr key={m.id}>
                                                    <td style={{ fontWeight: 600 }}>{m.user.name}</td>
                                                    <td style={{ color: "var(--text-muted)" }}>{m.user.email}</td>
                                                    <td>{m.specialty || "—"}</td>
                                                    <td>{m.location || "—"}</td>
                                                    <td>
                                                        {m.documentUrl ? (
                                                            <a
                                                                href={m.documentUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{ color: "var(--primary-light)" }}
                                                            >
                                                                View
                                                            </a>
                                                        ) : (
                                                            <span style={{ color: "var(--text-muted)" }}>None</span>
                                                        )}
                                                    </td>
                                                    <td>{getStatusBadge(m.verificationStatus)}</td>
                                                    <td>
                                                        <div style={{ display: "flex", gap: 6 }}>
                                                            {m.verificationStatus !== "APPROVED" && (
                                                                <button
                                                                    className="btn btn-success btn-sm"
                                                                    onClick={() => handleVerification(m.id, "APPROVED")}
                                                                >
                                                                    Approve
                                                                </button>
                                                            )}
                                                            {m.verificationStatus !== "REJECTED" && (
                                                                <button
                                                                    className="btn btn-danger btn-sm"
                                                                    onClick={() => handleVerification(m.id, "REJECTED")}
                                                                >
                                                                    Reject
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}

                    {/* Users Tab */}
                    {tab === "users" && (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Registered</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id}>
                                            <td style={{ fontWeight: 600 }}>{u.name}</td>
                                            <td style={{ color: "var(--text-muted)" }}>{u.email}</td>
                                            <td>
                                                <span className={`badge ${u.role === "ADMIN" ? "badge-completed" :
                                                    u.role === "MECHANIC" ? "badge-approved" :
                                                        "badge-pending"
                                                    }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td style={{ color: "var(--text-muted)" }}>
                                                {new Date(u.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Bookings Tab */}
                    {tab === "bookings" && (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Motorist</th>
                                        <th>Mechanic</th>
                                        <th>Date</th>
                                        <th>Time</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookings.map((b) => (
                                        <tr key={b.id}>
                                            <td style={{ fontWeight: 600 }}>{b.motorist.name}</td>
                                            <td>{b.mechanic.user.name}</td>
                                            <td>{b.date}</td>
                                            <td>{b.time}</td>
                                            <td>{getStatusBadge(b.status)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Reviews Tab */}
                    {tab === "reviews" && (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Motorist</th>
                                        <th>Mechanic</th>
                                        <th>Rating</th>
                                        <th>Comment</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reviews.map((r) => (
                                        <tr key={r.id}>
                                            <td style={{ fontWeight: 600 }}>{r.motorist.name}</td>
                                            <td>{r.mechanic.user.name}</td>
                                            <td>{renderStars(r.rating)}</td>
                                            <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {r.comment || "—"}
                                            </td>
                                            <td style={{ color: "var(--text-muted)" }}>
                                                {new Date(r.createdAt).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleDeleteReview(r.id)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
