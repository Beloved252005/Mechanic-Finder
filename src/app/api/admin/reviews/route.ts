import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const reviews = await prisma.review.findMany({
            include: {
                motorist: { select: { name: true } },
                mechanic: { include: { user: { select: { name: true } } } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(reviews);
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Review ID is required" }, { status: 400 });
        }

        const review = await prisma.review.findUnique({ where: { id } });
        if (!review) {
            return NextResponse.json({ error: "Review not found" }, { status: 404 });
        }

        await prisma.review.delete({ where: { id } });

        // Recalculate average rating
        const stats = await prisma.review.aggregate({
            where: { mechanicId: review.mechanicId },
            _avg: { rating: true },
            _count: { rating: true },
        });

        await prisma.mechanicProfile.update({
            where: { id: review.mechanicId },
            data: {
                averageRating: stats._avg.rating || 0,
                totalReviews: stats._count.rating,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
