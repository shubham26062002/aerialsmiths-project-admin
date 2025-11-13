import { SESSION_TTL } from "@/constants"
import { jwtVerify, SignJWT } from "jose"
import { config } from "dotenv"

config({
    path: "./.env",
})

const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET)

export type JWTPayload = {
    sub: string,
    sid: string,
    role: "admin" | "default",
    exp?: number,
    iat?: number,
}

export const createJwt = async (payload: JWTPayload) => {
    const token = await new SignJWT(payload)
        .setProtectedHeader({
            alg: "HS256",
        })
        .setIssuedAt()
        .setExpirationTime(SESSION_TTL)
        .sign(jwtSecret)

    return token
}

export const verifyJwt = async (token: string) => {
    try {
        const { payload } = await jwtVerify(token, jwtSecret, {
            algorithms: ["HS256"],
        })

        return payload as JWTPayload
    } catch {
        return null
    }
}