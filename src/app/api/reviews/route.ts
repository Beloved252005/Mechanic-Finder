import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const mechanicId = searchParams.get("mechanicId");

        if (!mechanicId) {
            return NextResponse.json({ error: "mechanicId is required" }, { status: 400 });
        }

        const reviews = await prisma.review.findMany({
            where: { mechanicId },
            include: {
                motorist: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(reviews);
    } catch (error) {
        console.error("Error fetching reviews:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "MOTORIST") {
            return NextResponse.json({ error: "Only motorists can leave reviews" }, { status: 403 });
        }

        const body = await request.json();
        const { bookingId, rating, comment } = body;

        if (!bookingId || !rating || rating < 1 || rating > 5) {
            return NextResponse.json({ error: "Valid bookingId and rating (1-5) are required" }, { status: 400 });
        }

        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking || booking.status !== "COMPLETED") {
            return NextResponse.json({ error: "Can only review completed bookings" }, { status: 400 });
        }
        if (booking.motoristId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const existingReview = await prisma.review.findUnique({ where: { bookingId } });
        if (existingReview) {
            return NextResponse.json({ error: "Review already submitted" }, { status: 409 });
        }

        const review = await prisma.review.create({
            data: {
                bookingId,
                motoristId: session.user.id,
                mechanicId: booking.mechanicId,
                rating,
                comment: comment || null,
            },
        });

        // Update mechanic average rating
        const stats = await prisma.review.aggregate({
            where: { mechanicId: booking.mechanicId },
            _avg: { rating: true },
            _count: { rating: true },
        });

        await prisma.mechanicProfile.update({
            where: { id: booking.mechanicId },
            data: {
                averageRating: stats._avg.rating || 0,
                totalReviews: stats._count.rating,
            },
        });

        return NextResponse.json(review, { status: 201 });
    } catch (error) {
        console.error("Error creating review:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
