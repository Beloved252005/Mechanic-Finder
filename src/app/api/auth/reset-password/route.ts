import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { token, password } = body;

        if (!token || !password) {
            return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { resetToken: token } });

        if (!user) {
            return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
        }

        if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
            // Clear expired token
            await prisma.user.update({
                where: { id: user.id },
                data: { resetToken: null, resetTokenExpiry: null },
            });
            return NextResponse.json({ error: "Reset token has expired. Please request a new one." }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        return NextResponse.json({ message: "Password has been reset successfully" });
    } catch (error) {
        console.error("Reset password error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
