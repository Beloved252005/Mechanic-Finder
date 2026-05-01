import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // Always return success to avoid revealing registered emails
        const user = await prisma.user.findUnique({ where: { email } });

        if (user) {
            const resetToken = crypto.randomBytes(32).toString("hex");
            const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            await prisma.user.update({
                where: { id: user.id },
                data: { resetToken, resetTokenExpiry },
            });

            // TODO: Wire up email service. For now, log the reset link.
            console.log(`[PASSWORD RESET] Token for ${email}: ${resetToken}`);
            console.log(`[PASSWORD RESET] Link: /auth/reset-password?token=${resetToken}`);
        }

        return NextResponse.json({
            message: "If an account exists with that email, a password reset link has been sent.",
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
