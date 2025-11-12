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

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const admin = await verifyAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 使用service role key来绕过RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 获取所有用户的基本信息
    let profiles: any[] = []

    // 尝试简单查询
    const { data: simpleProfiles, error: simpleError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (simpleError) {
      console.error("Error fetching profiles:", simpleError)
      return NextResponse.json(
        { error: "Failed to fetch user profiles" },
        { status: 500 }
      )
    }

    // 获取所有用户的真实邮箱 - 使用管理员 API (支持分页)
    const userIds = simpleProfiles?.map(p => p.user_id) || []
    let authUsers: any[] = []
    
    console.log(`需要获取邮箱的用户数量: ${userIds.length}`)
    
    if (userIds.length > 0) {
      try {
        // 使用分页获取所有用户信息
        let allAuthUsers: any[] = []
        let page = 1
        const perPage = 1000 // 每页最多1000个用户
        
        while (true) {
          console.log(`获取第${page}页用户数据...`)
          const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: perPage
          })
          
          if (authError) {
            console.error(`获取第${page}页用户失败:`, authError)
            break
          }
          
          if (!authData.users || authData.users.length === 0) {
            console.log(`第${page}页无用户数据，结束获取`)
            break
          }
          
          allAuthUsers = allAuthUsers.concat(authData.users)
          console.log(`第${page}页获取到${authData.users.length}个用户，累计${allAuthUsers.length}个`)
          
          // 如果这一页的用户数少于perPage，说明已经是最后一页
          if (authData.users.length < perPage) {
            break
          }
          
          page++
        }
        
        // 过滤出我们需要的用户
        authUsers = allAuthUsers.filter(user => userIds.includes(user.id)) || []
        console.log(`最终匹配到的用户数: ${authUsers.length}/${userIds.length}`)
        
      } catch (error) {
        console.error("Error fetching auth users:", error)
        authUsers = []
      }
    }

    // 合并profiles和真实邮箱数据
    let realEmailCount = 0
    let fallbackEmailCount = 0
    
    profiles = simpleProfiles?.map(p => {
      const authUser = authUsers.find(au => au.id === p.user_id)
      const email = authUser?.email || `${p.username}@example.com`
      
      if (authUser?.email) {
        realEmailCount++
      } else {
        fallbackEmailCount++
        console.log(`用户 ${p.username} (${p.user_id}) 无法获取真实邮箱，使用备用格式`)
      }
      
      return {
        ...p,
        email: email
      }
    }) || []
    
    console.log(`邮箱获取统计: 真实邮箱 ${realEmailCount}个, 备用格式 ${fallbackEmailCount}个`)

    // 获取所有用户的每日进度
    const { data: dailyProgress, error: progressError } = await supabase
      .from("user_daily_progress")
      .select("*")
      .order("session_date", { ascending: false })

    if (progressError) {
      console.error("Error fetching daily progress:", progressError)
    }

    // 获取所有emoji调查数据
    const { data: emojiSurveys, error: surveysError } = await supabase
      .from("emoji_surveys")
      .select("*")
      .order("created_at", { ascending: false })

    if (surveysError) {
      console.error("Error fetching emoji surveys:", surveysError)
    }

    // 获取所有聊天记录
    const { data: chats, error: chatsError } = await supabase
      .from("chats")
      .select("id, name, created_at, updated_at, user_id")
      .order("created_at", { ascending: false })

    if (chatsError) {
      console.error("Error fetching chats:", chatsError)
    }

    // 获取消息统计数据 - 使用更高效的方法
    console.log("开始获取消息统计数据...")
    
    // 为每个用户单独获取消息统计，避免全局limit限制
    const messageStats = new Map()
    const messageSamples = new Map()
    
    for (const profile of profiles || []) {
      // 获取该用户的消息统计
      const { data: userMessages, error: userMsgError } = await supabase
        .from("messages")
        .select("id, role, created_at, chat_id, content")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(100) // 每个用户最多100条用于展示
      
      if (userMsgError) {
        console.error(`获取用户 ${profile.user_id} 消息失败:`, userMsgError)
        continue
      }
      
      const userSentMessages = userMessages?.filter(m => m.role === 'user') || []
      messageStats.set(profile.user_id, userSentMessages.length)
      messageSamples.set(profile.user_id, userSentMessages.slice(0, 50))
      
      // 调试特定用户
      if (profile.user_id === '9713bd6c-203a-4578-8712-93e5eedf128d') {
        console.log(`调试 - 用户 ${profile.username}:`)
        console.log(`  - 该用户所有消息数: ${userMessages?.length || 0}`)
        console.log(`  - 该用户发送消息数: ${userSentMessages.length}`)
      }
    }
    
    console.log(`消息统计完成，处理了 ${messageStats.size} 个用户`)
    
    // 为了兼容现有代码，创建一个空的messages数组
    const messages = []
    const messagesError = null

    // 组织用户数据
    const usersData =
      profiles?.map(profile => {
        // 获取该用户的每日进度
        const userProgress =
          dailyProgress?.filter(
            progress => progress.user_id === profile.user_id
          ) || []

        // 获取该用户的emoji调查
        const userSurveys =
          emojiSurveys?.filter(survey => survey.user_id === profile.user_id) ||
          []

        // 获取该用户的聊天记录
        const userChats =
          chats?.filter(chat => chat.user_id === profile.user_id) || []

        // 使用预先计算的消息统计
        const totalUserMessages = messageStats.get(profile.user_id) || 0
        const userSentMessages = messageSamples.get(profile.user_id) || []

        // 计算统计数据
        const totalRequiredSurveys = userProgress.reduce(
          (sum, progress) => sum + progress.required_surveys_completed,
          0
        )
        const totalExtraSurveys = userProgress.reduce(
          (sum, progress) => sum + progress.extra_surveys_completed,
          0
        )
        // 使用预先计算的用户发送消息数量
        const totalMessages = totalUserMessages
        const totalChats = userChats.length

        // 计算活跃天数
        const uniqueDates = new Set(
          userProgress.map(progress => progress.session_date)
        )
        const activeDays = uniqueDates.size

        return {
          user_id: profile.user_id,
          email: profile.email,
          display_name: profile.display_name,
          username: profile.username,
          created_at: profile.created_at,
          has_onboarded: profile.has_onboarded,
          statistics: {
            total_required_surveys: totalRequiredSurveys,
            total_extra_surveys: totalExtraSurveys,
            total_messages: totalMessages,
            total_chats: totalChats,
            active_days: activeDays
          },
          daily_progress: userProgress,
          emoji_surveys: userSurveys,
          chats: userChats,
          messages: userSentMessages // 返回用户发送的消息样本
        }
      }) || []

    return NextResponse.json({
      success: true,
      users: usersData,
      summary: {
        total_users: profiles?.length || 0,
        total_surveys: emojiSurveys?.length || 0,
        total_messages: messages?.length || 0,
        total_chats: chats?.length || 0
      }
    })
  } catch (error) {
    console.error("Admin users API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// 创建新用户
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const admin = await verifyAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "邮箱和密码不能为空" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码至少需要6位字符" },
        { status: 400 }
      )
    }

    // 使用service role key来创建用户
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 使用管理员API创建用户
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // 自动确认邮箱
    })

    if (createError) {
      console.error("Create user error:", createError)
      return NextResponse.json(
        { error: createError.message || "创建用户失败" },
        { status: 400 }
      )
    }

    if (!userData.user) {
      return NextResponse.json(
        { error: "创建用户失败" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "用户创建成功",
      user: {
        id: userData.user.id,
        email: userData.user.email
      }
    })
  } catch (error) {
    console.error("Create user API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
