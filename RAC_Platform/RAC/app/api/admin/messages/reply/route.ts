import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { admin_id, content } = await request.json()

    if (!admin_id || !content?.trim()) {
      return NextResponse.json(
        { error: "Admin ID and content are required" },
        { status: 400 }
      )
    }

    // Send reply message
    const { data: message, error: messageError } = await supabase
      .from("admin_messages")
      .insert({
        admin_id: admin_id,
        user_id: user.id,
        content: content.trim(),
        message_type: 'user_to_admin',
        is_read: false
      })
      .select()
      .single()

    if (messageError) {
      console.error("Error sending reply:", messageError)
      return NextResponse.json(
        { error: "Failed to send reply" },
        { status: 500 }
      )
    }

    // Update conversation's last message time
    await supabase
      .from("admin_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("admin_id", admin_id)
      .eq("user_id", user.id)

    return NextResponse.json({
      success: true,
      message: message
    })

  } catch (error) {
    console.error("Reply API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 