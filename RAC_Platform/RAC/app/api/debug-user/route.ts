import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // 获取当前会话
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !sessionData.session) {
      return NextResponse.json({ 
        error: "No active session",
        session_error: sessionError 
      })
    }

    const user = sessionData.session.user
    const userId = user.id

    // 获取profile信息
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single()

    const today = new Date().toISOString().split("T")[0]

    // 检查今天的emoji surveys
    const { data: emojiSurveys, error: surveyError } = await supabase
      .from("emoji_surveys")
      .select("*")
      .eq("user_id", userId)
      .eq("survey_date", today)

    // 检查今天的progress
    const { data: progressData, error: progressError } = await supabase
      .from("user_daily_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("session_date", today)
      .single()

    return NextResponse.json({
      current_user: {
        id: userId,
        email: user.email,
        created_at: user.created_at
      },
      profile: {
        data: profile,
        error: profileError
      },
      today_data: {
        date: today,
        emoji_surveys: {
          data: emojiSurveys,
          count: emojiSurveys?.length || 0,
          error: surveyError
        },
        progress: {
          data: progressData,
          error: progressError,
          exists: !!progressData,
          required_completed: progressData?.required_surveys_completed || 0
        }
      },
      analysis: {
        should_show_first_survey: !progressData || progressData.required_surveys_completed === 0,
        has_progress_record: !!progressData,
        surveys_vs_progress: {
          survey_count: emojiSurveys?.length || 0,
          progress_count: progressData?.required_surveys_completed || 0
        }
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
