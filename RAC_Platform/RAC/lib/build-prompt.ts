import { Tables } from "@/supabase/types"
import { ChatPayload, MessageImage } from "@/types"
import { encode } from "gpt-tokenizer"
import { getBase64FromDataURL, getMediaTypeFromDataURL } from "@/lib/utils"
import { supabase } from "@/lib/supabase/browser-client"

// 获取用户最近的聊天历史摘要
const getUserRecentChatSummary = async (
  userId: string, 
  currentChatId: string,
  workspaceId: string,
  maxChats: number = 5
): Promise<string> => {
  try {

    // 获取用户最近的聊天会话（排除当前会话）
    const { data: recentChats } = await supabase
      .from("chats")
      .select("id, name, created_at, updated_at")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .neq("id", currentChatId)
      .order("updated_at", { ascending: false })
      .limit(maxChats)

    if (!recentChats || recentChats.length === 0) {
      return ""
    }

    let summary = "## Previous Chat History Summary\n"
    
    for (const chat of recentChats) {
      // 获取每个会话的最后几条消息
      const { data: messages } = await supabase
        .from("messages")
        .select("content, role, created_at")
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: false })
        .limit(6) // 最后3轮对话（用户+助手）

      if (messages && messages.length > 0) {
        const chatDate = new Date(chat.updated_at || chat.created_at).toLocaleDateString()
        summary += `\n**${chat.name}** (${chatDate}):\n`
        
        // 按时间正序排列消息，只取最后2轮对话
        const sortedMessages = messages.reverse().slice(-4)
        for (const msg of sortedMessages) {
          const role = msg.role === "user" ? "User" : "Assistant"
          const content = msg.content.length > 120 
            ? msg.content.substring(0, 120) + "..." 
            : msg.content
          summary += `- ${role}: ${content}\n`
        }
      }
    }
    
    summary += "\nNote: Reference the above chat history when relevant to provide contextual and continuous conversations.\n\n"
    return summary
  } catch (error) {
    console.error("Error fetching user chat summary:", error)
    return ""
  }
}

// 使用GPT-4o总结早期对话内容
const summarizeEarlyMessages = async (
  messages: Tables<"messages">[],
  maxTokens: number = 500
): Promise<string> => {
  try {
    // 如果消息太少，不需要总结
    if (messages.length <= 4) {
      return ""
    }

    // 构建需要总结的对话内容
    const conversationText = messages.map(msg => 
      `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
    ).join("\n\n")

    // 计算token数量，如果不超过限制就不总结
    const totalTokens = encode(conversationText).length
    if (totalTokens <= maxTokens) {
      return ""
    }

    // 使用内部API进行总结
    const response = await fetch("/api/chat/openai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are a conversation summarizer. Summarize the following conversation while preserving key information, character personality, important context, and emotional tone. Keep the summary concise but comprehensive. Focus on:\n1. Main topics discussed\n2. Character relationships and dynamics\n3. Important decisions or revelations\n4. Emotional context\n5. Any ongoing storylines or themes"
          },
          {
            role: "user",
            content: `Please summarize this conversation:\n\n${conversationText}`
          }
        ],
        model: "gpt-4o-mini",
        max_tokens: maxTokens,
        temperature: 0.3
      })
    })

    if (response.ok) {
      const data = await response.json()
      const summary = data.choices?.[0]?.message?.content || ""
      
      if (summary) {
        return `## Previous Conversation Summary\n${summary}\n\n`
      }
    }
    
    return ""
  } catch (error) {
    console.error("Error summarizing messages:", error)
    return ""
  }
}

const buildBasePrompt = async (
  prompt: string,
  profileContext: string,
  workspaceInstructions: string,
  assistant: Tables<"assistants"> | null,
  userId?: string,
  currentChatId?: string,
  workspaceId?: string
) => {
  let fullPrompt = ""

  if (assistant) {
    fullPrompt += `<INJECT ROLE>\nYou are not an AI. You are ${assistant.name}.\n</INJECT ROLE>\n\n`
  }

  fullPrompt += `Today is ${new Date().toLocaleDateString()}.\n\n`

  // 添加历史聊天摘要
  if (userId && currentChatId && workspaceId) {
    const historySummary = await getUserRecentChatSummary(userId, currentChatId, workspaceId)
    if (historySummary) {
      fullPrompt += historySummary
    }
  }

  if (profileContext) {
    fullPrompt += `User Info:\n${profileContext}\n\n`
  }

  if (workspaceInstructions) {
    fullPrompt += `System Instructions:\n${workspaceInstructions}\n\n`
  }

  fullPrompt += `User Instructions:\n${prompt}\n\n`
  
  fullPrompt += `IMPORTANT GUIDELINES:
1. You have access to the full conversation history above. Always refer to and remember what you have previously said in this conversation. 
2. When the user greets (e.g., "hi", "hello", "good morning"), do not reply with a generic greeting only. Instead, always incorporate relevant information from the user’s saved memories to make the greeting feel familiar and connected. 
3. Keep your responses concise and focused. Limit your replies to 3-4 sentences maximum unless the user specifically asks for a longer explanation.
4. If you asked a question earlier, remember that you asked it. If the user asks about "your first question" or similar, refer to what you actually said before in this conversation.
5. Do not reuse the same expressions across responses; vary tone and wording naturally.
6. Eliminate unnecessary repetition of previously stated points.
7. Avoid robotic or repetitive phrasing.`

  return fullPrompt
}

export async function buildFinalMessages(
  payload: ChatPayload,
  profile: Tables<"profiles">,
  chatImages: MessageImage[]
) {
  const {
    chatSettings,
    workspaceInstructions,
    chatMessages,
    assistant,
    messageFileItems,
    chatFileItems,
    currentChat
  } = payload

  const BUILT_PROMPT = await buildBasePrompt(
    chatSettings.prompt,
    chatSettings.includeProfileContext ? profile.profile_context || "" : "",
    chatSettings.includeWorkspaceInstructions ? workspaceInstructions : "",
    assistant,
    profile.user_id,
    currentChat?.id,
    currentChat?.workspace_id
  )

  const CHUNK_SIZE = chatSettings.contextLength
  const PROMPT_TOKENS = encode(chatSettings.prompt).length

  let remainingTokens = CHUNK_SIZE - PROMPT_TOKENS

  let usedTokens = 0
  usedTokens += PROMPT_TOKENS

  const processedChatMessages = chatMessages.map((chatMessage, index) => {
    const nextChatMessage = chatMessages[index + 1]

    if (nextChatMessage === undefined) {
      return chatMessage
    }

    const nextChatMessageFileItems = nextChatMessage.fileItems

    if (nextChatMessageFileItems.length > 0) {
      const findFileItems = nextChatMessageFileItems
        .map(fileItemId =>
          chatFileItems.find(chatFileItem => chatFileItem.id === fileItemId)
        )
        .filter(item => item !== undefined) as Tables<"file_items">[]

      const retrievalText = buildRetrievalText(findFileItems)

      return {
        message: {
          ...chatMessage.message,
          content:
            `${chatMessage.message.content}\n\n${retrievalText}` as string
        },
        fileItems: []
      }
    }

    return chatMessage
  })

  let finalMessages = []
  let summaryText = ""

  // 智能上下文管理：当消息过多时进行总结
  const SUMMARY_THRESHOLD = Math.floor(CHUNK_SIZE * 0.7) // 使用70%的上下文长度作为阈值
  
  // 计算所有消息的总token数
  const allMessagesTokens = processedChatMessages.reduce(
    (total, chatMessage) => total + encode(chatMessage.message.content).length, 
    0
  )

  if (allMessagesTokens > SUMMARY_THRESHOLD && processedChatMessages.length > 6) {
    // 需要进行总结
    const messagesToKeep = Math.floor(processedChatMessages.length * 0.3) // 保留最近30%的消息
    const messagesToSummarize = processedChatMessages.slice(0, -messagesToKeep)
    const recentMessages = processedChatMessages.slice(-messagesToKeep)

    // 总结早期消息
    if (messagesToSummarize.length > 0) {
      summaryText = await summarizeEarlyMessages(
        messagesToSummarize.map(cm => cm.message),
        Math.floor(CHUNK_SIZE * 0.2) // 总结占用20%的上下文
      )
    }

    // 处理最近的消息
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const message = recentMessages[i].message
      const messageTokens = encode(message.content).length

      if (messageTokens <= remainingTokens) {
        remainingTokens -= messageTokens
        usedTokens += messageTokens
        finalMessages.unshift(message)
      } else {
        break
      }
    }
  } else {
    // 正常处理：从最新消息开始，直到达到token限制
    for (let i = processedChatMessages.length - 1; i >= 0; i--) {
      const message = processedChatMessages[i].message
      const messageTokens = encode(message.content).length

      if (messageTokens <= remainingTokens) {
        remainingTokens -= messageTokens
        usedTokens += messageTokens
        finalMessages.unshift(message)
      } else {
        break
      }
    }
  }

  // 将总结文本添加到系统提示中
  const finalPrompt = summaryText ? `${BUILT_PROMPT}\n\n${summaryText}` : BUILT_PROMPT

  let tempSystemMessage: Tables<"messages"> = {
    chat_id: "",
    assistant_id: null,
    content: finalPrompt,
    created_at: "",
    id: processedChatMessages.length + "",
    image_paths: [],
    model: payload.chatSettings.model,
    role: "system",
    sequence_number: processedChatMessages.length,
    updated_at: "",
    user_id: ""
  }

  finalMessages.unshift(tempSystemMessage)

  finalMessages = finalMessages.map(message => {
    let content

    if (message.image_paths.length > 0) {
      content = [
        {
          type: "text",
          text: message.content
        },
        ...message.image_paths.map(path => {
          let formedUrl = ""

          if (path.startsWith("data")) {
            formedUrl = path
          } else {
            const chatImage = chatImages.find(image => image.path === path)

            if (chatImage) {
              formedUrl = chatImage.base64
            }
          }

          return {
            type: "image_url",
            image_url: {
              url: formedUrl
            }
          }
        })
      ]
    } else {
      content = message.content
    }

    return {
      role: message.role,
      content
    }
  })

  if (messageFileItems.length > 0) {
    const retrievalText = buildRetrievalText(messageFileItems)

    finalMessages[finalMessages.length - 1] = {
      ...finalMessages[finalMessages.length - 1],
      content: `${
        finalMessages[finalMessages.length - 1].content
      }\n\n${retrievalText}`
    }
  }

  return finalMessages
}

function buildRetrievalText(fileItems: Tables<"file_items">[]) {
  const retrievalText = fileItems
    .map(item => `<BEGIN SOURCE>\n${item.content}\n</END SOURCE>`)
    .join("\n\n")

  return `You may use the following sources if needed to answer the user's question. If you don't know the answer, say "I don't know."\n\n${retrievalText}`
}

function adaptSingleMessageForGoogleGemini(message: any) {
  let adaptedParts = []

  let rawParts = []
  if (!Array.isArray(message.content)) {
    rawParts.push({ type: "text", text: message.content })
  } else {
    rawParts = message.content
  }

  for (let i = 0; i < rawParts.length; i++) {
    let rawPart = rawParts[i]

    if (rawPart.type == "text") {
      adaptedParts.push({ text: rawPart.text })
    } else if (rawPart.type === "image_url") {
      adaptedParts.push({
        inlineData: {
          data: getBase64FromDataURL(rawPart.image_url.url),
          mimeType: getMediaTypeFromDataURL(rawPart.image_url.url)
        }
      })
    }
  }

  let role = "user"
  if (["user", "system"].includes(message.role)) {
    role = "user"
  } else if (message.role === "assistant") {
    role = "model"
  }

  return {
    role: role,
    parts: adaptedParts
  }
}

function adaptMessagesForGeminiVision(messages: any[]) {
  // Gemini Pro Vision cannot process multiple messages
  // Reformat, using all texts and last visual only

  const basePrompt = messages[0].parts[0].text
  const baseRole = messages[0].role
  const lastMessage = messages[messages.length - 1]
  const visualMessageParts = lastMessage.parts
  let visualQueryMessages = [
    {
      role: "user",
      parts: [
        `${baseRole}:\n${basePrompt}\n\nuser:\n${visualMessageParts[0].text}\n\n`,
        visualMessageParts.slice(1)
      ]
    }
  ]
  return visualQueryMessages
}

export async function adaptMessagesForGoogleGemini(
  payload: ChatPayload,
  messages: any[]
) {
  let geminiMessages = []
  for (let i = 0; i < messages.length; i++) {
    let adaptedMessage = adaptSingleMessageForGoogleGemini(messages[i])
    geminiMessages.push(adaptedMessage)
  }

  if (payload.chatSettings.model === "gemini-pro-vision") {
    geminiMessages = adaptMessagesForGeminiVision(geminiMessages)
  }
  return geminiMessages
}
