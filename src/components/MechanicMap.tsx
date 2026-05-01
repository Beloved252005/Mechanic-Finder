"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icons in Next.js
const defaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Highlighted marker for the closest mechanic (green)
const closestIcon = L.divIcon({
    html: `<div class="closest-marker-pin"><span>⭐</span></div>`,
    className: "closest-marker-icon",
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -40],
});

// Blue circle marker for user location
const userIcon = L.divIcon({
    html: `<div class="user-location-dot"><div class="user-location-pulse"></div></div>`,
    className: "user-location-icon",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
});

L.Marker.prototype.options.icon = defaultIcon;

interface NearbyMechanic {
    id: string;
    name: string;
    specialty: string | null;
    latitude: number;
    longitude: number;
    rating: number;
    totalReviews: number;
    location: string | null;
    phone: string | null;
}

interface MechanicWithDistance extends NearbyMechanic {
    distance: number;
}

interface MechanicMapProps {
    onBook: (mechanic: NearbyMechanic) => void;
}

// Haversine formula to calculate distance between two coordinates in km
function haversineDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Estimate travel time based on distance (average city driving ~30km/h)
function estimateETA(distanceKm: number): string {
    if (distanceKm < 0.5) return "< 2 min";
    const minutes = Math.round((distanceKm / 30) * 60);
    if (minutes < 60) return `~${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainMin = minutes % 60;
    return `~${hours}h ${remainMin}m`;
}

// Format distance for display
function formatDistance(distanceKm: number): string {
    if (distanceKm < 1) return `${(distanceKm * 1000).toFixed(0)}m`;
    return `${distanceKm.toFixed(1)}km`;
}

// Component to auto-fit map bounds to show all markers
function FitBounds({ userLat, userLng, mechanics }: { userLat: number; userLng: number; mechanics: MechanicWithDistance[] }) {
    const map = useMap();
    const fittedRef = useRef(false);

    useEffect(() => {
        if (fittedRef.current) return;
        if (mechanics.length === 0) {
            map.setView([userLat, userLng], 13);
            fittedRef.current = true;
            return;
        }

        const points: L.LatLngExpression[] = [
            [userLat, userLng],
            ...mechanics.map((m) => [m.latitude, m.longitude] as L.LatLngExpression),
        ];

        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        fittedRef.current = true;
    }, [userLat, userLng, mechanics, map]);

    return null;
}

function renderStars(rating: number): string {
    const full = Math.round(rating);
    return "★".repeat(full) + "☆".repeat(5 - full);
}

export default function MechanicMap({ onBook }: MechanicMapProps) {
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [mechanics, setMechanics] = useState<MechanicWithDistance[]>([]);
    const [loading, setLoading] = useState(true);
    const [locationError, setLocationError] = useState("");
    const fetchedRef = useRef(false);
    const mapRef = useRef<L.Map | null>(null);
    const markerRefs = useRef<Map<string, L.Marker>>(new Map());
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    // Get user location
    useEffect(() => {
        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported by your browser");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            },
            (err) => {
                setLocationError(`Location access denied: ${err.message}. Using default location.`);
                // Default to Harare, Zimbabwe as fallback
                setUserLocation({ lat: -17.8252, lng: 31.0335 });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    }, []);

    // Fetch nearby mechanics once
    const fetchMechanics = useCallback(async (userLat: number, userLng: number) => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        try {
            const res = await fetch("/api/mechanics/nearby");
            if (res.ok) {
                const data: NearbyMechanic[] = await res.json();
                const withDistance = data.map((m) => ({
                    ...m,
                    distance: haversineDistance(userLat, userLng, m.latitude, m.longitude),
                }));
                withDistance.sort((a, b) => a.distance - b.distance);
                setMechanics(withDistance);
            }
        } catch {
            // silent
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (userLocation) {
            fetchMechanics(userLocation.lat, userLocation.lng);
        }
    }, [userLocation, fetchMechanics]);

    // Fly to a mechanic on the map and open their popup
    const flyToMechanic = useCallback((mechanic: MechanicWithDistance) => {
        if (mapRef.current) {
            mapRef.current.flyTo([mechanic.latitude, mechanic.longitude], 16, {
                duration: 1.2,
            });
            // Open the marker's popup after flying
            setTimeout(() => {
                const marker = markerRefs.current.get(mechanic.id);
                if (marker) marker.openPopup();
            }, 1300);
        }
        setHighlightedId(mechanic.id);
    }, []);

    // Recenter map on user
    const recenterOnUser = useCallback(() => {
        if (mapRef.current && userLocation) {
            mapRef.current.flyTo([userLocation.lat, userLocation.lng], 13, {
                duration: 1,
            });
        }
        setHighlightedId(null);
    }, [userLocation]);

    // Fit all markers in view
    const fitAllMarkers = useCallback(() => {
        if (!mapRef.current || !userLocation) return;
        if (mechanics.length === 0) {
            mapRef.current.flyTo([userLocation.lat, userLocation.lng], 13, { duration: 1 });
            return;
        }
        const points: L.LatLngExpression[] = [
            [userLocation.lat, userLocation.lng],
            ...mechanics.map((m) => [m.latitude, m.longitude] as L.LatLngExpression),
        ];
        const bounds = L.latLngBounds(points);
        mapRef.current.flyToBounds(bounds, { padding: [50, 50], maxZoom: 15, duration: 1 });
        setHighlightedId(null);
    }, [userLocation, mechanics]);

    if (!userLocation) {
        return (
            <div className="loading-center" style={{ padding: "60px 0" }}>
                {locationError ? (
                    <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                        <span style={{ fontSize: "2rem" }}>📍</span>
                        <p>{locationError}</p>
                    </div>
                ) : (
                    <>
                        <span className="spinner" />
                        <p style={{ color: "var(--text-muted)", marginTop: 12 }}>Getting your location...</p>
                    </>
                )}
            </div>
        );
    }

    return (
        <div>
            {locationError && (
                <div className="alert alert-error" style={{ marginBottom: 16 }}>
                    {locationError}
                </div>
            )}

            {/* Map Section */}
            <div style={mapStyles.mapWrapper}>
                <MapContainer
                    center={[userLocation.lat, userLocation.lng]}
                    zoom={13}
                    style={{ height: "100%", width: "100%", borderRadius: "var(--radius)" }}
                    scrollWheelZoom={true}
                    ref={mapRef}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <FitBounds userLat={userLocation.lat} userLng={userLocation.lng} mechanics={mechanics} />

                    {/* User location marker */}
                    <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                        <Popup>
                            <div style={{ textAlign: "center", fontWeight: 600 }}>
                                📍 Your Location
                            </div>
                        </Popup>
                    </Marker>

                    {/* Mechanic markers */}
                    {mechanics.map((m, index) => (
                        <Marker
                            key={m.id}
                            position={[m.latitude, m.longitude]}
                            icon={index === 0 ? closestIcon : defaultIcon}
                            ref={(ref) => {
                                if (ref) markerRefs.current.set(m.id, ref);
                            }}
                        >
                            <Popup>
                                <div style={mapStyles.popup}>
                                    {index === 0 && (
                                        <div style={mapStyles.nearestBadge}>⭐ Nearest Mechanic</div>
                                    )}
                                    <div style={mapStyles.popupName}>{m.name}</div>
                                    {m.specialty && (
                                        <div style={mapStyles.popupSpecialty}>🔧 {m.specialty}</div>
                                    )}
                                    <div style={mapStyles.popupRating}>
                                        <span style={{ color: "#f59e0b" }}>{renderStars(m.rating)}</span>
                                        {" "}{m.rating.toFixed(1)} ({m.totalReviews})
                                    </div>
                                    <div style={mapStyles.popupDistance}>
                                        📏 {formatDistance(m.distance)} away
                                    </div>
                                    <div style={mapStyles.popupEta}>
                                        🚗 ETA: {estimateETA(m.distance)}
                                    </div>
                                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => onBook(m)}
                                            style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                                        >
                                            📅 Book
                                        </button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>

                {/* Floating map controls */}
                <div style={mapStyles.floatingControls}>
                    <button
                        onClick={recenterOnUser}
                        style={mapStyles.floatingBtn}
                        title="Re-center on my location"
                    >
                        📍
                    </button>
                    <button
                        onClick={fitAllMarkers}
                        style={mapStyles.floatingBtn}
                        title="Show all mechanics"
                    >
                        🗺️
                    </button>
                </div>
            </div>

            {/* Nearby Mechanics List */}
            <div style={{ marginTop: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 16 }}>
                    📋 Nearby Mechanics ({mechanics.length})
                </h3>

                {loading ? (
                    <div className="loading-center"><span className="spinner" /></div>
                ) : mechanics.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔧</div>
                        <p className="empty-state-text">
                            No verified mechanics with coordinates found. Mechanics need to set their location in their profile.
                        </p>
                    </div>
                ) : (
                    <div className="grid-2">
                        {mechanics.map((m, index) => (
                            <div
                                key={m.id}
                                className={`card mechanic-card ${index === 0 ? "mechanic-card-nearest" : ""} ${highlightedId === m.id ? "mechanic-card-highlighted" : ""}`}
                                onClick={() => flyToMechanic(m)}
                                style={{ cursor: "pointer" }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                    <div>
                                        <h3 className="mechanic-name">{m.name}</h3>
                                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                                            <span className="verified-badge">✅ Verified</span>
                                            {index === 0 && (
                                                <span className="nearest-badge">⭐ Nearest</span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <span className="stars">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <span key={s} className={`star ${s <= Math.round(m.rating) ? "filled" : ""}`}>
                                                    ★
                                                </span>
                                            ))}
                                        </span>
                                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                                            {m.rating.toFixed(1)} ({m.totalReviews} reviews)
                                        </div>
                                    </div>
                                </div>
                                <div className="mechanic-meta">
                                    {m.specialty && <span>🔧 {m.specialty}</span>}
                                    {m.location && <span>📍 {m.location}</span>}
                                    {m.phone && <span>📞 {m.phone}</span>}
                                    <span className="distance-tag">📏 {formatDistance(m.distance)}</span>
                                    <span className="eta-tag">🚗 ETA: {estimateETA(m.distance)}</span>
                                </div>
                                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onBook(m);
                                        }}
                                    >
                                        📅 Book Appointment
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            flyToMechanic(m);
                                        }}
                                    >
                                        🗺️ View on Map
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const mapStyles: Record<string, React.CSSProperties> = {
    mapWrapper: {
        height: "450px",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        border: "1px solid var(--border-color)",
        position: "relative",
    },
    popup: {
        minWidth: 180,
        padding: 4,
    },
    nearestBadge: {
        background: "linear-gradient(135deg, #f59e0b, #d97706)",
        color: "#fff",
        fontWeight: 700,
        fontSize: "0.7rem",
        padding: "2px 8px",
        borderRadius: "8px",
        marginBottom: 6,
        display: "inline-block",
        textTransform: "uppercase" as const,
        letterSpacing: "0.05em",
    },
    popupName: {
        fontWeight: 700,
        fontSize: "1rem",
        marginBottom: 4,
    },
    popupSpecialty: {
        fontSize: "0.85rem",
        color: "#666",
        marginBottom: 2,
    },
    popupRating: {
        fontSize: "0.85rem",
        marginBottom: 2,
    },
    popupDistance: {
        fontSize: "0.85rem",
        color: "#666",
    },
    popupEta: {
        fontSize: "0.8rem",
        color: "#2563EB",
        fontWeight: 600,
        marginTop: 2,
    },
    floatingControls: {
        position: "absolute" as const,
        top: 10,
        right: 10,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column" as const,
        gap: 6,
    },
    floatingBtn: {
        width: 38,
        height: 38,
        borderRadius: "10px",
        border: "1px solid var(--border-color)",
        background: "var(--bg-card)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.1rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        transition: "all 0.2s ease",
    },
};
