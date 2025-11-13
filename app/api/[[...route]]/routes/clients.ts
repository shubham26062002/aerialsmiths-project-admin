import { Hono } from "hono"
import { authMiddleware } from "@/app/api/[[...route]]/middlewares"
import { db } from "@/db"
import { clients } from "@/db/schema"
import { asc } from "drizzle-orm"

const app = new Hono()
    .get("/", authMiddleware, async (c) => {
        const allClients = await db.select().from(clients).orderBy(asc(clients.name))

        return c.json(allClients)
    })

export default app