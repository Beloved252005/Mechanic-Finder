import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.json({ error: "Token is required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { verificationToken: token } });

        if (!user) {
            return NextResponse.json({ error: "Invalid verification token" }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verificationToken: null,
            },
        });

        // Redirect to login with success message
        return NextResponse.redirect(new URL("/auth/login?verified=true", request.url));
    } catch (error) {
        console.error("Email verification error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
