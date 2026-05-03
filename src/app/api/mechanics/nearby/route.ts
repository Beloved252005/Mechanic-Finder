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
        const onlineOnly = searchParams.get("onlineOnly");
        const verificationStatus = searchParams.get("verificationStatus");
        const specialization = searchParams.get("specialization");

        // Build where clause — start with existing defaults
        const where: Record<string, unknown> = {
            latitude: { not: null },
            longitude: { not: null },
        };

        // Feature 2: Verification status filter (default: APPROVED for backward compat)
        if (verificationStatus && ["APPROVED", "PENDING", "REJECTED"].includes(verificationStatus)) {
            where.verificationStatus = verificationStatus;
        } else {
            where.verificationStatus = "APPROVED";
        }

        // Feature 1: Online-only filter
        if (onlineOnly === "true") {
            where.isOnline = true;
        }

        // Feature 3: Specialization filter (comma-separated)
        if (specialization) {
            const specs = specialization.split(",").map((s) => s.trim()).filter(Boolean);
            if (specs.length > 0) {
                where.specialization = { in: specs };
            }
        }

        const mechanics = await prisma.mechanicProfile.findMany({
            where,
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
            isOnline: m.isOnline,
            lastSeen: m.lastSeen,
            specialization: m.specialization,
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching nearby mechanics:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
