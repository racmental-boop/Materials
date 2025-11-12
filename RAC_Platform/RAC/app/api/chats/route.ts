import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import * as fs from 'fs'
import * as path from 'path'

// Retrieve a character's conversation starter
function getCharacterConversationStarter(characterName: string): string | null {
  try {
    const charactersFilePath = path.join('/home/kisna/workspace/prompts_coser/generated_characters.jsonl')
    const fileContent = fs.readFileSync(charactersFilePath, 'utf-8')
    const lines = fileContent.trim().split('\n')
    
    // Generic starters used when the character has no custom entries
    const genericStarters = [
      "How are you doing today?",
      "What's on your mind?",
      "How can I help you today?",
      "What would you like to talk about?",
      "How has your day been so far?",
      "What brings you here today?",
      "Is there anything interesting happening in your life?",
      "What's been keeping you busy lately?"
    ]
    
    for (const line of lines) {
      const character = JSON.parse(line)
      if (character.character_name === characterName) {
        const starters = character.conversation_starters
        
        // Ensure there are valid starters
        if (Array.isArray(starters) && starters.length > 0) {
          // Strip out empty entries or placeholders such as "No conversation starters available"
          const validStarters = starters.filter(starter => 
            starter && 
            starter.trim() !== "" && 
            starter !== "No conversation starters available"
          )
          
          if (validStarters.length > 0) {
            // Pick a random valid starter
            const randomIndex = Math.floor(Math.random() * validStarters.length)
            return validStarters[randomIndex]
          }
        }
        
        // Fallback to the generic list when nothing valid is available
        const randomIndex = Math.floor(Math.random() * genericStarters.length)
        return genericStarters[randomIndex]
      }
    }
    
    // If the character cannot be found, use the generic list
    const randomIndex = Math.floor(Math.random() * genericStarters.length)
    return genericStarters[randomIndex]
    
  } catch (error) {
    console.error('Error reading character conversation starters:', error)
    // On error, fall back to the generic list as well
    const genericStarters = [
      "How are you doing today?",
      "What's on your mind?",
      "How can I help you today?"
    ]
    const randomIndex = Math.floor(Math.random() * genericStarters.length)
    return genericStarters[randomIndex]
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get current user
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { characterId, characterName, systemPrompt, characterImageUrl } = body

    // Get or create user's workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (workspaceError && workspaceError.code !== "PGRST116") {
      console.error("Error fetching workspace:", workspaceError)
      return NextResponse.json(
        { error: "Failed to fetch workspace" },
        { status: 500 }
      )
    }

    let workspaceId = workspace?.id

    if (!workspaceId) {
      // Create a new workspace if it doesn't exist
      const { data: newWorkspace, error: createWorkspaceError } = await supabase
        .from("workspaces")
        .insert([
          {
            user_id: user.id,
            name: "My Workspace",
            description: "Default workspace",
            default_context_length: 4096,
            default_model: "gpt-4.1-2025-04-14",
            default_prompt: "You are a helpful AI assistant.",
            default_temperature: 0.7,
            embeddings_provider: "openai",
            include_profile_context: true,
            include_workspace_instructions: true,
            instructions: "Be helpful and informative.",
            is_home: true
          }
        ])
        .select()
        .single()

      if (createWorkspaceError) {
        console.error("Error creating workspace:", createWorkspaceError)
        return NextResponse.json(
          { error: "Failed to create workspace" },
          { status: 500 }
        )
      }

      workspaceId = newWorkspace.id
    }

    // Create new chat
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .insert([
        {
          user_id: user.id,
          workspace_id: workspaceId,
          name: `${characterName}`,
          model: "gpt-4.1-2025-04-14",
          prompt:
            systemPrompt ||
            `Hi there, I am ${characterName}. Start to talk with me!`,
          temperature: 0.7,
          context_length: 4096,
          embeddings_provider: "openai",
          include_profile_context: true,
          include_workspace_instructions: true,
          character_image_url: characterImageUrl
        }
      ])
      .select()
      .single()

    if (chatError) {
      console.error("Error creating chat:", chatError)
      return NextResponse.json(
        { error: "Failed to create chat" },
        { status: 500 }
      )
    }

    // Create the initial assistant message with a character starter
    const conversationStarter = getCharacterConversationStarter(characterName)
    if (conversationStarter) {
      // Seed the conversation with the starter as the assistant's greeting
      const { error: assistantMessageError } = await supabase
        .from("messages")
        .insert([
          {
            chat_id: chat.id,
            user_id: user.id,
            content: conversationStarter,
            role: "assistant",
            model: "gpt-4.1-2025-04-14",
            sequence_number: 1,
            image_paths: []
          }
        ])

      if (assistantMessageError) {
        console.error("Error creating initial assistant message:", assistantMessageError)
      }
    }

    return NextResponse.json(chat)
  } catch (error) {
    console.error("Error in POST /api/chats:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
