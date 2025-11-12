import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all user conversations with unread message count
    const { data: conversations, error } = await supabase
      .from("admin_conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("last_message_at", { ascending: false })

    if (error) {
      console.error("Error fetching conversations:", error)
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      )
    }

    // Get unread count and latest message for each conversation
    const conversationsWithDetails = await Promise.all(
      (conversations || []).map(async (conversation) => {
        // Get unread message count
        const { data: unreadCount } = await supabase
          .from("admin_messages")
          .select("id", { count: "exact" })
          .eq("user_id", user.id)
          .eq("admin_id", conversation.admin_id)
          .eq("message_type", "admin_to_user")
          .eq("is_read", false)

        // Get latest message
        const { data: latestMessage } = await supabase
          .from("admin_messages")
          .select("content")
          .eq("user_id", user.id)
          .eq("admin_id", conversation.admin_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        return {
          ...conversation,
          unread_count: unreadCount?.length || 0,
          latest_message: latestMessage?.content || ""
        }
      })
    )

    return NextResponse.json({
      success: true,
      conversations: conversationsWithDetails
    })

  } catch (error) {
    console.error("Conversations API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 