"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Mechanic pin icon
const mechanicIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = mechanicIcon;

interface LocationMapProps {
    bookingId: string;
    isMechanic?: boolean;
}

// Helper: smoothly re-center map on new coordinates
function RecenterOnUpdate({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], map.getZoom(), { animate: true });
    }, [lat, lng, map]);
    return null;
}

export default function LocationMap({ bookingId, isMechanic = false }: LocationMapProps) {
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [tracking, setTracking] = useState(false);
    const [error, setError] = useState("");
    const watchIdRef = useRef<number | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Mechanic: send GPS updates
    const startTracking = useCallback(() => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            return;
        }

        setTracking(true);
        setError("");

        watchIdRef.current = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ latitude, longitude });

                try {
                    await fetch("/api/location", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ bookingId, latitude, longitude }),
                    });
                } catch {
                    // silent
                }
            },
            (err) => {
                setError(`GPS error: ${err.message}`);
                setTracking(false);
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
    }, [bookingId]);

    const stopTracking = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setTracking(false);
    }, []);

    // Motorist: poll for location updates
    const fetchLocation = useCallback(async () => {
        try {
            const res = await fetch(`/api/location?bookingId=${bookingId}`);
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setLocation({ latitude: data.latitude, longitude: data.longitude });
                }
            }
        } catch {
            // silent
        }
    }, [bookingId]);

    useEffect(() => {
        if (!isMechanic) {
            fetchLocation();
            intervalRef.current = setInterval(fetchLocation, 5000);
            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
            };
        }
        return () => {
            stopTracking();
        };
    }, [isMechanic, fetchLocation, stopTracking]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopTracking();
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [stopTracking]);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.headerIcon}>📍</span>
                <span style={styles.headerText}>
                    {isMechanic ? "Location Sharing" : "Mechanic Location"}
                </span>
                {tracking && (
                    <span style={styles.liveIndicator}>
                        <span style={styles.liveDot} /> LIVE
                    </span>
                )}
            </div>

            {error && <div style={styles.error}>{error}</div>}

            {isMechanic && !tracking && (
                <button className="btn btn-primary btn-sm" onClick={startTracking} style={{ marginBottom: 12 }}>
                    📍 Start Sharing Location
                </button>
            )}

            {isMechanic && tracking && (
                <button className="btn btn-danger btn-sm" onClick={stopTracking} style={{ marginBottom: 12 }}>
                    ⏹ Stop Sharing
                </button>
            )}

            <div style={styles.mapArea}>
                {location ? (
                    <>
                        <MapContainer
                            center={[location.latitude, location.longitude]}
                            zoom={15}
                            style={{ height: "100%", width: "100%", borderRadius: "var(--radius)" }}
                            scrollWheelZoom={true}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <RecenterOnUpdate lat={location.latitude} lng={location.longitude} />
                            <Marker position={[location.latitude, location.longitude]} icon={mechanicIcon}>
                                <Popup>
                                    <div style={{ textAlign: "center", fontWeight: 600 }}>
                                        {isMechanic ? "📍 Your Location" : "🔧 Mechanic Location"}
                                        <div style={{ fontSize: "0.75rem", color: "#666", marginTop: 4 }}>
                                            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        </MapContainer>
                        <div style={styles.coordBar}>
                            <span>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
                            <a
                                href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={styles.gmapsLink}
                            >
                                🗺️ Google Maps
                            </a>
                        </div>
                    </>
                ) : (
                    <div style={styles.noLocation}>
                        <span style={{ fontSize: "2rem" }}>🗺️</span>
                        <p>{isMechanic ? "Start sharing to broadcast your location" : "Waiting for mechanic location..."}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        borderRadius: "var(--radius)",
        border: "1px solid var(--border-color)",
        background: "var(--bg-primary)",
        padding: "16px",
        overflow: "hidden",
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "12px",
    },
    headerIcon: {
        fontSize: "1.2rem",
    },
    headerText: {
        fontWeight: 600,
        fontSize: "0.95rem",
    },
    liveIndicator: {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "12px",
        background: "rgba(239, 68, 68, 0.15)",
        color: "#ef4444",
        fontSize: "0.7rem",
        fontWeight: 700,
        marginLeft: "auto",
    },
    liveDot: {
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        background: "#ef4444",
        animation: "pulse 1.5s ease-in-out infinite",
    },
    error: {
        padding: "8px 12px",
        borderRadius: "8px",
        background: "rgba(239, 68, 68, 0.1)",
        border: "1px solid rgba(239, 68, 68, 0.3)",
        color: "#ef4444",
        fontSize: "0.85rem",
        marginBottom: "12px",
    },
    mapArea: {
        borderRadius: "var(--radius)",
        overflow: "hidden",
        border: "1px solid var(--glass-border)",
        height: "300px",
        position: "relative" as const,
    },
    coordBar: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 12px",
        background: "var(--bg-secondary)",
        borderTop: "1px solid var(--border-color)",
        fontSize: "0.75rem",
        fontFamily: "var(--font-mono), monospace",
        color: "var(--text-muted)",
        position: "absolute" as const,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
    },
    gmapsLink: {
        color: "var(--primary-light)",
        textDecoration: "none",
        fontWeight: 600,
        fontFamily: "var(--font-sans), system-ui, sans-serif",
    },
    noLocation: {
        textAlign: "center" as const,
        padding: "32px",
        color: "var(--text-muted)",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: "8px",
    },
};
