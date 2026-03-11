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
        const mechanicId = searchParams.get("mechanicId");

        let bookings;

        if (session.user.role === "MECHANIC") {
            const profile = await prisma.mechanicProfile.findUnique({
                where: { userId: session.user.id },
            });
            if (!profile) {
                return NextResponse.json({ error: "Profile not found" }, { status: 404 });
            }
            bookings = await prisma.booking.findMany({
                where: { mechanicId: profile.id },
                include: {
                    motorist: { select: { name: true, email: true } },
                    mechanic: { include: { user: { select: { name: true } } } },
                    review: true,
                },
                orderBy: { createdAt: "desc" },
            });
        } else {
            bookings = await prisma.booking.findMany({
                where: { motoristId: session.user.id },
                include: {
                    mechanic: { include: { user: { select: { name: true } } } },
                    motorist: { select: { name: true, email: true } },
                    review: true,
                },
                orderBy: { createdAt: "desc" },
            });
        }

        return NextResponse.json(bookings);
    } catch (error) {
        console.error("Error fetching bookings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "MOTORIST") {
            return NextResponse.json({ error: "Only motorists can create bookings" }, { status: 403 });
        }

        const body = await request.json();
        const { mechanicId, date, time } = body;

        if (!mechanicId || !date || !time) {
            return NextResponse.json({ error: "Mechanic, date, and time are required" }, { status: 400 });
        }

        // Check mechanic exists and is approved
        const mechanic = await prisma.mechanicProfile.findUnique({
            where: { id: mechanicId },
        });

        if (!mechanic || mechanic.verificationStatus !== "APPROVED") {
            return NextResponse.json({ error: "Mechanic not found or not verified" }, { status: 400 });
        }

        // Conflict detection (FR-13)
        const existing = await prisma.booking.findFirst({
            where: {
                mechanicId,
                date,
                time,
                status: { in: ["PENDING", "APPROVED", "IN_PROGRESS"] },
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: "This time slot is already booked for this mechanic" },
                { status: 409 }
            );
        }

        const booking = await prisma.booking.create({
            data: {
                motoristId: session.user.id,
                mechanicId,
                date,
                time,
            },
        });

        // Send push notification to mechanic
        try {
            await sendPushToUser(mechanic.userId, {
                title: "New Booking Request",
                body: `${session.user.name} has requested a booking for ${date} at ${time}`,
                url: "/dashboard/mechanic",
            });
        } catch {
            // Non-critical: notification failure shouldn't break booking
        }

        return NextResponse.json(booking, { status: 201 });
    } catch (error) {
        console.error("Error creating booking:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
