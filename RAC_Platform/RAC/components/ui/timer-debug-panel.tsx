import { useState, useEffect } from "react"
import { Card, CardContent } from "./card"
import { Button } from "./button"
import { X, Clock, Timer, MessageSquare } from "lucide-react"

interface TimerDebugPanelProps {
  emojiTimerStart: number | null
  lastSurveyTime: number | null
  focusTimerActive: boolean
  focusTimerStart: number | null
  consecutiveShortCount: number
  isLocked: boolean
  showSurvey: boolean
  showReminder: boolean
  reminderType: string | null
}

export function TimerDebugPanel({
  emojiTimerStart,
  lastSurveyTime,
  focusTimerActive,
  focusTimerStart,
  consecutiveShortCount,
  isLocked,
  showSurvey,
  showReminder,
  reminderType
}: TimerDebugPanelProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentTime, setCurrentTime] = useState(Date.now())

  // Update the current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Calculate remaining time
  const calculateRemainingTime = (startTime: number | null, duration: number) => {
    if (!startTime) return null
    const elapsed = currentTime - startTime
    const remaining = Math.max(0, duration - elapsed)
    return Math.ceil(remaining / 1000) // Convert to seconds
  }

  const surveyRemainingSeconds = calculateRemainingTime(
    lastSurveyTime || emojiTimerStart,
    6 * 60 * 1000 // 6 minutes
  )
  
  const focusRemainingSeconds = focusTimerActive && focusTimerStart 
    ? calculateRemainingTime(focusTimerStart, 90 * 1000) // 90 seconds
    : null

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        className="fixed top-4 left-4 z-50 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1"
        size="sm"
      >
        <Timer className="w-3 h-3 mr-1" />
        Debug
      </Button>
    )
  }

  return (
    <Card className="fixed top-4 left-4 z-50 w-80 bg-white/95 backdrop-blur-sm border shadow-lg">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center">
            <Timer className="w-4 h-4 mr-1" />
            Timer Debug Panel
          </h3>
          <Button
            onClick={() => setIsVisible(false)}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>

        <div className="space-y-2 text-xs">
          {/* Survey timer */}
          <div className="flex items-center justify-between p-2 bg-green-50 rounded">
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1 text-green-600" />
              <span className="font-medium">Survey Timer</span>
            </div>
            <span className={`font-mono ${surveyRemainingSeconds && surveyRemainingSeconds < 60 ? 'text-red-600' : 'text-green-600'}`}>
              {formatTime(surveyRemainingSeconds)}
            </span>
          </div>

          {/* Focus timer */}
          <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
            <div className="flex items-center">
              <MessageSquare className="w-3 h-3 mr-1 text-orange-600" />
              <span className="font-medium">Focus Timer</span>
            </div>
            <span className={`font-mono ${focusRemainingSeconds && focusRemainingSeconds < 30 ? 'text-red-600' : 'text-orange-600'}`}>
              {focusTimerActive ? formatTime(focusRemainingSeconds) : "Not started"}
            </span>
          </div>

          {/* Status indicators */}
          <div className="border-t pt-2 space-y-1">
            <div className="flex justify-between">
              <span>Consecutive short messages:</span>
              <span className={consecutiveShortCount >= 2 ? 'text-red-600 font-medium' : ''}>
                {consecutiveShortCount}/3
              </span>
            </div>
            <div className="flex justify-between">
              <span>System status:</span>
              <span className={`text-xs px-1 rounded ${
                isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}>
                {isLocked ? "Locked" : "Normal"}
              </span>
            </div>
            {showSurvey && (
              <div className="text-blue-600 font-medium">
                📊 Survey is open
              </div>
            )}
            {showReminder && (
              <div className="text-orange-600 font-medium">
                ⚠️ {reminderType === "focus" ? "Focus reminder" : "Short-message reminder"}
              </div>
            )}
          </div>

          {/* Timestamp details */}
          <div className="border-t pt-2 text-xs text-gray-500">
            <div>Current time: {new Date(currentTime).toLocaleTimeString()}</div>
            {emojiTimerStart && (
              <div>Survey started: {new Date(emojiTimerStart).toLocaleTimeString()}</div>
            )}
            {lastSurveyTime && (
              <div>Last survey: {new Date(lastSurveyTime).toLocaleTimeString()}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
