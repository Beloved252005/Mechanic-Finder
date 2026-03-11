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

        const mechanics = await prisma.mechanicProfile.findMany({
            include: {
                user: { select: { name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(mechanics);
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { mechanicId, status } = body;

        if (!mechanicId || !["APPROVED", "REJECTED"].includes(status)) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const updated = await prisma.mechanicProfile.update({
            where: { id: mechanicId },
            data: { verificationStatus: status },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
