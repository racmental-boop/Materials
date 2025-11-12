"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"

interface Chat {
  id: string
  name: string
  prompt: string
  systemPrompt: string
  messages: Message[]
  created_at: string
}

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  created_at: string
}

export default function ChatPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const characterName = searchParams ? searchParams.get("characterName") : ""
  const chatId = params ? (params.chatId as string) : ""
  const [chat, setChat] = useState<Chat | null>(null)
  const [input, setInput] = useState("")
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const fetchChat = async () => {
      try {
        // Get chat information
        const { data: chatData, error: chatError } = await supabase
          .from("chats")
          .select("*, systemPrompt")
          .eq("id", chatId)
          .single()

        if (chatError) throw chatError

        // Get chat messages
        const { data: messages, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .eq("chat_id", chatId)
          .order("created_at", { ascending: true })

        if (messagesError) throw messagesError

        // Fetch prompts from API
        const response = await fetch("/api/prompts")
        const prompts = await response.json()
        const characterPrompt =
          prompts.find(
            (prompt: { character_name: string; system_prompt: string }) =>
              prompt.character_name === characterName
          )?.system_prompt || ""

        setChat({
          ...chatData,
          systemPrompt: characterPrompt,
          messages: messages || []
        })
      } catch (error) {
        console.error("Error fetching chat:", error)
      }
    }

    fetchChat()
  }, [chatId, supabase, characterName])

  const handleSend = async () => {
    if (!input.trim() || !chat) return

    try {
      // Add user message
      const { data: userMessage, error: userMessageError } = await supabase
        .from("messages")
        .insert([
          {
            chat_id: chatId,
            content: input,
            role: "user"
          }
        ])
        .select()
        .single()

      if (userMessageError) throw userMessageError

      // Add AI response logic here
      // Temporarily simulate a simple response
      const { data: assistantMessage, error: assistantMessageError } =
        await supabase
          .from("messages")
          .insert([
            {
              chat_id: chatId,
              content: `This is a response from ${chat.name}...`,
              role: "assistant"
            }
          ])
          .select()
          .single()

      if (assistantMessageError) throw assistantMessageError

      // Update chat state
      setChat(prev => ({
        ...prev!,
        messages: [...prev!.messages, userMessage, assistantMessage]
      }))
      setInput("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  if (!chat) {
    return (
      <div className="flex h-full items-center justify-center">Loading...</div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Character Information */}
      <div className="bg-background border-b p-4">
        <h2 className="text-2xl font-bold">{chat.name}</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {chat.systemPrompt}
        </p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {chat.messages.map(message => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="bg-background border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === "Enter" && handleSend()}
            placeholder={`Chat with ${chat.name}...`}
            className="flex-1 rounded-md border p-2"
          />
          <button
            onClick={handleSend}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
