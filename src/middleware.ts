import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = request.nextUrl;

    // Public routes
    if (
        pathname.startsWith("/auth") ||
        pathname === "/" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon") ||
        pathname.startsWith("/sw.js")
    ) {
        return NextResponse.next();
    }

    // Redirect to login if not authenticated
    if (!token) {
        return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    // Admin routes
    if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // API admin routes
    if (pathname.startsWith("/api/admin") && token.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Dashboard role routing
    if (pathname === "/dashboard") {
        if (token.role === "ADMIN") {
            return NextResponse.redirect(new URL("/admin", request.url));
        }
        if (token.role === "MECHANIC") {
            return NextResponse.redirect(new URL("/dashboard/mechanic", request.url));
        }
        return NextResponse.redirect(new URL("/dashboard/motorist", request.url));
    }

    // Mechanic dashboard access
    if (pathname.startsWith("/dashboard/mechanic") && token.role !== "MECHANIC") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Motorist dashboard access
    if (pathname.startsWith("/dashboard/motorist") && token.role !== "MOTORIST") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
