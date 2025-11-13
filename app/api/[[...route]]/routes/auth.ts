import { db } from "@/db"
import { sessions, users } from "@/db/schema"
import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { signInSchema, signUpSchema } from "@/lib/zod-schemas"
import { eq } from "drizzle-orm"
import { HTTPException } from "hono/http-exception"
import argon2 from "argon2"
import { createId } from "@paralleldrive/cuid2"
import { createJwt, JWTPayload } from "@/lib/jwt"
import { SESSION_TTL_MS } from "@/constants"
import { authMiddleware } from "@/app/api/[[...route]]/middlewares"

const app = new Hono()
    .post("/sign-up", zValidator("json", signUpSchema), async (c) => {
        const { name, email, password } = c.req.valid("json")

        const [existingUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase()))

        if (!!existingUser) {
            throw new HTTPException(409, {
                message: "Email already registered.",
            })
        }

        let token = ""

        const passwordHash = await argon2.hash(password)

        const [newUser] = await db.insert(users).values({
            name,
            email: email.toLowerCase(),
            passwordHash,
        }).returning()

        const sid = createId()

        const payload: JWTPayload = {
            sub: newUser.id,
            role: newUser.role,
            sid,
        }

        token = await createJwt(payload)

        const tokenHash = await argon2.hash(token)

        await db.insert(sessions).values({
            id: sid,
            userId: newUser.id,
            tokenHash,
            expiresAt: new Date(Date.now() + SESSION_TTL_MS)
        })

        return c.json({
            sessionToken: token,
        }, 201)
    }).post("/sign-in", zValidator("json", signInSchema), async (c) => {
        const { email, password } = c.req.valid("json")

        const [existingUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase()))

        if (!existingUser) {
            throw new HTTPException(401, {
                message: "Incorrect email or password.",
            })
        }

        const isPasswordCorrect = await argon2.verify(existingUser.passwordHash, password)

        if (!isPasswordCorrect) {
            throw new HTTPException(401, {
                message: "Incorrect email or password.",
            })
        }

        if (existingUser.role === "admin") {
            throw new HTTPException(403, {
                message: "Admins are not allowed to sign in.",
            })
        }

        const sid = createId()

        const payload: JWTPayload = {
            sub: existingUser.id,
            role: existingUser.role,
            sid,
        }

        const token = await createJwt(payload)

        const tokenHash = await argon2.hash(token)

        await db.insert(sessions).values({
            id: sid,
            userId: existingUser.id,
            tokenHash,
            expiresAt: new Date(Date.now() + SESSION_TTL_MS)
        })

        return c.json({
            sessionToken: token,
        }, 201)
    }).post("/sign-out", authMiddleware, async (c) => {
        const currentSession = c.get("currentSession")

        await db.delete(sessions).where(eq(sessions.id, currentSession.id))

        return c.json({
            message: "Successfully signed out.",
        })
    }).post("/sign-out-all", authMiddleware, async (c) => {
        const currentUser = c.get("currentUser")

        await db.delete(sessions).where(eq(sessions.userId, currentUser.id))

        return c.json({
            message: "Successfully signed out everywhere.",
        })
    }).get("/current-user", authMiddleware, async (c) => {
        const currentUser = c.get("currentUser")

        const { passwordHash, ...rest } = currentUser

        return c.json(rest)
    })

export default app