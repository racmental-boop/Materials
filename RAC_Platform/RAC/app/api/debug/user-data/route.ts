import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email") || "test1@example.com"

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // 查找用户ID
    const { data: authData } = await supabase.auth.admin.listUsers()
    const user = authData.users.find(u => u.email === email)
    
    if (!user) {
      return NextResponse.json({ error: "User not found", email })
    }

    const userId = user.id

    // 获取profile信息
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single()

    // 获取emoji surveys
    const { data: emojiSurveys } = await supabase
      .from("emoji_surveys")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    // 获取user daily progress
    const { data: dailyProgress } = await supabase
      .from("user_daily_progress")
      .select("*")
      .eq("user_id", userId)
      .order("session_date", { ascending: false })

    // 计算今天的数据
    const today = new Date().toISOString().split("T")[0]
    const todayProgress = dailyProgress?.find(p => p.session_date === today)
    const todaySurveys = emojiSurveys?.filter(s => s.survey_date === today)

    return NextResponse.json({
      user: {
        id: userId,
        email,
        profile
      },
      today: {
        date: today,
        progress: todayProgress,
        surveys: todaySurveys,
        survey_count: todaySurveys?.length || 0
      },
      all_data: {
        emoji_surveys: emojiSurveys,
        daily_progress: dailyProgress
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
