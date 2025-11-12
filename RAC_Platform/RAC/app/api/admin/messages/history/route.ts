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

// Get all admin message history
export async function GET(request: NextRequest) {
  try {
    // Verify admin permissions
    const admin = await verifyAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all admin messages with user information
    const { data: messages, error } = await supabase
      .from("admin_messages")
      .select(`
        id,
        content,
        message_type,
        is_read,
        created_at,
        admin_id,
        user_id,
        profiles!admin_messages_user_id_fkey(username, display_name),
        admins!admin_messages_admin_id_fkey(name)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching message history:", error)
      return NextResponse.json(
        { error: "Failed to fetch message history" },
        { status: 500 }
      )
    }

    // Format message data
    const formattedMessages = (messages || []).map(message => ({
      id: message.id,
      content: message.content,
      message_type: message.message_type,
      is_read: message.is_read,
      created_at: message.created_at,
      admin_id: message.admin_id,
      user_id: message.user_id,
      admin_name: (message.admins as any)?.name || 'Admin',
      user_username: (message.profiles as any)?.username || 'Unknown',
      user_display_name: (message.profiles as any)?.display_name || 'Unknown User'
    }))

    return NextResponse.json({
      success: true,
      messages: formattedMessages
    })

  } catch (error) {
    console.error("Admin message history API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
