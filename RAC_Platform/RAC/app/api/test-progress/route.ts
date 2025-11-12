import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email") || "test1@example.com"
    
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // 1. 查找用户ID - 多种方式
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
    console.log(`Auth data result: ${authData?.users?.length} users found, error:`, authError)
    
    let user = authData?.users?.find(u => u.email === email)
    let userId = user?.id
    
    // 如果通过auth找不到，尝试从profiles表查找
    if (!user) {
      console.log(`User not found in auth, trying profiles table for email: ${email}`)
      
      // 查找所有profiles，看看有没有这个email或类似的username
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        
      console.log(`Found ${profiles?.length} profiles:`, profiles?.map(p => ({ id: p.user_id, username: p.username, email: p.display_name })))
      
      // 尝试通过username匹配（可能email存储在username中）
      const profileMatch = profiles?.find(p => 
        p.username === email || 
        p.display_name === email ||
        p.username === email.split('@')[0]
      )
      
      if (profileMatch) {
        userId = profileMatch.user_id
        console.log(`Found user through profiles: ${userId}`)
      }
    }

    if (!userId) {
      return NextResponse.json({ 
        error: "User not found in auth or profiles", 
        email,
        debug: {
          auth_users_count: authData?.users?.length || 0,
          auth_error: authError
        }
      })
    }

    const today = new Date().toISOString().split("T")[0]

    // 2. 检查profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single()

    // 3. 查询emoji_surveys
    const { data: emojiSurveys, error: surveyError } = await supabase
      .from("emoji_surveys")
      .select("*")
      .eq("user_id", userId)
      .eq("survey_date", today)

    // 4. 查询user_daily_progress
    const { data: progressData, error: progressError } = await supabase
      .from("user_daily_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("session_date", today)
      .single()

    // 5. 测试用户端API调用
    const apiUrl = `${request.nextUrl.origin}/api/emoji-survey?userId=${userId}`
    let apiResponse = null
    let apiError = null
    
    try {
      const response = await fetch(apiUrl)
      apiResponse = await response.json()
    } catch (error) {
      apiError = error
    }

    return NextResponse.json({
      user: {
        id: userId,
        email,
        profile_found: !!profile
      },
      today,
      raw_data: {
        emoji_surveys: {
          data: emojiSurveys,
          error: surveyError,
          count: emojiSurveys?.length || 0
        },
        user_daily_progress: {
          data: progressData,
          error: progressError,
          exists: !!progressData
        }
      },
      user_api_test: {
        url: apiUrl,
        response: apiResponse,
        error: apiError
      },
      analysis: {
        has_surveys_today: (emojiSurveys?.length || 0) > 0,
        has_progress_today: !!progressData,
        progress_completed: progressData?.required_surveys_completed || 0,
        should_show_survey: !progressData || progressData.required_surveys_completed === 0
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
