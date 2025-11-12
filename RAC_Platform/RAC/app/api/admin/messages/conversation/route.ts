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

    const { searchParams } = new URL(request.url)
    const admin_id = searchParams.get("admin_id")

    if (!admin_id) {
      return NextResponse.json(
        { error: "Admin ID is required" },
        { status: 400 }
      )
    }

    // Get conversation messages
    const { data: messages, error } = await supabase
      .from("admin_messages")
      .select("*")
      .eq("user_id", user.id)
      .eq("admin_id", admin_id)
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
    console.error("Conversation API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 