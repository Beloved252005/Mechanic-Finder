import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const bookingId = searchParams.get("bookingId");

        if (!bookingId) {
            return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
        }

        // Authorization: only the motorist or mechanic of this booking can view messages
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { mechanic: { select: { userId: true } } },
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        if (
            session.user.id !== booking.motoristId &&
            session.user.id !== booking.mechanic.userId &&
            session.user.role !== "ADMIN"
        ) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const messages = await prisma.message.findMany({
            where: { bookingId },
            include: {
                sender: { select: { id: true, name: true, role: true } },
            },
            orderBy: { createdAt: "asc" },
        });

        return NextResponse.json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { bookingId, content } = body;

        if (!bookingId || !content?.trim()) {
            return NextResponse.json({ error: "bookingId and content are required" }, { status: 400 });
        }

        // Authorization check
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { mechanic: { select: { userId: true } } },
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        if (
            session.user.id !== booking.motoristId &&
            session.user.id !== booking.mechanic.userId
        ) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const message = await prisma.message.create({
            data: {
                bookingId,
                senderId: session.user.id,
                content: content.trim(),
            },
            include: {
                sender: { select: { id: true, name: true, role: true } },
            },
        });

        // Send push notification to the other party
        try {
            const recipientId =
                session.user.id === booking.motoristId
                    ? booking.mechanic.userId
                    : booking.motoristId;
            await sendPushToUser(recipientId, {
                title: `New message from ${session.user.name}`,
                body: content.trim().substring(0, 100),
                url: "/dashboard",
            });
        } catch {
            // Non-critical
        }

        return NextResponse.json(message, { status: 201 });
    } catch (error) {
        console.error("Error creating message:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
