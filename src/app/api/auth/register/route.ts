import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";
import { registerSchema, formatZodError } from "@/lib/validations";
import { ZodError } from "zod";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = registerSchema.parse(body);
        const { name, email, password, role } = parsed;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: "Email already registered" }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || "MOTORIST",
            },
        });

        // If registering as mechanic, create empty profile
        if (user.role === "MECHANIC") {
            await prisma.mechanicProfile.create({
                data: { userId: user.id },
            });
        }

        return NextResponse.json(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: formatZodError(error) }, { status: 400 });
        }
        console.error("Registration error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
