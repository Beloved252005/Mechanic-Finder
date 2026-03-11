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

        const bookings = await prisma.booking.findMany({
            include: {
                motorist: { select: { name: true, email: true } },
                mechanic: { include: { user: { select: { name: true } } } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(bookings);
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
