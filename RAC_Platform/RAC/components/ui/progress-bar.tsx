import { useContext, useEffect, useState } from "react"
import { ChatbotUIContext } from "@/context/context"
import { Progress } from "@/components/ui/progress"

interface ProgressData {
  required_surveys_completed: number
  extra_surveys_completed: number
  session_date: string
}

export function EmojiSurveyProgressBar() {
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const { profile } = useContext(ChatbotUIContext)

  const fetchProgress = async () => {
    if (!profile?.user_id) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/emoji-survey?userId=${profile.user_id}`)
      if (!response.ok) return
      const data = await response.json()
      if (data.progress) {
        setProgress(data.progress)
      }
    } catch (error) {
      console.error("Error fetching progress:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProgress()

    // Listen for survey completion events
    const handleSurveyCompleted = (event: any) => {
      if (event.detail && event.detail.progress) {
        setProgress(event.detail.progress)
      } else {
        // If no progress data is provided, fetch it again
        fetchProgress()
      }
    }

    window.addEventListener("surveyCompleted", handleSurveyCompleted)

    return () => {
      window.removeEventListener("surveyCompleted", handleSurveyCompleted)
    }
  }, [profile])

  if (loading || !progress) {
    return (
      <div className="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Loading progress...
        </div>
      </div>
    )
  }

  const requiredTotal = 3
  const requiredCompleted = progress.required_surveys_completed
  const extraCompleted = progress.extra_surveys_completed
  const requiredProgress = (requiredCompleted / requiredTotal) * 100

  const getProgressMessage = () => {
    if (requiredCompleted === 0) {
      return "Complete your first emoji survey to get started!"
    } else if (requiredCompleted < requiredTotal) {
      return `${requiredCompleted}/${requiredTotal} daily surveys completed. Keep going!`
    } else {
      return `🎉 All daily surveys complete! ${extraCompleted} bonus surveys completed.`
    }
  }

  const getProgressColor = () => {
    if (requiredCompleted === requiredTotal) {
      return "bg-green-500"
    } else if (requiredCompleted > 0) {
      return "bg-blue-500"
    } else {
      return "bg-gray-300"
    }
  }

  return (
    <div className="mb-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-4 dark:from-blue-900/20 dark:to-purple-900/20">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">
          Daily Emoji Survey Progress
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {requiredCompleted}/{requiredTotal} Required
          {extraCompleted > 0 && ` + ${extraCompleted} Bonus`}
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-1 flex justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>Progress</span>
          <span>{Math.round(requiredProgress)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${Math.min(requiredProgress, 100)}%` }}
          />
        </div>
      </div>

      {/* Extra progress bar for bonus surveys */}
      {requiredCompleted === requiredTotal && extraCompleted > 0 && (
        <div className="mb-3">
          <div className="mb-1 text-xs text-green-600 dark:text-green-400">
            Bonus Surveys: {extraCompleted}
          </div>
          <div className="h-1 w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-1 rounded-full bg-green-400 transition-all duration-500"
              style={{ width: `${Math.min((extraCompleted / 5) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      <p className="text-sm text-gray-700 dark:text-gray-300">
        {getProgressMessage()}
      </p>

      {requiredCompleted === requiredTotal && (
        <div className="mt-2 text-xs text-green-600 dark:text-green-400">
          ✨ You can continue with voluntary surveys for extra rewards!
        </div>
      )}
    </div>
  )
}
