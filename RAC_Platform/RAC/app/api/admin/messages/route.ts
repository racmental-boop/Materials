import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || "your-admin-secret-key"

// Middleware function to verify admin permissions
async function verifyAdminAuth(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value

  if (!token) {
    return null
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded
  } catch (error) {
    return null
  }
}

// Send message to user
export async function POST(request: NextRequest) {
  try {
    // Verify admin permissions
    const admin = await verifyAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { user_id, content } = await request.json()

    if (!user_id || !content?.trim()) {
      return NextResponse.json(
        { error: "User ID and content are required" },
        { status: 400 }
      )
    }

    // Use service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user_id)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Create or get conversation
    // First try to get existing conversation
    let { data: conversation, error: getConversationError } = await supabase
      .from("admin_conversations")
      .select("*")
      .eq("admin_id", admin.adminId)
      .eq("user_id", user_id)
      .single()

    // If conversation doesn't exist, create new one
    if (getConversationError && getConversationError.code === 'PGRST116') {
      const { data: newConversation, error: createError } = await supabase
        .from("admin_conversations")
        .insert({
          admin_id: admin.adminId,
          user_id: user_id,
          title: `Conversation with ${user.display_name || user.username}`,
          last_message_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error("Error creating conversation:", createError)
        return NextResponse.json(
          { error: "Failed to create conversation" },
          { status: 500 }
        )
      }
      conversation = newConversation
    } else if (getConversationError) {
      console.error("Error getting conversation:", getConversationError)
      return NextResponse.json(
        { error: "Failed to get conversation" },
        { status: 500 }
      )
    }

    // Update conversation's last message time
    if (conversation) {
      await supabase
        .from("admin_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversation.id)
    }

    // Send message
    const { data: message, error: messageError } = await supabase
      .from("admin_messages")
      .insert({
        admin_id: admin.adminId,
        user_id: user_id,
        content: content.trim(),
        message_type: 'admin_to_user',
        is_read: false
      })
      .select()
      .single()

    if (messageError) {
      console.error("Error sending message:", messageError)
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: message
    })

  } catch (error) {
    console.error("Admin message API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Get conversation between admin and user
export async function GET(request: NextRequest) {
  try {
    // Verify admin permissions
    const admin = await verifyAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get("user_id")

    if (!user_id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Use service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get conversation messages
    const { data: messages, error } = await supabase
      .from("admin_messages")
      .select(`
        *,
        admin:admins(name),
        user:profiles(username, display_name)
      `)
      .or(`and(admin_id.eq.${admin.adminId},user_id.eq.${user_id})`)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching conversation:", error)
      return NextResponse.json(
        { error: "Failed to fetch conversation" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messages: messages || []
    })

  } catch (error) {
    console.error("Admin message API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 