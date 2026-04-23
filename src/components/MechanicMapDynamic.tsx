"use client";

import dynamic from "next/dynamic";

// Leaflet requires browser APIs (window, document) so we must disable SSR
const MechanicMap = dynamic(() => import("@/components/MechanicMap"), {
    ssr: false,
    loading: () => (
        <div className="loading-center" style={{ padding: "60px 0" }}>
            <span className="spinner" />
            <p style={{ color: "var(--text-muted)", marginTop: 12 }}>Loading map...</p>
        </div>
    ),
});

export default MechanicMap;
