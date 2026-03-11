import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        if (!["APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const booking = await prisma.booking.findUnique({
            where: { id },
            include: {
                mechanic: { select: { userId: true, user: { select: { name: true } } } },
                motorist: { select: { id: true, name: true } },
            },
        });
        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // Mechanics can approve/start/complete, motorists can cancel
        if (session.user.role === "MECHANIC") {
            const profile = await prisma.mechanicProfile.findUnique({
                where: { userId: session.user.id },
            });
            if (!profile || booking.mechanicId !== profile.id) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        } else if (session.user.role === "MOTORIST") {
            if (booking.motoristId !== session.user.id || status !== "CANCELLED") {
                return NextResponse.json({ error: "Motorists can only cancel their own bookings" }, { status: 403 });
            }
        }

        const updated = await prisma.booking.update({
            where: { id },
            data: { status },
        });

        // Send push notification on status change
        try {
            const notifyUserId =
                session.user.role === "MECHANIC" ? booking.motorist.id : booking.mechanic.userId;
            const actorName = session.user.name;
            let notifBody = "";
            if (status === "APPROVED") notifBody = `${actorName} approved your booking for ${booking.date} at ${booking.time}`;
            else if (status === "IN_PROGRESS") notifBody = `${actorName} has started working on your booking`;
            else if (status === "COMPLETED") notifBody = `${actorName} has completed your booking`;
            else if (status === "CANCELLED") notifBody = `${actorName} cancelled the booking for ${booking.date} at ${booking.time}`;

            if (notifBody) {
                await sendPushToUser(notifyUserId, {
                    title: `Booking ${status.replace("_", " ")}`,
                    body: notifBody,
                    url: "/dashboard",
                });
            }
        } catch {
            // Non-critical
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating booking:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
