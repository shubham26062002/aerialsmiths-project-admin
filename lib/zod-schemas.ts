import { z } from "zod"
import { isSameDay } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { MAX_IMAGES_COUNT } from "@/constants"

export const signUpSchema = z.object({
    name: z.string().nonempty({
        error: "Name is required.",
    }).refine((value) => value.trim() !== "", {
        error: "Name cannot be empty.",
    }).regex(/^[a-zA-Z\s]+$/, {
        error: "Name can only contain letters.",
    }).trim(),
    email: z.email({
        error: "Email is invalid.",
    }).nonempty({
        error: "Email is required.",
    }).refine((value) => value.trim() !== "", {
        error: "Email cannot be empty.",
    }).trim().toLowerCase(),
    password: z.string().nonempty({
        error: "Password is required.",
    }).min(8, {
        error: "Password must be 8 - 20 characters long.",
    }).max(20, {
        error: "Password must be 8 - 20 characters long.",
    }),
})

export const signInSchema = z.object({
    email: z.email({
        error: "Email is invalid.",
    }).nonempty({
        error: "Email is required.",
    }).refine((value) => value.trim() !== "", {
        error: "Email cannot be empty.",
    }).trim().toLowerCase(),
    password: z.string().nonempty({
        error: "Password is required.",
    }),
})

export const addTimesheetEntrySchema = z.object({
    client: z.string().nonempty({
        error: "Client is required.",
    }).refine((value) => value.trim() !== "", {
        error: "Client cannot be empty.",
    }).trim(),
    position: z.string().nonempty({
        error: "Position is required.",
    }).refine((value) => value.trim() !== "", {
        error: "Position cannot be empty.",
    }).trim(),
    date: z.iso.datetime({
        error: "Date is invalid.",
    }).nonempty({
        error: "Date is required.",
    }).refine((value) => value.trim() !== "", {
        error: "Date cannot be empty.",
    }).trim(),
    startTime: z.iso.datetime({
        error: "Start time is invalid.",
    }).nonempty({
        error: "Start time is required.",
    }).refine((value) => value.trim() !== "", {
        error: "Start time cannot be empty.",
    }).trim(),
    endTime: z.iso.datetime({
        error: "End time is invalid.",
    }).nonempty({
        error: "End time is required.",
    }).refine((value) => value.trim() !== "", {
        error: "End time cannot be empty.",
    }).trim(),
    siteAddress: z.string().nonempty({
        error: "Site address is required.",
    }).refine((value) => value.trim() !== "", {
        error: "Site address cannot be empty.",
    }).trim(),
    remarks: z.string().trim().optional(),
}).superRefine((data, ctx) => {
    const now = new Date()

    const date = new Date(data.date)

    const startTime = new Date(data.startTime)

    const endTime = new Date(data.endTime)

    if (date > now) {
        ctx.addIssue({
            code: "custom",
            path: ["date"],
            message: "Date cannot be in the future.",
        })
    }

    if (startTime > now) {
        ctx.addIssue({
            code: "custom",
            path: ["startTime"],
            message: "Start time cannot be in the future.",
        })
    }

    if (endTime > now) {
        ctx.addIssue({
            code: "custom",
            path: ["endTime"],
            message: "End time cannot be in the future.",
        })
    }

    if (startTime >= endTime) {
        ctx.addIssue({
            code: "custom",
            path: ["endTime"],
            message: "End time must be after the start time.",
        })
    }

    if (!isSameDay(toZonedTime(date, "Asia/Kolkata"), toZonedTime(startTime, "Asia/Kolkata"))) {
        ctx.addIssue({
            code: "custom",
            path: ["startTime"],
            message: "Start time must be on the selected date.",
        })
    }

    if (!isSameDay(toZonedTime(date, "Asia/Kolkata"), toZonedTime(endTime, "Asia/Kolkata"))) {
        ctx.addIssue({
            code: "custom",
            path: ["endTime"],
            message: "End time must be on the selected date.",
        })
    }

    if (endTime.getTime() - startTime.getTime() < 1000 * 60) {
        ctx.addIssue({
            code: "custom",
            path: ["endTime"],
            message: "End time must be at least 1 minute after start time.",
        })
    }

    if (endTime.getTime() - startTime.getTime() > 1000 * 60 * 60 * 24) {
        ctx.addIssue({
            code: "custom",
            path: ["endTime"],
            message: "Time entry cannot exceed 24 hours.",
        })
    }
})

export const generateReportSchema = z.object({
    type: z.enum(["aerialsmiths"], {
        error: "Type is invalid.",
    }).refine((value) => value.trim() !== "", {
        error: "Type cannot be empty.",
    }),
    date: z.iso.datetime({
        error: "Date is invalid.",
    }).nonempty({
        error: "Date is required.",
    }).refine((value) => value.trim() !== "", {
        error: "Date cannot be empty.",
    }).trim().transform((value) => {
        const newValue = new Date(value)

        newValue.setHours(0, 0, 0, 0)

        return newValue.toISOString()
    }),
    address: z.string().nonempty({
        error: "Address is required.",
    }).refine((value) => value.trim() !== "", {
        error: "Address cannot be empty.",
    }).trim(),
    clientName: z.string().nonempty({
        error: "Client name is required.",
    }).refine((value) => value.trim() !== "", {
        error: "Client name cannot be empty.",
    }).regex(/^[a-zA-Z\s]+$/, {
        error: "Client name can only contain letters.",
    }).trim(),
    title: z.string().nonempty({
        error: "Title is required.",
    }).refine((value) => value.trim() !== "", {
        error: "Title cannot be empty.",
    }).trim(),
    dateOfService: z.iso.datetime({
        error: "Date of service is invalid.",
    }).nonempty({
        error: "Date of service is required.",
    }).refine((value) => value.trim() !== "", {
        error: "Date of service cannot be empty.",
    }).trim().transform((value) => {
        const newValue = new Date(value)

        newValue.setHours(0, 0, 0, 0)

        return newValue.toISOString()
    }),
    images: z.array(z.url({
        error: "Image is invalid.",
    }).nonempty({
        error: "Image is required.",
    }).refine((value) => value.trim() !== "", {
        error: "Image cannot be empty.",
    }).trim()).min(1, {
        error: "At least one image is required.",
    }).max(MAX_IMAGES_COUNT, {
        error: `Up to ${MAX_IMAGES_COUNT} images are allowed.`,
    }),
})

export const deleteAssetsSchema = z.object({
    assetsIds: z.array(z.string().nonempty({
        error: "Asset is required.",
    }).refine((value) => value.trim() !== "", {
        error: "Asset cannot be empty.",
    }).trim()).min(1, {
        error: "At least one asset ID is required.",
    }),
})