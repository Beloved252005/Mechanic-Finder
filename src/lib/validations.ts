import { z } from "zod";

// ───── Auth ─────
export const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be under 50 characters").trim(),
    email: z.string().email("Invalid email address").toLowerCase().trim(),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    role: z.enum(["MOTORIST", "MECHANIC"]).optional().default("MOTORIST"),
});

// ───── Bookings ─────
export const createBookingSchema = z.object({
    mechanicId: z.string().min(1, "Mechanic is required"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
    description: z.string().max(2000).optional(),
    serviceType: z.enum(["REPAIR", "MAINTENANCE", "INSPECTION", "EMERGENCY", "OTHER"]).optional(),
    vehicleMake: z.string().max(100).optional(),
    vehicleModel: z.string().max(100).optional(),
    vehicleYear: z.string().max(4).optional(),
});

export const updateBookingSchema = z.object({
    status: z.enum(["APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
    cancellationReason: z.string().max(500).optional(),
});

// ───── Reviews ─────
export const reviewSchema = z.object({
    bookingId: z.string().min(1, "Booking ID is required"),
    rating: z.number().int().min(1, "Rating must be 1-5").max(5, "Rating must be 1-5"),
    comment: z.string().max(1000).optional(),
});

// ───── Messages ─────
export const messageSchema = z.object({
    bookingId: z.string().min(1, "Booking ID is required"),
    content: z.string().min(1, "Message cannot be empty").max(1000, "Message too long").trim(),
});

// ───── Mechanic Profile ─────
export const profileSchema = z.object({
    specialty: z.string().max(200).optional().nullable(),
    location: z.string().max(200).optional().nullable(),
    phone: z.string().max(20).optional().nullable(),
    documentUrl: z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
});

// ───── Location ─────
export const locationSchema = z.object({
    bookingId: z.string().min(1, "Booking ID is required"),
    latitude: z.number().min(-90, "Invalid latitude").max(90, "Invalid latitude"),
    longitude: z.number().min(-180, "Invalid longitude").max(180, "Invalid longitude"),
});

// ───── Push Subscription ─────
export const pushSubscribeSchema = z.object({
    endpoint: z.string().url("Invalid endpoint URL"),
    p256dh: z.string().min(1, "p256dh key is required"),
    auth: z.string().min(1, "auth key is required"),
});

// ───── Helper ─────
// Extracts user-friendly error messages from ZodError
export function formatZodError(error: z.ZodError): string {
    return error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
}
