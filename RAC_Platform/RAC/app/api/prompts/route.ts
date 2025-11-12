import fs from 'fs'
import { NextResponse } from 'next/server'

// 缓存数据，避免重复读取文件
let cachedPrompts: any[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

// 静态数据预编译
export async function GET() {
  try {
    const now = Date.now()
    
    // 检查缓存是否有效
    if (cachedPrompts && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json(cachedPrompts, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'Content-Type': 'application/json'
        }
      })
    }

    const filePath = '/home/kisna/workspace/prompts_coser/generated_characters.jsonl'
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.warn(`Prompts file not found: ${filePath}`)
      // 返回空数组而不是错误，避免阻塞用户界面
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'Content-Type': 'application/json'
        }
      })
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const prompts = fileContent
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        try {
          return JSON.parse(line)
        } catch (e) {
          console.warn(`Failed to parse line: ${line}`)
          return null
        }
      })
      .filter(Boolean) // 过滤掉null值
    
    // 更新缓存
    cachedPrompts = prompts
    cacheTimestamp = now
    
    return NextResponse.json(prompts, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error('Error loading prompts:', error)
    
    // 如果有缓存数据，返回缓存数据
    if (cachedPrompts) {
      return NextResponse.json(cachedPrompts, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'Content-Type': 'application/json'
        }
      })
    }
    
    // 返回空数组而不是500错误
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'Content-Type': 'application/json'
      }
    })
  }
}

// 预生成静态数据（构建时）
export const dynamic = 'force-static'
export const revalidate = 300 // 5分钟重新验证
