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

    // 获取今天的日期
    const today = new Date().toISOString().split("T")[0]

    // 获取所有用户的基本信息和今日调查统计
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select(
        `
        user_id,
        username,
        display_name,
        created_at
      `
      )
      .order("created_at", { ascending: false })

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
      return NextResponse.json(
        { error: "Failed to fetch user profiles" },
        { status: 500 }
      )
    }

    // 获取用户邮箱（从auth.users表）
    const userIds = profiles?.map(p => p.user_id) || []
    const { data: authUsers, error: authError } = await supabase
      .from("auth.users")
      .select("id, email")
      .in("id", userIds)

    if (authError) {
      console.error("Error fetching auth users:", authError)
    }

    // 创建邮箱映射
    const emailMap = new Map()
    authUsers?.forEach(user => {
      emailMap.set(user.id, user.email)
    })

    // 获取今日调查统计
    const { data: todaySurveys, error: todaySurveysError } = await supabase
      .from("emoji_surveys")
      .select("user_id")
      .eq("session_date", today)

    if (todaySurveysError) {
      console.error("Error fetching today surveys:", todaySurveysError)
    }

    // 统计每个用户今日调查次数
    const todayCountMap = new Map()
    todaySurveys?.forEach(survey => {
      const count = todayCountMap.get(survey.user_id) || 0
      todayCountMap.set(survey.user_id, count + 1)
    })

    // 获取总调查统计
    const { data: totalSurveys, error: totalSurveysError } = await supabase
      .from("emoji_surveys")
      .select("user_id")

    if (totalSurveysError) {
      console.error("Error fetching total surveys:", totalSurveysError)
    }

    // 统计每个用户总调查次数
    const totalCountMap = new Map()
    totalSurveys?.forEach(survey => {
      const count = totalCountMap.get(survey.user_id) || 0
      totalCountMap.set(survey.user_id, count + 1)
    })

    // 获取用户活跃天数统计
    const { data: activeDays, error: activeDaysError } = await supabase
      .from("user_daily_progress")
      .select("user_id, session_date")

    if (activeDaysError) {
      console.error("Error fetching active days:", activeDaysError)
    }

    // 统计每个用户活跃天数
    const activeDaysMap = new Map()
    activeDays?.forEach(day => {
      const days = activeDaysMap.get(day.user_id) || new Set()
      days.add(day.session_date)
      activeDaysMap.set(day.user_id, days)
    })

    // 获取最后活动时间
    const { data: lastActivity, error: lastActivityError } = await supabase
      .from("emoji_surveys")
      .select("user_id, created_at")
      .order("created_at", { ascending: false })

    if (lastActivityError) {
      console.error("Error fetching last activity:", lastActivityError)
    }

    // 获取每个用户最后活动时间
    const lastActivityMap = new Map()
    lastActivity?.forEach(activity => {
      if (!lastActivityMap.has(activity.user_id)) {
        lastActivityMap.set(activity.user_id, activity.created_at)
      }
    })

    // 组装用户跟踪数据
    const trackingData =
      profiles?.map(profile => {
        const activeDaysSet = activeDaysMap.get(profile.user_id) || new Set()
        return {
          user_id: profile.user_id,
          email:
            emailMap.get(profile.user_id) || `${profile.username}@example.com`,
          display_name: profile.display_name,
          username: profile.username,
          created_at: profile.created_at,
          today_surveys: todayCountMap.get(profile.user_id) || 0,
          total_surveys: totalCountMap.get(profile.user_id) || 0,
          active_days: activeDaysSet.size,
          last_activity: lastActivityMap.get(profile.user_id) || null
        }
      }) || []

    return NextResponse.json({
      success: true,
      users: trackingData
    })
  } catch (error) {
    console.error("Admin track API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
