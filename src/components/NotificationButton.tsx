"use client";

import { useState, useEffect } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function NotificationButton() {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if ("serviceWorker" in navigator && "PushManager" in window) {
            setIsSupported(true);
            checkSubscription();
        }
    }, []);

    const checkSubscription = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch {
            // silent
        }
    };

    const subscribe = async () => {
        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
            });

            const subJSON = subscription.toJSON();

            await fetch("/api/notifications/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    endpoint: subJSON.endpoint,
                    p256dh: subJSON.keys?.p256dh,
                    auth: subJSON.keys?.auth,
                }),
            });

            setIsSubscribed(true);
        } catch (err) {
            console.error("Push subscription failed:", err);
        }
        setLoading(false);
    };

    const unsubscribe = async () => {
        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                await fetch(`/api/notifications/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
                    method: "DELETE",
                });
            }
            setIsSubscribed(false);
        } catch (err) {
            console.error("Unsubscribe failed:", err);
        }
        setLoading(false);
    };

    if (!isSupported) return null;

    return (
        <button
            className={`btn ${isSubscribed ? "btn-secondary" : "btn-primary"} btn-sm`}
            onClick={isSubscribed ? unsubscribe : subscribe}
            disabled={loading}
            title={isSubscribed ? "Disable notifications" : "Enable notifications"}
        >
            {loading ? (
                <span className="spinner" />
            ) : isSubscribed ? (
                "🔔 Notifications On"
            ) : (
                "🔕 Enable Notifications"
            )}
        </button>
    );
}
