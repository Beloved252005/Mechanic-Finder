"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import ChatBox from "@/components/ChatBox";
import LocationMap from "@/components/LocationMapDynamic";
import NotificationButton from "@/components/NotificationButton";
import MechanicMapDynamic from "@/components/MechanicMapDynamic";

interface MechanicProfile {
    id: string;
    userId: string;
    specialty: string | null;
    location: string | null;
    phone: string | null;
    verificationStatus: string;
    averageRating: number;
    totalReviews: number;
    user: { name: string; email: string };
}

interface Booking {
    id: string;
    mechanicId: string;
    date: string;
    time: string;
    status: string;
    mechanic: { id: string; userId: string; user: { name: string } };
    review: { id: string } | null;
}

export default function MotoristDashboard() {
    const { data: session } = useSession();
    const [tab, setTab] = useState<"search" | "bookings">("search");

    // Booking modal accepts both MechanicProfile (from old list) or map mechanic shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [bookingMechanic, setBookingMechanic] = useState<any>(null);

    // Booking state
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(true);

    // Booking modal
    const [bookingModal, setBookingModal] = useState<MechanicProfile | null>(null);
    const [bookingMechanicName, setBookingMechanicName] = useState("");
    const [bookingDate, setBookingDate] = useState("");
    const [bookingTime, setBookingTime] = useState("");
    const [bookingError, setBookingError] = useState("");
    const [bookingSuccess, setBookingSuccess] = useState("");

    // Review modal
    const [reviewModal, setReviewModal] = useState<Booking | null>(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");
    const [reviewError, setReviewError] = useState("");

    // Chat modal
    const [chatBooking, setChatBooking] = useState<Booking | null>(null);

    // GPS tracking modal
    const [trackingBooking, setTrackingBooking] = useState<Booking | null>(null);

    // Handler for when a mechanic is selected from the map
    const handleMapBook = useCallback((mechanic: { id: string; name: string }) => {
        // Build a minimal MechanicProfile shape to open the booking modal
        setBookingModal({ id: mechanic.id } as MechanicProfile);
        setBookingMechanicName(mechanic.name);
        setBookingError("");
        setBookingSuccess("");
    }, []);

    const fetchBookings = useCallback(async () => {
        setLoadingBookings(true);
        const res = await fetch("/api/bookings");
        const data = await res.json();
        setBookings(data);
        setLoadingBookings(false);
    }, []);

    useEffect(() => {
        if (tab === "bookings") fetchBookings();
    }, [tab, fetchBookings]);

    const handleBook = async () => {
        if (!bookingModal) return;
        setBookingError("");
        setBookingSuccess("");

        if (!bookingDate || !bookingTime) {
            setBookingError("Please select both date and time");
            return;
        }

        const res = await fetch("/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mechanicId: bookingModal.id,
                date: bookingDate,
                time: bookingTime,
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            setBookingError(data.error);
            return;
        }
        setBookingSuccess("Booking created successfully!");
        setBookingDate("");
        setBookingTime("");
        setTimeout(() => {
            setBookingModal(null);
            setBookingSuccess("");
        }, 1500);
    };

    const handleCancelBooking = async (bookingId: string) => {
        await fetch(`/api/bookings/${bookingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "CANCELLED" }),
        });
        fetchBookings();
    };

    const handleReview = async () => {
        if (!reviewModal) return;
        setReviewError("");

        const res = await fetch("/api/reviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                bookingId: reviewModal.id,
                rating: reviewRating,
                comment: reviewComment,
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            setReviewError(data.error);
            return;
        }
        setReviewModal(null);
        setReviewComment("");
        setReviewRating(5);
        fetchBookings();
    };

    const renderStars = (rating: number) => {
        return (
            <span className="stars">
                {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={`star ${s <= rating ? "filled" : ""}`}>
                        ★
                    </span>
                ))}
            </span>
        );
    };

    const getStatusBadge = (status: string) => {
        const cls =
            status === "PENDING" ? "badge-pending" :
                status === "APPROVED" ? "badge-approved" :
                    status === "IN_PROGRESS" ? "badge-in-progress" :
                        status === "COMPLETED" ? "badge-completed" :
                            "badge-cancelled";
        return <span className={`badge ${cls}`}>{status.replace("_", " ")}</span>;
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                    <h1 className="page-title">Motorist Dashboard</h1>
                    <p className="page-subtitle">
                        Welcome back, {session?.user?.name}! Find and book verified mechanics.
                    </p>
                </div>
                <NotificationButton />
            </div>

            <div className="tabs">
                <button
                    className={`tab ${tab === "search" ? "active" : ""}`}
                    onClick={() => setTab("search")}
                >
                    🔍 Find Mechanics
                </button>
                <button
                    className={`tab ${tab === "bookings" ? "active" : ""}`}
                    onClick={() => setTab("bookings")}
                >
                    📅 My Bookings
                </button>
            </div>

            {tab === "search" && (
                <MechanicMapDynamic onBook={handleMapBook} />
            )}

            {tab === "bookings" && (
                <>
                    {loadingBookings ? (
                        <div className="loading-center"><span className="spinner" /></div>
                    ) : bookings.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📅</div>
                            <p className="empty-state-text">No bookings yet. Find a mechanic to get started!</p>
                        </div>
                    ) : (
                        <div className="grid-2">
                            {bookings.map((b) => (
                                <div key={b.id} className="card">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                        <h3 style={{ fontWeight: 700, fontSize: "1.05rem" }}>{b.mechanic.user.name}</h3>
                                        {getStatusBadge(b.status)}
                                    </div>
                                    <div className="mechanic-meta" style={{ marginTop: 12 }}>
                                        <span>📅 {b.date}</span>
                                        <span>🕐 {b.time}</span>
                                    </div>
                                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                                        {b.status === "PENDING" && (
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleCancelBooking(b.id)}
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        {b.status === "IN_PROGRESS" && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => setTrackingBooking(b)}
                                            >
                                                📍 Track Mechanic
                                            </button>
                                        )}
                                        {["APPROVED", "IN_PROGRESS"].includes(b.status) && (
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => setChatBooking(b)}
                                            >
                                                💬 Chat
                                            </button>
                                        )}
                                        {b.status === "COMPLETED" && !b.review && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => {
                                                    setReviewModal(b);
                                                    setReviewError("");
                                                }}
                                            >
                                                ⭐ Leave Review
                                            </button>
                                        )}
                                        {b.review && (
                                            <span style={{ fontSize: "0.85rem", color: "var(--success)" }}>
                                                ✅ Reviewed
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Booking Modal */}
            {bookingModal && (
                <div className="modal-overlay" onClick={() => setBookingModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">
                            Book {bookingModal.user?.name || bookingMechanicName}
                        </h2>
                        {bookingError && <div className="alert alert-error">{bookingError}</div>}
                        {bookingSuccess && <div className="alert alert-success">{bookingSuccess}</div>}
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <input
                                type="date"
                                className="form-input"
                                value={bookingDate}
                                onChange={(e) => setBookingDate(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Time</label>
                            <select
                                className="form-select"
                                value={bookingTime}
                                onChange={(e) => setBookingTime(e.target.value)}
                            >
                                <option value="">Select time...</option>
                                {["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"].map(
                                    (t) => (
                                        <option key={t} value={t}>{t}</option>
                                    )
                                )}
                            </select>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                            <button className="btn btn-primary" onClick={handleBook}>
                                Confirm Booking
                            </button>
                            <button className="btn btn-secondary" onClick={() => setBookingModal(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {reviewModal && (
                <div className="modal-overlay" onClick={() => setReviewModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Leave a Review</h2>
                        {reviewError && <div className="alert alert-error">{reviewError}</div>}
                        <div className="form-group">
                            <label className="form-label">Rating</label>
                            <div className="stars" style={{ fontSize: "1.8rem", cursor: "pointer" }}>
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <span
                                        key={s}
                                        className={`star ${s <= reviewRating ? "filled" : ""}`}
                                        onClick={() => setReviewRating(s)}
                                    >
                                        ★
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Comment (optional)</label>
                            <textarea
                                className="form-textarea"
                                placeholder="Share your experience..."
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                            />
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                            <button className="btn btn-primary" onClick={handleReview}>
                                Submit Review
                            </button>
                            <button className="btn btn-secondary" onClick={() => setReviewModal(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Modal */}
            {chatBooking && session?.user && (
                <div className="modal-overlay" onClick={() => setChatBooking(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">💬 Chat with {chatBooking.mechanic.user.name}</h2>
                        <ChatBox bookingId={chatBooking.id} currentUserId={session.user.id} />
                        <button
                            className="btn btn-secondary"
                            onClick={() => setChatBooking(null)}
                            style={{ marginTop: 16, width: "100%" }}
                        >
                            Close Chat
                        </button>
                    </div>
                </div>
            )}

            {/* GPS Tracking Modal */}
            {trackingBooking && (
                <div className="modal-overlay" onClick={() => setTrackingBooking(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">📍 Tracking {trackingBooking.mechanic.user.name}</h2>
                        <LocationMap bookingId={trackingBooking.id} isMechanic={false} />
                        <button
                            className="btn btn-secondary"
                            onClick={() => setTrackingBooking(null)}
                            style={{ marginTop: 16, width: "100%" }}
                        >
                            Close Tracking
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
