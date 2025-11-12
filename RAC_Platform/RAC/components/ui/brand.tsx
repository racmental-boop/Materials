"use client"

import Link from "next/link"
import { FC } from "react"
import { useTheme } from "next-themes"
import { ChatbotUISVG } from "../icons/chatbotui-svg"

interface BrandProps {
  theme?: "dark" | "light"
}

export const Brand: FC<BrandProps> = ({ theme }) => {
  const { theme: currentTheme } = useTheme()
  // Use the provided theme; otherwise fall back to the current theme with light as the default
  const effectiveTheme = theme || (currentTheme === "dark" ? "dark" : "light")

  return (
    <Link
      className="flex cursor-pointer flex-col items-center hover:opacity-50"
      href="https://www.chatbotui.com"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="mb-2">
        <ChatbotUISVG theme={effectiveTheme} scale={0.3} />
      </div>

      <div className="text-4xl font-bold tracking-wide">
        MentalShield Project
      </div>
    </Link>
  )
}
