import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const mechanics = await prisma.mechanicProfile.findMany({
            where: {
                verificationStatus: "APPROVED",
                latitude: { not: null },
                longitude: { not: null },
            },
            include: {
                user: { select: { name: true } },
            },
            orderBy: { averageRating: "desc" },
        });

        const result = mechanics.map((m) => ({
            id: m.id,
            name: m.user.name,
            specialty: m.specialty,
            latitude: m.latitude,
            longitude: m.longitude,
            rating: m.averageRating,
            totalReviews: m.totalReviews,
            location: m.location,
            phone: m.phone,
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching nearby mechanics:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
