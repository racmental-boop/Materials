"use client"

import { ChatHelp } from "@/components/chat/chat-help"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatSettings } from "@/components/chat/chat-settings"
import { ChatUI } from "@/components/chat/chat-ui"
import { QuickSettings } from "@/components/chat/quick-settings"
import { Brand } from "@/components/ui/brand"
import { ChatbotUIContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { useTheme } from "next-themes"
import { useContext } from "react"
import { EmojiSurveyProgressBar } from "@/components/ui/progress-bar"
import { WithTooltip } from "@/components/ui/with-tooltip"
import { IconLogout } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/browser-client"

export default function ChatPage() {
  // useHotkey("o", () => handleNewChat()) // New-chat hotkey disabled
  useHotkey("l", () => {
    handleFocusChatInput()
  })

  const { chatMessages } = useContext(ChatbotUIContext)
  const router = useRouter()

  const { handleNewChat, handleFocusChatInput } = useChatHandler()

  const { theme } = useTheme()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
    return
  }

  return (
    <div className="relative h-full">
      {chatMessages.length === 0 ? (
        <div className="relative flex h-full flex-col items-center justify-center">
          <div className="top-50% left-50% -translate-x-50% -translate-y-50% absolute mb-16 sm:mb-20">
            <Brand theme={theme === "dark" ? "dark" : "light"} />
          </div>

          <div className="absolute left-2 top-2">
            <QuickSettings />
          </div>

          <div className="absolute right-2 top-2 flex items-center space-x-1 sm:space-x-2">
            <WithTooltip
              delayDuration={200}
              display={<div>Sign Out</div>}
              trigger={
                <div className="mt-1">
                  <IconLogout
                    className="cursor-pointer hover:opacity-50 sm:size-6"
                    size={20}
                    onClick={handleSignOut}
                  />
                </div>
              }
            />
            <ChatSettings />
          </div>

          <div className="flex grow flex-col items-center justify-center" />

          <div className="w-full max-w-full items-end px-2 pb-3 pt-0 sm:max-w-[600px] sm:pb-8 sm:pt-5 md:max-w-[700px] lg:max-w-[700px] xl:max-w-[800px]">
            <EmojiSurveyProgressBar />
            {/* Show chat input only after an assistant is selected */}
          </div>

          <div className="absolute bottom-2 right-2 hidden md:block lg:bottom-4 lg:right-4">
            <ChatHelp />
          </div>
        </div>
      ) : (
        <ChatUI />
      )}
    </div>
  )
}
