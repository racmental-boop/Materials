"use client"

import { ChatbotUISVG } from "@/components/icons/chatbotui-svg"
import { IconArrowRight } from "@tabler/icons-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function HomePage() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Render only after mounting to avoid hydration mismatches
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Fall back to the light theme during server rendering
    return (
      <div className="flex size-full flex-col items-center justify-center">
        <div>
          <ChatbotUISVG theme="light" scale={0.3} />
        </div>

        <div className="mt-2 text-4xl font-bold">MentalShield Project</div>

        <Link
          className="mt-4 flex w-[200px] items-center justify-center rounded-md bg-blue-500 p-2 font-semibold"
          href="/login"
        >
          Join Research
          <IconArrowRight className="ml-1" size={20} />
        </Link>
      </div>
    )
  }

  return (
    <div className="flex size-full flex-col items-center justify-center">
      <div>
        <ChatbotUISVG theme={theme === "dark" ? "dark" : "light"} scale={0.3} />
      </div>

      <div className="mt-2 text-4xl font-bold">MentalShield Project</div>

      <Link
        className="mt-4 flex w-[200px] items-center justify-center rounded-md bg-blue-500 p-2 font-semibold"
        href="/login"
      >
        Join Research
        <IconArrowRight className="ml-1" size={20} />
      </Link>
    </div>
  )
}
