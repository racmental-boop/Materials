import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || "your-admin-secret-key"

// 验证管理员权限的中间件函数
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

// 删除用户及其所有相关数据
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // 验证管理员权限
    const admin = await verifyAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = params

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // 使用service role key来删除用户数据
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 检查用户是否存在
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, username, display_name")
      .eq("user_id", userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    // 开始删除用户的所有相关数据
    console.log(`开始删除用户 ${userId} 的所有数据...`)

    // 1. 删除用户的emoji调查记录
    const { error: surveysError } = await supabase
      .from("emoji_surveys")
      .delete()
      .eq("user_id", userId)

    if (surveysError) {
      console.error("删除emoji调查失败:", surveysError)
      // 继续执行，不中断整个删除流程
    }

    // 2. 删除用户的每日进度记录
    const { error: progressError } = await supabase
      .from("user_daily_progress")
      .delete()
      .eq("user_id", userId)

    if (progressError) {
      console.error("删除每日进度失败:", progressError)
    }

    // 3. 删除用户的聊天消息
    const { error: messagesError } = await supabase
      .from("messages")
      .delete()
      .eq("user_id", userId)

    if (messagesError) {
      console.error("删除消息失败:", messagesError)
    }

    // 4. 删除用户的聊天记录
    const { error: chatsError } = await supabase
      .from("chats")
      .delete()
      .eq("user_id", userId)

    if (chatsError) {
      console.error("删除聊天记录失败:", chatsError)
    }

    // 5. 删除用户的工作空间
    const { error: workspacesError } = await supabase
      .from("workspaces")
      .delete()
      .eq("user_id", userId)

    if (workspacesError) {
      console.error("删除工作空间失败:", workspacesError)
    }

    // 6. 删除用户的profile记录
    const { error: profileDeleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("user_id", userId)

    if (profileDeleteError) {
      console.error("删除用户资料失败:", profileDeleteError)
      return NextResponse.json(
        { error: "删除用户资料失败" },
        { status: 500 }
      )
    }

    // 7. 最后删除认证用户
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error("删除认证用户失败:", authDeleteError)
      return NextResponse.json(
        { error: "删除认证用户失败: " + authDeleteError.message },
        { status: 500 }
      )
    }

    console.log(`成功删除用户 ${userId} 的所有数据`)

    return NextResponse.json({
      success: true,
      message: `用户 ${profile.display_name || profile.username} 及其所有数据已成功删除`
    })
  } catch (error) {
    console.error("Delete user API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
