import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { endpoint, p256dh, auth } = body;

        if (!endpoint || !p256dh || !auth) {
            return NextResponse.json({ error: "endpoint, p256dh, and auth are required" }, { status: 400 });
        }

        // Upsert: if same endpoint exists for this user, update it
        const existing = await prisma.pushSubscription.findFirst({
            where: { userId: session.user.id, endpoint },
        });

        if (existing) {
            await prisma.pushSubscription.update({
                where: { id: existing.id },
                data: { p256dh, auth },
            });
        } else {
            await prisma.pushSubscription.create({
                data: {
                    userId: session.user.id,
                    endpoint,
                    p256dh,
                    auth,
                },
            });
        }

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        console.error("Error saving subscription:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const endpoint = searchParams.get("endpoint");

        if (endpoint) {
            await prisma.pushSubscription.deleteMany({
                where: { userId: session.user.id, endpoint },
            });
        } else {
            await prisma.pushSubscription.deleteMany({
                where: { userId: session.user.id },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting subscription:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
