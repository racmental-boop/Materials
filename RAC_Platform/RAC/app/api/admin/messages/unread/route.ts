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

    // Query admin_messages table directly for unread count
    const { data, error } = await supabase
      .from("admin_messages")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .eq("message_type", "admin_to_user")
      .eq("is_read", false)

    if (error) {
      console.error("Error fetching unread count:", error)
      return NextResponse.json({ count: 0 })
    }

    return NextResponse.json({ 
      success: true,
      count: data?.length || 0 
    })

  } catch (error) {
    console.error("Unread messages API error:", error)
    return NextResponse.json({ count: 0 })
  }
} 