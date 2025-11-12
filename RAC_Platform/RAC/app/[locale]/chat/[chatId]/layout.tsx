"use client"

import { Dashboard } from "@/components/ui/dashboard"

export default function ChatLayout({
  children
}: {
  children: React.ReactNode
}) {
  return <Dashboard>{children}</Dashboard>
}
