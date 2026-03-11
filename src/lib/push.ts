import webpush from "web-push";
import { prisma } from "@/lib/db";

webpush.setVapidDetails(
    "mailto:admin@autolink.local",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
    const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId },
    });

    const results = await Promise.allSettled(
        subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth },
                    },
                    JSON.stringify(payload)
                );
            } catch (error: unknown) {
                // Remove expired/invalid subscriptions
                if (error && typeof error === "object" && "statusCode" in error) {
                    const statusCode = (error as { statusCode: number }).statusCode;
                    if (statusCode === 404 || statusCode === 410) {
                        await prisma.pushSubscription.delete({ where: { id: sub.id } });
                    }
                }
                throw error;
            }
        })
    );

    return results;
}
