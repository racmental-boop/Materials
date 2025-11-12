import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  try {
    // 测试基本的API响应
    const basic = {
      status: "ok",
      timestamp: new Date().toISOString(),
      server: "running"
    }

    // 测试Supabase连接
    let supabaseStatus = "unknown"
    try {
      const cookieStore = cookies()
      const supabase = createClient(cookieStore)
      
      // 简单的查询来测试连接
      const { data, error } = await supabase
        .from("profiles")
        .select("count")
        .limit(1)
      
      if (error) {
        supabaseStatus = `error: ${error.message}`
      } else {
        supabaseStatus = "connected"
      }
    } catch (dbError: any) {
      supabaseStatus = `connection_error: ${dbError.message}`
    }

    return NextResponse.json({
      ...basic,
      supabase: supabaseStatus,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
