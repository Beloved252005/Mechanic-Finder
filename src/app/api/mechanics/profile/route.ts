import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { profileSchema, formatZodError } from "@/lib/validations";
import { ZodError } from "zod";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "MECHANIC") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const profile = await prisma.mechanicProfile.findUnique({
            where: { userId: session.user.id },
        });

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        return NextResponse.json(profile);
    } catch (error) {
        console.error("Error fetching profile:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "MECHANIC") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const parsed = profileSchema.parse(body);
        const { specialty, location, phone, documentUrl, latitude, longitude } = parsed;

        const profile = await prisma.mechanicProfile.update({
            where: { userId: session.user.id },
            data: { specialty, location, phone, documentUrl: documentUrl || null, latitude, longitude },
        });

        return NextResponse.json(profile);
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: formatZodError(error) }, { status: 400 });
        }
        console.error("Error updating profile:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
