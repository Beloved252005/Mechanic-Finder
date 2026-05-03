import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const location = searchParams.get("location");
        const status = searchParams.get("status");
        const minRating = searchParams.get("minRating");
        const onlineOnly = searchParams.get("onlineOnly");
        const verificationStatus = searchParams.get("verificationStatus");
        const specialization = searchParams.get("specialization");

        const where: Record<string, unknown> = {};
        if (location) {
            where.location = { contains: location };
        }
        if (status) {
            where.verificationStatus = status;
        }
        if (minRating) {
            where.averageRating = { gte: parseFloat(minRating) };
        }

        // Feature 1: Online-only filter
        if (onlineOnly === "true") {
            where.isOnline = true;
        }

        // Feature 2: Verification status filter (overrides legacy 'status' param if both provided)
        if (verificationStatus && ["APPROVED", "PENDING", "REJECTED"].includes(verificationStatus)) {
            where.verificationStatus = verificationStatus;
        }

        // Feature 3: Specialization filter (comma-separated list)
        if (specialization) {
            const specs = specialization.split(",").map((s) => s.trim()).filter(Boolean);
            if (specs.length > 0) {
                where.specialization = { in: specs };
            }
        }

        const mechanics = await prisma.mechanicProfile.findMany({
            where,
            include: {
                user: { select: { name: true, email: true } },
            },
            orderBy: { averageRating: "desc" },
        });

        return NextResponse.json(mechanics);
    } catch (error) {
        console.error("Error fetching mechanics:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
