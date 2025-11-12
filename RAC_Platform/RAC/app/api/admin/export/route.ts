import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
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

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const admin = await verifyAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // 获取所有用户的完整数据
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
      return NextResponse.json(
        { error: "Failed to fetch user profiles" },
        { status: 500 }
      )
    }

    // 获取所有用户的每日进度
    const { data: dailyProgress, error: progressError } = await supabase
      .from("user_daily_progress")
      .select("*")
      .order("user_id", { ascending: true })

    // 获取所有emoji调查数据
    const { data: emojiSurveys, error: surveysError } = await supabase
      .from("emoji_surveys")
      .select("*")
      .order("user_id", { ascending: true })

    // 获取所有聊天记录
    const { data: chats, error: chatsError } = await supabase
      .from("chats")
      .select("*")
      .order("user_id", { ascending: true })

    // 获取所有消息记录
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .order("user_id", { ascending: true })

    // 组织每个用户的完整数据
    const exportData =
      profiles?.map(profile => {
        // 获取该用户的所有相关数据
        const userProgress =
          dailyProgress?.filter(
            progress => progress.user_id === profile.user_id
          ) || []

        const userSurveys =
          emojiSurveys?.filter(survey => survey.user_id === profile.user_id) ||
          []

        const userChats =
          chats?.filter(chat => chat.user_id === profile.user_id) || []

        const userMessages =
          messages?.filter(message => message.user_id === profile.user_id) || []

        // 按聊天分组消息
        const chatMessagesMap = new Map()
        userMessages.forEach(message => {
          const chatId = message.chat_id
          if (!chatMessagesMap.has(chatId)) {
            chatMessagesMap.set(chatId, [])
          }
          chatMessagesMap.get(chatId).push({
            id: message.id,
            content: message.content,
            role: message.role,
            created_at: message.created_at,
            sequence_number: message.sequence_number
          })
        })

        // 构建聊天记录，包含消息
        const chatsWithMessages = userChats.map(chat => ({
          chat_id: chat.id,
          chat_name: chat.name,
          created_at: chat.created_at,
          updated_at: chat.updated_at,
          messages: chatMessagesMap.get(chat.id) || []
        }))

        // 计算统计数据
        const totalRequiredSurveys = userProgress.reduce(
          (sum, progress) => sum + progress.required_surveys_completed,
          0
        )
        const totalExtraSurveys = userProgress.reduce(
          (sum, progress) => sum + progress.extra_surveys_completed,
          0
        )
        const totalMessages = userMessages.length
        const totalChats = userChats.length

        // 计算活跃天数
        const uniqueDates = new Set(
          userProgress.map(progress => progress.session_date)
        )
        const activeDays = uniqueDates.size

        // 按日期分组emoji调查
        const surveysByDate = userSurveys.reduce((acc, survey) => {
          const date = survey.session_date
          if (!acc[date]) {
            acc[date] = []
          }
          acc[date].push({
            id: survey.id,
            emotion_score: survey.emotion_score,
            question_text: survey.question_text,
            survey_type: survey.survey_type,
            survey_order: survey.survey_order,
            created_at: survey.created_at,
            notes: survey.notes
          })
          return acc
        }, {} as any)

        // 按日期分组每日进度
        const progressByDate = userProgress.reduce((acc, progress) => {
          acc[progress.session_date] = {
            required_surveys_completed: progress.required_surveys_completed,
            extra_surveys_completed: progress.extra_surveys_completed,
            created_at: progress.created_at,
            updated_at: progress.updated_at
          }
          return acc
        }, {} as any)

        return {
          // 用户基本信息
          user_profile: {
            user_id: profile.user_id,
            email: profile.email,
            display_name: profile.display_name,
            username: profile.username,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
            has_onboarded: profile.has_onboarded,
            bio: profile.bio,
            profile_context: profile.profile_context
          },

          // 统计摘要
          statistics: {
            total_required_surveys: totalRequiredSurveys,
            total_extra_surveys: totalExtraSurveys,
            total_messages: totalMessages,
            total_chats: totalChats,
            active_days: activeDays,
            first_activity: userProgress[0]?.session_date || null,
            last_activity:
              userProgress[userProgress.length - 1]?.session_date || null
          },

          // 每日进度数据
          daily_progress: progressByDate,

          // emoji调查数据
          emoji_surveys: surveysByDate,

          // 聊天记录（包含消息）
          conversations: chatsWithMessages,

          // 导出时间戳
          exported_at: new Date().toISOString(),
          exported_by: admin.email
        }
      }) || []

    // 创建JSONL格式的数据
    const jsonlData = exportData
      .map(userData => JSON.stringify(userData))
      .join("\n")

    // 创建文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `mentalshield-export-${timestamp}.jsonl`

    // 返回文件下载响应
    return new NextResponse(jsonlData, {
      status: 200,
      headers: {
        "Content-Type": "application/jsonl",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": jsonlData.length.toString()
      }
    })
  } catch (error) {
    console.error("Admin export API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// 获取导出统计信息
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const admin = await verifyAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // 获取各种数据的统计信息
    const [
      { count: profilesCount },
      { count: surveysCount },
      { count: messagesCount },
      { count: chatsCount },
      { count: progressCount }
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("emoji_surveys")
        .select("*", { count: "exact", head: true }),
      supabase.from("messages").select("*", { count: "exact", head: true }),
      supabase.from("chats").select("*", { count: "exact", head: true }),
      supabase
        .from("user_daily_progress")
        .select("*", { count: "exact", head: true })
    ])

    return NextResponse.json({
      success: true,
      statistics: {
        total_users: profilesCount || 0,
        total_emoji_surveys: surveysCount || 0,
        total_messages: messagesCount || 0,
        total_chats: chatsCount || 0,
        total_daily_progress_records: progressCount || 0
      }
    })
  } catch (error) {
    console.error("Admin export statistics API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
