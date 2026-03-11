import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Rate limit: store last update time per booking (in-memory, resets on restart)
const lastUpdateMap = new Map<string, number>();
const RATE_LIMIT_MS = 10000; // 10 seconds

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "MECHANIC") {
            return NextResponse.json({ error: "Only mechanics can send location updates" }, { status: 403 });
        }

        const body = await request.json();
        const { bookingId, latitude, longitude } = body;

        if (!bookingId || latitude == null || longitude == null) {
            return NextResponse.json({ error: "bookingId, latitude, and longitude are required" }, { status: 400 });
        }

        // Verify this mechanic owns this booking and it's IN_PROGRESS
        const profile = await prisma.mechanicProfile.findUnique({
            where: { userId: session.user.id },
        });
        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking || booking.mechanicId !== profile.id) {
            return NextResponse.json({ error: "Booking not found or not yours" }, { status: 404 });
        }
        if (booking.status !== "IN_PROGRESS") {
            return NextResponse.json({ error: "Booking is not in progress" }, { status: 400 });
        }

        // Rate limiting
        const lastUpdate = lastUpdateMap.get(bookingId) || 0;
        if (Date.now() - lastUpdate < RATE_LIMIT_MS) {
            return NextResponse.json({ message: "Rate limited, update skipped" }, { status: 200 });
        }

        const locationUpdate = await prisma.locationUpdate.create({
            data: {
                bookingId,
                mechanicId: profile.id,
                latitude,
                longitude,
            },
        });

        lastUpdateMap.set(bookingId, Date.now());

        return NextResponse.json(locationUpdate, { status: 201 });
    } catch (error) {
        console.error("Error saving location:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

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

        // Authorization: only motorist, mechanic of this booking, or admin
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

        // Get the latest location update
        const latest = await prisma.locationUpdate.findFirst({
            where: { bookingId },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(latest || null);
    } catch (error) {
        console.error("Error fetching location:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
