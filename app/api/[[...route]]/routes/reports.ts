import { Hono } from "hono"
import { authMiddleware } from "../middlewares"
import { zValidator } from "@hono/zod-validator"
import { generateReportSchema } from "@/lib/zod-schemas"
import fs from "fs"
import path from "path"
import puppeteer from "puppeteer-core"
import chromium from "@sparticuz/chromium"
import cloudinary from "@/lib/cloudinary"
import { format, parseISO } from "date-fns"
import { config } from "dotenv"

config({
    path: "./.env",
})

const app = new Hono()
    .post("/generate", zValidator("json", generateReportSchema), authMiddleware, async (c) => {
        const { address, clientName, date, dateOfService, images, title, type } = c.req.valid("json")

        const formattedAddress = address.trim().split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0).join("<br />")

        const formattedImages = (images || []).filter((url) => !!url && typeof url === "string" && url.trim() !== "").map((url, index) => `
            <img style="width: 100%; height: auto; object-fit: cover; aspect-ratio: 1 / 1.3;" src="${url.trim()}" alt="Image ${index + 1}" />
        `).join("\n")

        const now = new Date()

        const reportTemplateContent = fs.readFileSync(path.join(process.cwd(), "public/html/report-template.html"), "utf-8")

        const locatorSignatureBuffer = fs.readFileSync(path.join(process.cwd(), "public/images/locator-signature.png"))

        const locatorSignatureBase64 = locatorSignatureBuffer.toString("base64")

        const locatorSignatureDataUri = `data:image/png;base64,${locatorSignatureBase64}`

        const directorSignatureBuffer = fs.readFileSync(path.join(process.cwd(), "public/images/director-signature.png"))

        const directorSignatureBase64 = directorSignatureBuffer.toString("base64")

        const directorSignatureDataUri = `data:image/png;base64,${directorSignatureBase64}`

        const formattedTemplateContent = reportTemplateContent.replaceAll("{{ADDRESS}}", formattedAddress).replaceAll("{{CLIENT_NAME}}", clientName).replaceAll("{{TITLE}}", title).replaceAll("{{DATE_OF_SERVICE}}", format(parseISO(dateOfService), "dd/MM/yyyy")).replaceAll("{{IMAGES}}", formattedImages).replaceAll("{{LOCATOR_SIGNATURE_IMAGE}}", locatorSignatureDataUri).replaceAll("{{DIRECTOR_SIGNATURE_IMAGE}}", directorSignatureDataUri)

        const browser = await puppeteer.launch({
            args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
            executablePath: await chromium.executablePath(),
            headless: true,
        })

        const page = await browser.newPage()

        await page.setContent(formattedTemplateContent, {
            waitUntil: "networkidle0",
        })

        const headerLogoBuffer = fs.readFileSync(path.join(process.cwd(), "public/images/header-logo.png"))

        const headerLogoBase64 = headerLogoBuffer.toString("base64")

        const headerLogoDataUri = `data:image/png;base64,${headerLogoBase64}`

        const footerLogoBuffer = fs.readFileSync(path.join(process.cwd(), "public/images/footer-logo.png"))

        const footerLogoBase64 = footerLogoBuffer.toString("base64")

        const footerLogoDataUri = `data:image/png;base64,${footerLogoBase64}`

        const reportBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: `
                <div style="padding-left: 30mm; padding-right: 30mm; padding-top: 10mm; padding-bottom: 10mm; display: flex; align-items: start; justify-content: space-between; width: 100%; font-family: Georgia, 'Times New Roman', Times, serif; line-height: 1.5;">
                    <div>
                        <img style="height: 70pt; width: auto; object-fit: cover;" src="${headerLogoDataUri}" alt="Header logo" />
                    </div>
                    <div>
                        <p style="font-size: 10pt; color: black;">Our Ref: ${now.getTime()}<br />${format(parseISO(date), "MMMM yyyy")}</p>
                    </div>
                </div>
            `,
            footerTemplate: `
                <div style="padding-left: 30mm; padding-right: 30mm; padding-top: 10mm; padding-bottom: 10mm; display: flex; align-items: center; justify-content: space-between; width: 100%; font-family: Georgia, 'Times New Roman', Times, serif; line-height: 1.5;">
                    <div>
                        <img style="height: 70pt; width: auto; object-fit: cover;" src="${footerLogoDataUri}" alt="Footer logo" />
                    </div>
                    <div>
                        <p style="font-size: 10pt; color: black;"><span class="pageNumber"></span>/<span class="totalPages"></span></p>
                    </div>
                </div>
            `,
            margin: {
                top: "50mm",
                left: "30mm",
                bottom: "50mm",
                right: "30mm",
            },
        })

        await browser.close()

        const newReportBuffer = Buffer.from(reportBuffer)

        const reportBase64 = newReportBuffer.toString("base64")

        const reportDataUri = `data:application/pdf;base64,${reportBase64}`

        const response = await cloudinary.uploader.upload(reportDataUri, {
            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET_NAME,
            folder: "reports",
            resource_type: "raw",
            public_id: `report-${now.getTime()}.pdf`,
        })

        return c.json({
            publicUrl: response.secure_url,
            publicId: response.public_id,
        })
    })

export default app