"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface LocationMapProps {
    bookingId: string;
    isMechanic?: boolean;
}

export default function LocationMap({ bookingId, isMechanic = false }: LocationMapProps) {
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [tracking, setTracking] = useState(false);
    const [error, setError] = useState("");
    const mapRef = useRef<HTMLDivElement>(null);
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

            <div ref={mapRef} style={styles.map}>
                {location ? (
                    <div style={styles.mapContent}>
                        <div style={styles.mapPin}>📍</div>
                        <div style={styles.coords}>
                            <div style={styles.coordLabel}>Latitude</div>
                            <div style={styles.coordValue}>{location.latitude.toFixed(6)}</div>
                            <div style={styles.coordLabel}>Longitude</div>
                            <div style={styles.coordValue}>{location.longitude.toFixed(6)}</div>
                        </div>
                        <a
                            href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ marginTop: 12 }}
                        >
                            🗺️ Open in Google Maps
                        </a>
                    </div>
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
    map: {
        borderRadius: "var(--radius)",
        background: "var(--bg-card)",
        border: "1px solid var(--glass-border)",
        minHeight: "200px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    mapContent: {
        textAlign: "center" as const,
        padding: "24px",
    },
    mapPin: {
        fontSize: "3rem",
        marginBottom: "12px",
        animation: "bounce 2s ease-in-out infinite",
    },
    coords: {
        display: "grid",
        gridTemplateColumns: "auto auto",
        gap: "4px 16px",
        textAlign: "left" as const,
    },
    coordLabel: {
        fontSize: "0.75rem",
        color: "var(--text-muted)",
        textTransform: "uppercase" as const,
        letterSpacing: "0.05em",
    },
    coordValue: {
        fontSize: "0.9rem",
        fontFamily: "var(--font-mono), monospace",
        color: "var(--primary-light)",
    },
    noLocation: {
        textAlign: "center" as const,
        padding: "32px",
        color: "var(--text-muted)",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        gap: "8px",
    },
};
