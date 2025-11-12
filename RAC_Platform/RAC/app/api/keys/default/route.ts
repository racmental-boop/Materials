import { NextResponse } from "next/server"

export async function GET() {
  try {
    // 从环境变量获取默认的OpenAI API key
    const defaultApiKey = process.env.DEFAULT_OPENAI_API_KEY || ""

    return NextResponse.json({
      defaultOpenaiApiKey: defaultApiKey
    })
  } catch (error) {
    console.error("Error getting default API key:", error)
    return NextResponse.json(
      { error: "Failed to get default API key" },
      { status: 500 }
    )
  }
}
