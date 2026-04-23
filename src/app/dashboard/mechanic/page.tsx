"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import ChatBox from "@/components/ChatBox";
import LocationMap from "@/components/LocationMapDynamic";
import NotificationButton from "@/components/NotificationButton";

interface Profile {
    id: string;
    specialty: string | null;
    location: string | null;
    phone: string | null;
    documentUrl: string | null;
    verificationStatus: string;
    averageRating: number;
    totalReviews: number;
}

interface Booking {
    id: string;
    date: string;
    time: string;
    status: string;
    motorist: { name: string; email: string };
}

export default function MechanicDashboard() {
    const { data: session } = useSession();
    const [tab, setTab] = useState<"profile" | "bookings">("profile");

    // Profile
    const [profile, setProfile] = useState<Profile | null>(null);
    const [specialty, setSpecialty] = useState("");
    const [location, setLocation] = useState("");
    const [phone, setPhone] = useState("");
    const [documentUrl, setDocumentUrl] = useState("");
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState("");

    // Bookings
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(true);

    // Chat modal
    const [chatBooking, setChatBooking] = useState<Booking | null>(null);

    // GPS tracking modal
    const [trackingBooking, setTrackingBooking] = useState<Booking | null>(null);

    const fetchProfile = useCallback(async () => {
        const res = await fetch("/api/mechanics/profile");
        if (res.ok) {
            const data = await res.json();
            setProfile(data);
            setSpecialty(data.specialty || "");
            setLocation(data.location || "");
            setPhone(data.phone || "");
            setDocumentUrl(data.documentUrl || "");
            setLatitude(data.latitude != null ? String(data.latitude) : "");
            setLongitude(data.longitude != null ? String(data.longitude) : "");
        }
    }, []);

    const fetchBookings = useCallback(async () => {
        setLoadingBookings(true);
        const res = await fetch("/api/bookings");
        if (res.ok) {
            const data = await res.json();
            setBookings(data);
        }
        setLoadingBookings(false);
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useEffect(() => {
        if (tab === "bookings") fetchBookings();
    }, [tab, fetchBookings]);

    const handleSaveProfile = async () => {
        setProfileSaving(true);
        setProfileMsg("");
        const res = await fetch("/api/mechanics/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                specialty,
                location,
                phone,
                documentUrl,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
            }),
        });
        if (res.ok) {
            setProfileMsg("Profile updated successfully!");
            fetchProfile();
        } else {
            setProfileMsg("Failed to update profile");
        }
        setProfileSaving(false);
    };

    const handleBookingAction = async (bookingId: string, status: string) => {
        await fetch(`/api/bookings/${bookingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        fetchBookings();
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

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                    <h1 className="page-title">Mechanic Dashboard</h1>
                    <p className="page-subtitle">Welcome, {session?.user?.name}!</p>
                </div>
                <NotificationButton />
            </div>

            {/* Quick Stats */}
            {profile && (
                <div className="grid-4" style={{ marginBottom: 32 }}>
                    <div className="stat-card">
                        <div className="stat-value">{profile.averageRating.toFixed(1)}</div>
                        <div className="stat-label">Avg Rating</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{profile.totalReviews}</div>
                        <div className="stat-label">Reviews</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">
                            {getStatusBadge(profile.verificationStatus)}
                        </div>
                        <div className="stat-label">Verification</div>
                    </div>
                </div>
            )}

            <div className="tabs">
                <button
                    className={`tab ${tab === "profile" ? "active" : ""}`}
                    onClick={() => setTab("profile")}
                >
                    👤 My Profile
                </button>
                <button
                    className={`tab ${tab === "bookings" ? "active" : ""}`}
                    onClick={() => setTab("bookings")}
                >
                    📅 Incoming Bookings
                </button>
            </div>

            {tab === "profile" && (
                <div style={{ maxWidth: 600 }}>
                    <div className="card">
                        <h2 className="section-title">Edit Profile</h2>
                        {profileMsg && (
                            <div className={`alert ${profileMsg.includes("success") ? "alert-success" : "alert-error"}`}>
                                {profileMsg}
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Specialty</label>
                            <input
                                className="form-input"
                                placeholder="e.g. Engine Repair, Brakes, Auto Electrician"
                                value={specialty}
                                onChange={(e) => setSpecialty(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Location</label>
                            <input
                                className="form-input"
                                placeholder="e.g. Johannesburg, Cape Town"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input
                                className="form-input"
                                placeholder="+27 123 456 789"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Qualification Document URL</label>
                            <input
                                className="form-input"
                                placeholder="https://drive.google.com/..."
                                value={documentUrl}
                                onChange={(e) => setDocumentUrl(e.target.value)}
                            />
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                Upload your qualification document to a cloud drive and paste the share link here.
                            </span>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Workshop Coordinates</label>
                            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                <input
                                    className="form-input"
                                    placeholder="Latitude (e.g. -17.825)"
                                    value={latitude}
                                    onChange={(e) => setLatitude(e.target.value)}
                                    type="number"
                                    step="any"
                                    style={{ flex: 1 }}
                                />
                                <input
                                    className="form-input"
                                    placeholder="Longitude (e.g. 31.053)"
                                    value={longitude}
                                    onChange={(e) => setLongitude(e.target.value)}
                                    type="number"
                                    step="any"
                                    style={{ flex: 1 }}
                                />
                            </div>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                    if (navigator.geolocation) {
                                        navigator.geolocation.getCurrentPosition(
                                            (pos) => {
                                                setLatitude(String(pos.coords.latitude));
                                                setLongitude(String(pos.coords.longitude));
                                            },
                                            (err) => setProfileMsg(`GPS error: ${err.message}`)
                                        );
                                    } else {
                                        setProfileMsg("Geolocation is not supported by your browser");
                                    }
                                }}
                            >
                                📍 Use My Location
                            </button>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginTop: 4 }}>
                                Set your workshop or service area coordinates so motorists can find you on the map.
                            </span>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={handleSaveProfile}
                            disabled={profileSaving}
                        >
                            {profileSaving ? <span className="spinner" /> : "Save Changes"}
                        </button>
                    </div>
                </div>
            )}

            {tab === "bookings" && (
                <>
                    {loadingBookings ? (
                        <div className="loading-center"><span className="spinner" /></div>
                    ) : bookings.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📅</div>
                            <p className="empty-state-text">No incoming bookings yet.</p>
                        </div>
                    ) : (
                        <div className="grid-2">
                            {bookings.map((b) => (
                                <div key={b.id} className="card">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                        <div>
                                            <h3 style={{ fontWeight: 700, marginBottom: 4 }}>{b.motorist.name}</h3>
                                            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                                {b.motorist.email}
                                            </span>
                                        </div>
                                        {getStatusBadge(b.status)}
                                    </div>
                                    <div className="mechanic-meta" style={{ marginTop: 12 }}>
                                        <span>📅 {b.date}</span>
                                        <span>🕐 {b.time}</span>
                                    </div>
                                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                                        {b.status === "PENDING" && (
                                            <>
                                                <button
                                                    className="btn btn-success btn-sm"
                                                    onClick={() => handleBookingAction(b.id, "APPROVED")}
                                                >
                                                    ✅ Approve
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleBookingAction(b.id, "CANCELLED")}
                                                >
                                                    ❌ Decline
                                                </button>
                                            </>
                                        )}
                                        {b.status === "APPROVED" && (
                                            <button
                                                className="btn btn-warning btn-sm"
                                                onClick={() => handleBookingAction(b.id, "IN_PROGRESS")}
                                            >
                                                🚀 Start Job
                                            </button>
                                        )}
                                        {b.status === "IN_PROGRESS" && (
                                            <>
                                                <button
                                                    className="btn btn-success btn-sm"
                                                    onClick={() => handleBookingAction(b.id, "COMPLETED")}
                                                >
                                                    ✅ Mark Completed
                                                </button>
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => setTrackingBooking(b)}
                                                >
                                                    📍 Share Location
                                                </button>
                                            </>
                                        )}
                                        {["APPROVED", "IN_PROGRESS"].includes(b.status) && (
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => setChatBooking(b)}
                                            >
                                                💬 Chat
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Chat Modal */}
            {chatBooking && session?.user && (
                <div className="modal-overlay" onClick={() => setChatBooking(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">💬 Chat with {chatBooking.motorist.name}</h2>
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
                        <h2 className="modal-title">📍 Location Sharing</h2>
                        <LocationMap bookingId={trackingBooking.id} isMechanic={true} />
                        <button
                            className="btn btn-secondary"
                            onClick={() => setTrackingBooking(null)}
                            style={{ marginTop: 16, width: "100%" }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
