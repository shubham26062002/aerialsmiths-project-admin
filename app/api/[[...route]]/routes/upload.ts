import { Hono } from "hono"
import { authMiddleware } from "../middlewares"
import { HTTPException } from "hono/http-exception"
import { ALLOWED_IMAGE_TYPES } from "@/constants"
import cloudinary from "@/lib/cloudinary"
import { zValidator } from "@hono/zod-validator"
import { deleteAssetsSchema } from "@/lib/zod-schemas"
import { config } from "dotenv"

config({
    path: "./.env",
})

const app = new Hono()
    .post("/image", authMiddleware, async (c) => {
        const body = await c.req.formData()

        const image = body.get("image")

        if (!image) {
            throw new HTTPException(400, {
                message: "Image is required.",
            })
        }

        if (!(image instanceof File)) {
            throw new HTTPException(400, {
                message: "Invalid image file.",
            })
        }

        if (!image.type) {
            throw new HTTPException(400, {
                message: "File type is missing or invalid.",
            })
        }

        if (!ALLOWED_IMAGE_TYPES.includes(image.type)) {
            throw new HTTPException(400, {
                message: "Only JPG,JPEG, and PNG images are allowed.",
            })
        }

        const imageArrayBuffer = await image.arrayBuffer()

        const imageBuffer = Buffer.from(imageArrayBuffer)

        const imageBase64 = imageBuffer.toString("base64")

        const imageDataUri = `data:${image.type};base64,${imageBase64}`

        const response = await cloudinary.uploader.upload(imageDataUri, {
            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET_NAME,
            folder: "images",
            transformation: [
                {
                    width: 1080,
                    height: 1080,
                    crop: "limit",
                },
            ],
            resource_type: "image",
        })

        return c.json({
            publicUrl: response.secure_url,
            publicId: response.public_id,
        })
    }).post("/file", authMiddleware, async (c) => {
        return c.json({
            message: "Upload file route.",
        })
    }).post("/delete-assets", authMiddleware, zValidator("json", deleteAssetsSchema), async (c) => {
        const { assetsIds } = c.req.valid("json")

        if (!assetsIds || assetsIds.length === 0) {
            throw new HTTPException(400, {
                message: "Missing assets IDs.",
            })
        }

        const reportsIds = assetsIds.filter((id) => id.startsWith("reports/") && id.endsWith(".pdf"))

        const imagesIds = assetsIds.filter((id) => !reportsIds.includes(id))

        if (reportsIds.length > 0) {
            await cloudinary.api.delete_resources(reportsIds, {
                resource_type: "raw",
            })
        }

        if (imagesIds.length > 0) {
            await cloudinary.api.delete_resources(imagesIds, {
                resource_type: "image",
            })
        }

        return c.json({
            message: "Assets deleted successfully.",
        })
    })

export default app