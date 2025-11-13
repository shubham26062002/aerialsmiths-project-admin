import { Hono } from "hono"
import { authMiddleware } from "@/app/api/[[...route]]/middlewares"
import { zValidator } from "@hono/zod-validator"
import { addTimesheetEntrySchema } from "@/lib/zod-schemas"
import { clients, timesheetEntries } from "@/db/schema"
import { and, desc, eq, gt, lt } from "drizzle-orm"
import { db } from "@/db"
import { HTTPException } from "hono/http-exception"

const app = new Hono()
    .get("/", authMiddleware, async (c) => {
        const currentUser = c.get("currentUser")

        const allTimesheetEntries = await db.select({
            id: timesheetEntries.id,
            date: timesheetEntries.date,
            startTime: timesheetEntries.startTime,
            endTime: timesheetEntries.endTime,
            totalHrs: timesheetEntries.totalHrs,
            remarks: timesheetEntries.remarks,
            status: timesheetEntries.status,
            createdAt: timesheetEntries.createdAt,
            updatedAt: timesheetEntries.updatedAt,
            position: timesheetEntries.position,
            siteAddress: timesheetEntries.siteAddress,
            client: {
                id: clients.id,
                name: clients.name,
                createdAt: clients.createdAt,
                updatedAt: clients.updatedAt,
            },
        }).from(timesheetEntries).leftJoin(clients, eq(timesheetEntries.clientId, clients.id)).where(eq(timesheetEntries.userId, currentUser.id)).orderBy(desc(timesheetEntries.date))

        return c.json(allTimesheetEntries)
    })
    .post("/add-entry", zValidator("json", addTimesheetEntrySchema), authMiddleware, async (c) => {
        const { client, date, startTime, endTime, remarks, position, siteAddress } = c.req.valid("json")

        const [existingClient] = await db.select().from(clients).where(eq(clients.id, client))

        if (!existingClient) {
            throw new HTTPException(404, {
                message: "Client not found.",
            })
        }

        const currentUser = c.get("currentUser")

        const formattedDate = new Date(date)

        formattedDate.setHours(0, 0, 0, 0)

        const formattedStartTime = new Date(startTime)

        formattedStartTime.setFullYear(formattedDate.getFullYear(), formattedDate.getMonth(), formattedDate.getDate())

        formattedStartTime.setSeconds(0, 0)

        const formattedEndTime = new Date(endTime)

        formattedEndTime.setFullYear(formattedDate.getFullYear(), formattedDate.getMonth(), formattedDate.getDate())

        formattedEndTime.setSeconds(0, 0)

        const [conflictingTimesheetEntry] = await db.select().from(timesheetEntries).where(and(
            eq(timesheetEntries.userId, currentUser.id),
            eq(timesheetEntries.date, formattedDate),
            lt(timesheetEntries.startTime, formattedEndTime),
            gt(timesheetEntries.endTime, formattedStartTime),
        ))

        if (!!conflictingTimesheetEntry) {
            throw new HTTPException(409, {
                message: "Selected time overlaps with an existing entry.",
            })
        }

        const differenceInMs = formattedEndTime.getTime() - formattedStartTime.getTime()

        const totalHrs = differenceInMs / (1000 * 60 * 60)

        const totalHrsRounded = Number(totalHrs.toFixed(2))

        const [newTimesheetEntry] = await db.insert(timesheetEntries).values({
            userId: currentUser.id,
            clientId: existingClient.id,
            date: formattedDate,
            startTime: formattedStartTime,
            endTime: formattedEndTime,
            remarks,
            totalHrs: totalHrsRounded.toString(),
            position,
            siteAddress,
        }).returning()

        return c.json(newTimesheetEntry, 201)
    })

export default app