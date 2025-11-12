import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { IconX } from "@tabler/icons-react"

interface ChatReminderProps {
  show: boolean
  type: "timeout" | "short_messages" | "focus"
  onClose: () => void
}

export function ChatReminder({ show, type, onClose }: ChatReminderProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(show)
  }, [show])

  const handleClose = () => {
    setIsVisible(false)
    onClose()
  }

  if (!isVisible) return null

  const getContent = () => {
    switch (type) {
      case "timeout":
        return {
          title: "Stay Connected!",
          message:
            "Please keep the conversation flowing to maintain real-time interaction. Don't leave the chat idle for too long!"
        }
      case "short_messages":
        return {
          title: "Engage More!",
          message:
            "Try to share more in your messages to have a meaningful conversation. Tell us more about your thoughts!"
        }
      case "focus":
        return {
          title: "Stay Connected!",
          message:
            "Please keep the conversation flowing to maintain real-time interaction. Don't leave the chat idle for too long!"
        }
      default:
        return {
          title: "Stay Connected!",
          message: "Please keep the conversation flowing to maintain real-time interaction. Don't leave the chat idle for too long!"
        }
    }
  }

  const content = getContent()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="bg-background border-border shadow-lg max-w-sm rounded-lg border p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-foreground font-semibold text-lg">
              {content.title}
            </h4>
            <p className="text-muted-foreground mt-2 text-sm">
              {content.message}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleClose}
          >
            <IconX size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}
