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

    // Get request parameters
    const body = await request.json().catch(() => ({}))
    const { admin_id } = body

    // Build query conditions
    let query = supabase
      .from("admin_messages")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("message_type", "admin_to_user")
      .eq("is_read", false)

    // If admin_id is specified, only mark messages from specific admin
    if (admin_id) {
      query = query.eq("admin_id", admin_id)
    }

    const { error } = await query

    if (error) {
      console.error("Error marking messages as read:", error)
      return NextResponse.json(
        { error: "Failed to mark messages as read" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error("Mark read API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 