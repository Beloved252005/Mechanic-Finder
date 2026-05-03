import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const statusSchema = z.object({
    isOnline: z.boolean(),
});

export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== "MECHANIC") {
            return NextResponse.json({ error: "Forbidden — only mechanics can update status" }, { status: 403 });
        }

        const body = await request.json();
        const parsed = statusSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues.map((i) => i.message).join(", ") },
                { status: 400 }
            );
        }

        const { isOnline } = parsed.data;

        const profile = await prisma.mechanicProfile.update({
            where: { userId: session.user.id },
            data: {
                isOnline,
                lastSeen: new Date(),
            },
            select: {
                isOnline: true,
                lastSeen: true,
            },
        });

        return NextResponse.json(profile);
    } catch (error) {
        console.error("Error updating mechanic status:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
