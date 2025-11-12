import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || "your-admin-secret-key"

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

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const admin = await verifyAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "新密码至少需要6位字符" },
        { status: 400 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (currentPassword) {
      const { data: user } = await supabaseAdmin.auth.admin.getUserById(
        params.userId
      )

      if (!user?.user?.email) {
        return NextResponse.json(
          { error: "用户不存在或没有邮箱" },
          { status: 404 }
        )
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

      const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: user.user.email,
        password: currentPassword
      })

      if (signInError) {
        return NextResponse.json(
          { error: "原密码验证失败" },
          { status: 400 }
        )
      }
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      params.userId,
      {
        password: newPassword
      }
    )

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "修改密码失败" },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin reset password error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}



