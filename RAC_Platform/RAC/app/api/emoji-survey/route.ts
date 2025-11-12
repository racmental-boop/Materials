import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { userId, emotionScore, questionText, surveyType, surveyOrder } = await request.json()

    // 验证必需字段
    const finalUserId = userId
    const finalEmotionScore = emotionScore || 3
    const finalSurveyType = surveyType || 'daily_required'
    const finalQuestionText = questionText || "daily emotion check"
    const finalSurveyOrder = surveyOrder || 1

    if (!finalUserId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      )
    }

    try {
      const cookieStore = cookies()
      const supabase = createClient(cookieStore)

      // 获取今天的日期
      const today = new Date().toISOString().split("T")[0]

      // 插入emoji survey
      const { data: surveyData, error: surveyError } = await supabase
        .from("emoji_surveys")
        .insert({
          user_id: finalUserId,
          session_date: today,
          survey_type: finalSurveyType,
          emotion_score: finalEmotionScore,
          question_text: finalQuestionText,
          survey_order: finalSurveyOrder
        })
        .select()
        .single()

      if (surveyError) {
        console.error("Error inserting emoji survey:", surveyError)
        return NextResponse.json(
          { error: "Failed to save emoji survey" },
          { status: 500 }
        )
      }

      // 获取更新后的进度 - 即使失败也不影响主要功能
      let progressData = null
      try {
        const { data, error: progressError } = await supabase
          .from("user_daily_progress")
          .select("*")
          .eq("user_id", finalUserId)
          .eq("session_date", today)
          .single()

        if (progressError && progressError.code !== "PGRST116") {
          console.warn("Error fetching progress:", progressError.message)
        } else {
          progressData = data
        }
      } catch (progressErr) {
        console.warn("Progress fetch error:", progressErr)
      }

      return NextResponse.json({
        success: true,
        survey: surveyData,
        progress: progressData || {
          required_surveys_completed: 0,
          extra_surveys_completed: 0,
          session_date: today
        }
      })
    } catch (dbError) {
      console.error("Database error in emoji survey POST:", dbError)
      return NextResponse.json(
        { error: "Database connection error" },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error("Error in emoji survey POST:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0]

    const defaultProgress = {
      required_surveys_completed: 0,
      extra_surveys_completed: 0,
      session_date: date
    }

    if (!userId) {
      return NextResponse.json({ 
        error: "Missing userId parameter",
        progress: defaultProgress 
      }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // 先测试基本的数据库连接
    console.log(`Testing database connection for user ${userId}`)
    
    try {
      // 测试是否能访问profiles表
      const { data: profileTest, error: profileTestError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", userId)
        .single()
      
      console.log("Profile test result:", { data: profileTest, error: profileTestError })
    } catch (profileError) {
      console.error("Profile table access error:", profileError)
    }

    // 获取用户今天的进度
    console.log(`Querying user_daily_progress for user ${userId} on ${date}`)
    const { data: progressData, error: progressError } = await supabase
      .from("user_daily_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("session_date", date)
      .single()

    console.log("Progress query result:", { 
      data: progressData, 
      error: progressError,
      error_code: progressError?.code,
      error_message: progressError?.message 
    })

    // PGRST116 表示没有找到记录，这是正常的
    if (progressError) {
      if (progressError.code === "PGRST116") {
        // 没有找到记录，返回默认值
        console.log(`No progress found for user ${userId} on ${date}`)
        return NextResponse.json({ progress: defaultProgress })
      } else {
        // 其他数据库错误
        console.error("Database error fetching progress:", progressError)
        return NextResponse.json({ 
          error: "Database error", 
          error_details: {
            code: progressError.code,
            message: progressError.message,
            details: progressError.details
          },
          progress: defaultProgress 
        }, { status: 500 })
      }
    }

    // 找到了进度数据
    console.log(`Found progress for user ${userId} on ${date}:`, progressData)
    return NextResponse.json({ progress: progressData })

  } catch (error) {
    console.error("Error in emoji survey GET:", error)
    return NextResponse.json({
      error: "Internal server error",
      progress: {
        required_surveys_completed: 0,
        extra_surveys_completed: 0,
        session_date: new Date().toISOString().split("T")[0]
      }
    }, { status: 500 })
  }
}