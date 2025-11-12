import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
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

export async function GET(
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
    console.log("导出API - 接收到的userId:", userId)
    console.log("导出API - userId类型:", typeof userId)
    console.log("导出API - userId长度:", userId?.length)
    
    // 使用service role key来绕过RLS限制
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 获取用户基本信息
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single()

    console.log("导出API - 查询结果:", { profile, profileError })

    if (profileError || !profile) {
      console.log("导出API - 用户未找到，错误:", profileError)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 获取用户邮箱 - 使用同一个service role客户端
    const serviceSupabase = supabase
    
    const { data: authUser, error: authError } = await serviceSupabase.auth.admin.getUserById(userId)

    // 获取用户的所有emoji调查
    const { data: emojiSurveys, error: surveysError } = await supabase
      .from("emoji_surveys")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })

    if (surveysError) {
      console.error("Error fetching emoji surveys:", surveysError)
    }

    // 获取用户的所有聊天记录
    const { data: chats, error: chatsError } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })

    if (chatsError) {
      console.error("Error fetching chats:", chatsError)
    }

    // 获取用户的所有消息
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })

    if (messagesError) {
      console.error("Error fetching messages:", messagesError)
    }

    // 获取用户每日进度
    const { data: dailyProgress, error: progressError } = await supabase
      .from("user_daily_progress")
      .select("*")
      .eq("user_id", userId)
      .order("session_date", { ascending: true })

    if (progressError) {
      console.error("Error fetching daily progress:", progressError)
    }

    // 构建导出数据
    const exportData = {
      user_info: {
        user_id: profile.user_id,
        email: authUser?.user?.email || `${profile.username}@example.com`,
        username: profile.username,
        display_name: profile.display_name,
        bio: profile.bio,
        created_at: profile.created_at,
        has_onboarded: profile.has_onboarded,
        exported_at: new Date().toISOString()
      },
      emoji_surveys:
        emojiSurveys?.map(survey => ({
          id: survey.id,
          survey_type: survey.survey_type,
          emotion_score: survey.emotion_score,
          question_text: survey.question_text,
          session_date: survey.session_date,
          survey_order: survey.survey_order,
          notes: survey.notes,
          created_at: survey.created_at,
          updated_at: survey.updated_at
        })) || [],
      chats:
        chats?.map(chat => ({
          id: chat.id,
          name: chat.name,
          created_at: chat.created_at,
          updated_at: chat.updated_at
        })) || [],
      messages:
        messages?.map(message => ({
          id: message.id,
          chat_id: message.chat_id,
          role: message.role,
          content: message.content,
          created_at: message.created_at,
          updated_at: message.updated_at
        })) || [],
      daily_progress:
        dailyProgress?.map(progress => ({
          id: progress.id,
          session_date: progress.session_date,
          required_surveys_completed: progress.required_surveys_completed,
          extra_surveys_completed: progress.extra_surveys_completed,
          created_at: progress.created_at,
          updated_at: progress.updated_at
        })) || [],
      statistics: {
        total_emoji_surveys: emojiSurveys?.length || 0,
        total_chats: chats?.length || 0,
        total_messages: messages?.length || 0,
        active_days: dailyProgress?.length || 0,
        first_activity:
          emojiSurveys?.[0]?.created_at || chats?.[0]?.created_at || null,
        last_activity:
          emojiSurveys?.[emojiSurveys.length - 1]?.created_at ||
          chats?.[chats.length - 1]?.created_at ||
          null
      }
    }

    // 创建JSONL格式的数据
    const jsonlLines = [
      JSON.stringify({ type: "user_info", data: exportData.user_info }),
      ...exportData.emoji_surveys.map(survey =>
        JSON.stringify({ type: "emoji_survey", data: survey })
      ),
      ...exportData.chats.map(chat =>
        JSON.stringify({ type: "chat", data: chat })
      ),
      ...exportData.messages.map(message =>
        JSON.stringify({ type: "message", data: message })
      ),
      ...exportData.daily_progress.map(progress =>
        JSON.stringify({ type: "daily_progress", data: progress })
      ),
      JSON.stringify({ type: "statistics", data: exportData.statistics })
    ]

    const jsonlContent = jsonlLines.join("\n")

    // 生成文件名
    const timestamp = new Date().toISOString().split("T")[0]
    const filename = `user-${profile.username || userId.substring(0, 8)}-${timestamp}.jsonl`

    // 返回文件
    return new NextResponse(jsonlContent, {
      status: 200,
      headers: {
        "Content-Type": "application/jsonl",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": Buffer.byteLength(jsonlContent, "utf8").toString()
      }
    })
  } catch (error) {
    console.error("Export user data error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
