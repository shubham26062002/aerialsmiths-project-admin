import { Metadata } from "next"
import { Raleway } from "next/font/google"
import { cn } from "@/lib/utils"
import "@/app/globals.css"

const raleway = Raleway({
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Aerialsmiths Project Admin",
}

type RootLayoutProps = {
  children: React.ReactNode,
}

const RootLayout = ({
  children,
}: RootLayoutProps) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen min-w-[360px]", raleway.className)}>{children}</body>
    </html>
  )
}

export default RootLayout