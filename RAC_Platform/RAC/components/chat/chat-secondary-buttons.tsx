import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatbotUIContext } from "@/context/context"
import { IconLogout, IconMessagePlus } from "@tabler/icons-react"
import { FC, useContext } from "react"
import { WithTooltip } from "../ui/with-tooltip"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/browser-client"

interface ChatSecondaryButtonsProps {}

export const ChatSecondaryButtons: FC<ChatSecondaryButtonsProps> = ({}) => {
  const { selectedChat } = useContext(ChatbotUIContext)
  const router = useRouter()

  const { handleNewChat } = useChatHandler()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
    return
  }

  return (
    <>
      {selectedChat && null}

      <WithTooltip
        delayDuration={200}
        display={<div>Sign Out</div>}
        trigger={
          <div className="mt-1">
            <IconLogout
              className="cursor-pointer hover:opacity-50"
              size={24}
              onClick={handleSignOut}
            />
          </div>
        }
      />
    </>
  )
}
