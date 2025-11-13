import { db } from "@/db"
import { sessions, users } from "@/db/schema"
import { JWTPayload, verifyJwt } from "@/lib/jwt"
import { and, eq } from "drizzle-orm"
import { createMiddleware } from "hono/factory"
import { HTTPException } from "hono/http-exception"
import argon2 from "argon2"

export const authMiddleware = createMiddleware<{
    Variables: {
        currentUser: typeof users.$inferSelect,
        currentSession: typeof sessions.$inferSelect,
    },
}>(async (c, next) => {
    const sessionToken = c.req.header("Authorization")?.replace("Bearer ", "").trim()

    if (!sessionToken) {
        throw new HTTPException(401, {
            message: "Missing session token.",
        })
    }

    const payload: JWTPayload | null = await verifyJwt(sessionToken)

    if (!payload) {
        throw new HTTPException(401, {
            message: "Invalid or expired session token.",
        })
    }

    const { sub, sid, role, exp, iat } = payload

    if (!sub || !sid || !role || !exp || !iat) {
        throw new HTTPException(401, {
            message: "Malformed session token data.",
        })
    }

    if (Date.now() > exp * 1000) {
        throw new HTTPException(401, {
            message: "Invalid or expired session token.",
        })
    }

    const [existingUser] = await db.select().from(users).where(eq(users.id, sub))

    if (!existingUser) {
        throw new HTTPException(401, {
            message: "User not found.",
        })
    }

    if (existingUser.role !== role) {
        throw new HTTPException(403, {
            message: "User role mismatch.",
        })
    }

    if (existingUser.role === "admin") {
        throw new HTTPException(403, {
            message: "Admins are not allowed.",
        })
    }

    const [existingSession] = await db.select().from(sessions).where(and(eq(sessions.id, sid), eq(sessions.userId, sub)))

    if (!existingSession) {
        throw new HTTPException(401, {
            message: "Session not found.",
        })
    }

    if (new Date() > existingSession.expiresAt) {
        throw new HTTPException(401, {
            message: "Session is expired.",
        })
    }

    const isTokenCorrect = await argon2.verify(existingSession.tokenHash, sessionToken)

    if (!isTokenCorrect) {
        throw new HTTPException(401, {
            message: "Incorrect session token.",
        })
    }

    c.set("currentUser", existingUser)

    c.set("currentSession", existingSession)

    return await next()
})