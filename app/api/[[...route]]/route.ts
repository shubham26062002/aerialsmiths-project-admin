import { Hono } from "hono"
import { handle } from "hono/vercel"
import { compress } from "hono/compress"
import { logger } from "hono/logger"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"
import { FALLBACK_ERROR_MESSAGE } from "@/constants"
import auth from "@/app/api/[[...route]]/routes/auth"
import clients from "@/app/api/[[...route]]/routes/clients"
import timesheet from "@/app/api/[[...route]]/routes/timesheet"
import upload from "@/app/api/[[...route]]/routes/upload"
import reports from "@/app/api/[[...route]]/routes/reports"

const app = new Hono().basePath("/api")

app
    .use("*", cors())
    .use("*", compress())
    .use("*", logger())

app.notFound((c) => {
    return c.json({
        error: "Not found",
    }, 404)
})

app.onError((error, c) => {
    if (error instanceof HTTPException) {
        return c.json({
            error: error.message,
        }, error.status)
    }

    return c.json({
        error: error.message || FALLBACK_ERROR_MESSAGE,
    }, 500)
})

const routes = app
    .route("/auth", auth)
    .route("/clients", clients)
    .route("/timesheet", timesheet)
    .route("/upload", upload)
    .route("/reports", reports)

export type ServerAppType = typeof routes

export const GET = handle(app)

export const POST = handle(app)