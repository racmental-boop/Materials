import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || "your-admin-secret-key"
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export async function POST(request: NextRequest) {
  try {
    const { email, password, action } = await request.json()

    // 使用service role key来绕过RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (action === "login") {
      // 验证管理员登录
      const { data: admin, error } = await supabase
        .from("admins")
        .select("*")
        .eq("email", email)
        .eq("is_active", true)
        .single()

      if (error || !admin) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        )
      }

      // 验证密码
      const isValidPassword = await bcrypt.compare(
        password,
        admin.password_hash
      )
      if (!isValidPassword) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        )
      }

      // 创建JWT token
      const token = jwt.sign(
        {
          adminId: admin.id,
          email: admin.email,
          name: admin.name
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      )

      // 创建会话记录
      const expiresAt = new Date(Date.now() + SESSION_DURATION)
      const { error: sessionError } = await supabase
        .from("admin_sessions")
        .insert({
          admin_id: admin.id,
          session_token: token,
          expires_at: expiresAt.toISOString()
        })

      if (sessionError) {
        console.error("Error creating admin session:", sessionError)
      }

      // 设置HTTP-only cookie
      const response = NextResponse.json({
        success: true,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name
        }
      })

      response.cookies.set("admin_token", token, {
        httpOnly: true,
        secure: false, // 暂时禁用secure以支持HTTP访问
        sameSite: "lax",
        maxAge: SESSION_DURATION / 1000,
        path: "/"
      })

      return response
    } else if (action === "logout") {
      // 管理员登出
      const token = request.cookies.get("admin_token")?.value

      if (token) {
        // 删除会话记录
        await supabase
          .from("admin_sessions")
          .delete()
          .eq("session_token", token)
      }

      const response = NextResponse.json({ success: true })
      response.cookies.delete("admin_token")
      return response
    } else if (action === "verify") {
      // 验证会话
      const token = request.cookies.get("admin_token")?.value

      if (!token) {
        return NextResponse.json({ error: "No session found" }, { status: 401 })
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any

        // 检查会话是否存在且未过期
        const { data: session, error } = await supabase
          .from("admin_sessions")
          .select("*")
          .eq("session_token", token)
          .eq("admin_id", decoded.adminId)
          .gt("expires_at", new Date().toISOString())
          .single()

        if (error || !session) {
          return NextResponse.json(
            { error: "Session expired" },
            { status: 401 }
          )
        }

        return NextResponse.json({
          success: true,
          admin: {
            id: decoded.adminId,
            email: decoded.email,
            name: decoded.name
          }
        })
      } catch (jwtError) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 })
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Admin auth error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// 初始化默认管理员密码的API（仅在开发环境使用）
export async function PUT(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Not available in production" },
        { status: 403 }
      )
    }

    const { email, password } = await request.json()

    // 使用service role key来绕过RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 加密密码
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // 更新管理员密码
    const { error } = await supabase
      .from("admins")
      .update({ password_hash: hashedPassword })
      .eq("email", email)

    if (error) {
      return NextResponse.json(
        { error: "Failed to update password" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin password setup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
