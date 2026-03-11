// Service Worker for Auto-Link Push Notifications
self.addEventListener("push", function (event) {
    let data = { title: "Auto-Link", body: "You have a new notification", url: "/dashboard" };

    try {
        data = event.data.json();
    } catch (e) {
        // fallback to defaults
    }

    const options = {
        body: data.body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        vibrate: [100, 50, 100],
        data: { url: data.url || "/dashboard" },
        actions: [{ action: "open", title: "Open" }],
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    const url = event.notification.data?.url || "/dashboard";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
            for (const client of clientList) {
                if (client.url.includes(url) && "focus" in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
