import { useCallback, useContext, useEffect, useRef, useState } from "react"
import { ChatbotUIContext } from "@/context/context"
import { WelcomeDialog } from "./welcome-dialog"
import { ActivityTracker } from "./activity-tracker"
import { ChatReminder } from "./chat-reminder"
// import { TimerDebugPanel } from "./timer-debug-panel"

const SURVEY_INTERVAL_MS = 6 * 60 * 1000
const IDLE_THRESHOLD_MS = 100 * 1000
const SHORT_MESSAGE_LIMIT = 15
const SHORT_MESSAGE_REQUIRED = 3

type ReminderType = "short_messages" | "focus"

interface ChatTimerProps {
  onSurveyNeeded: (surveyOrder: number) => void
}

interface EmojiSurveyProgress {
  required_surveys_completed: number
}

export function ChatTimer({ onSurveyNeeded }: ChatTimerProps) {
  const { chatMessages, profile } = useContext(ChatbotUIContext)

  const [showSurvey, setShowSurvey] = useState(false)
  const [surveyOrder, setSurveyOrder] = useState(1)
  const [isTimedSurvey, setIsTimedSurvey] = useState(false)

  const [showReminder, setShowReminder] = useState(false)
  const [reminderType, setReminderType] = useState<ReminderType | null>(null)

  const [isLocked, setIsLocked] = useState(false)
  const [progressLoaded, setProgressLoaded] = useState(false)
  const [progress, setProgress] = useState<EmojiSurveyProgress | null>(null)
  // const [focusTimerActive, setFocusTimerActive] = useState(false)
  // const [focusTimerStart, setFocusTimerStart] = useState<number | null>(null)

  const lastProcessedMessageId = useRef<string | null>(null)
  const lastUserMessageTimeRef = useRef<number | null>(null)
  const consecutiveShortCountRef = useRef<number>(0)
  const emojiTimerRef = useRef<number | null>(null)
  const lastSurveyRef = useRef<number | null>(null)
  const surveyCounterRef = useRef<number>(1)
  const hasCompletedDailyRef = useRef<boolean>(false)
  const initialSurveyHandledRef = useRef<boolean>(false)
  const focusTimerRef = useRef<number | null>(null) // Added: focus reminder timer

  const openSurvey = useCallback(
    (timed: boolean) => {
      const order = surveyCounterRef.current
      setSurveyOrder(order)
      setIsTimedSurvey(timed)
      setShowSurvey(true)
      setIsLocked(true)
      onSurveyNeeded(order)
    },
    [onSurveyNeeded]
  )

  const closeSurvey = useCallback(
    (completed: boolean) => {
      setShowSurvey(false)
      setIsLocked(false)
      const now = Date.now()
      // Update the timing baseline only when the user finishes the survey
      if (completed) {
        lastSurveyRef.current = now
        emojiTimerRef.current = now
        lastUserMessageTimeRef.current = now
        console.log(`Survey completed, resetting timer baseline to: ${new Date(now).toLocaleTimeString()}`)
      }
      if (!hasCompletedDailyRef.current && completed) {
        hasCompletedDailyRef.current = true
      }
      surveyCounterRef.current += 1
    },
    []
  )

  // Start the focus timer
  const startFocusTimer = useCallback(() => {
    // Clear any active focus timer
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current)
    }
    
    const now = Date.now()
    // setFocusTimerActive(true)
    // setFocusTimerStart(now)
    
    // Set up a new focus timer
    focusTimerRef.current = window.setTimeout(() => {
      console.log("No user input within 90 seconds, triggering focus reminder")
      // setFocusTimerActive(false)
      // setFocusTimerStart(null)
      triggerReminder("focus")
    }, IDLE_THRESHOLD_MS)
    
    console.log("Starting focus timer; user will be reminded after 90 seconds of inactivity")
  }, [])

  const triggerReminder = useCallback((type: ReminderType) => {
    // Clear the focus timer
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current)
      focusTimerRef.current = null
    }
    // setFocusTimerActive(false)
    // setFocusTimerStart(null)
    
    setReminderType(type)
    setShowReminder(true)
    setIsLocked(true)
    
    // Reset every timer, including the survey timer
    const now = Date.now()
    emojiTimerRef.current = now
    lastUserMessageTimeRef.current = now
    lastSurveyRef.current = now // Reset the survey timer; restart the six-minute countdown
    consecutiveShortCountRef.current = 0
    
    console.log(`Triggered ${type} reminder, resetting survey timer so the next survey appears in six minutes`)
  }, [])

  const closeReminder = useCallback(() => {
    setShowReminder(false)
    setReminderType(null)
    setIsLocked(false)
    
    const now = Date.now()
    emojiTimerRef.current = now
    
    // After dismissing the reminder, restart the focus timer
    console.log("Reminder closed; restarting focus timer")
    startFocusTimer()
  }, [startFocusTimer])

  useEffect(() => {
    if (!progressLoaded || initialSurveyHandledRef.current) return

    const now = Date.now()

    if (progress && progress.required_surveys_completed > 0) {
      hasCompletedDailyRef.current = true
      surveyCounterRef.current = progress.required_surveys_completed + 1
      emojiTimerRef.current = now
      lastSurveyRef.current = now
      initialSurveyHandledRef.current = true
      setIsLocked(false)
      return
    }

    hasCompletedDailyRef.current = false
    surveyCounterRef.current = 1
    emojiTimerRef.current = null
    lastSurveyRef.current = null
    openSurvey(false)
    initialSurveyHandledRef.current = true
  }, [openSurvey, progress, progressLoaded])

  useEffect(() => {
    if (!profile?.user_id) return

    let cancelled = false

    const loadProgress = async () => {
      try {
        const response = await fetch(`/api/emoji-survey?userId=${profile.user_id}`)
        const data = await response.json()
        if (cancelled) return

        if (data?.progress) {
          setProgress({ required_surveys_completed: data.progress.required_surveys_completed ?? 0 })
        } else {
          setProgress({ required_surveys_completed: 0 })
        }
      } catch (error) {
        console.error("Failed to load emoji survey progress", error)
        if (!cancelled) {
          setProgress({ required_surveys_completed: 0 })
        }
      } finally {
        if (!cancelled) {
          setProgressLoaded(true)
        }
      }
    }

    loadProgress()

    return () => {
      cancelled = true
      // Clean up the focus timer
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current)
        focusTimerRef.current = null
      }
    }
  }, [profile?.user_id])

  useEffect(() => {
    if (!Array.isArray(chatMessages) || chatMessages.length === 0) return

    const userMessages = chatMessages.filter(message => message.message.role === "user")
    if (userMessages.length === 0) return

    const latest = userMessages[userMessages.length - 1]
    if (!latest?.message?.id) return

    if (lastProcessedMessageId.current === latest.message.id) return
    lastProcessedMessageId.current = latest.message.id

    if (isLocked) return

    const createdAt = new Date(latest.message.created_at).getTime()
    const trimmedContent = latest.message.content.trim()

    // Update the user message timestamp and restart the focus timer
    lastUserMessageTimeRef.current = createdAt
    
    // If the survey timer is already running, restart the focus timer
    if (emojiTimerRef.current) {
      console.log("User sent a message; restarting focus timer")
      startFocusTimer()
    }

    if (trimmedContent.length > 0 && trimmedContent.length <= SHORT_MESSAGE_LIMIT) {
      consecutiveShortCountRef.current += 1
      console.log(`Short message detected: "${trimmedContent}" (${trimmedContent.length} chars), count ${consecutiveShortCountRef.current}/${SHORT_MESSAGE_REQUIRED}`)
    } else {
      if (consecutiveShortCountRef.current > 0) {
        console.log(`Long message reset: "${trimmedContent.substring(0, 30)}..." (${trimmedContent.length} chars)`)
      }
      consecutiveShortCountRef.current = 0
    }

    if (consecutiveShortCountRef.current >= SHORT_MESSAGE_REQUIRED) {
      console.log(`Triggered short_messages reminder after ${consecutiveShortCountRef.current} consecutive short messages`)
      triggerReminder("short_messages")
      return
    }

    if (!emojiTimerRef.current) {
      emojiTimerRef.current = createdAt
      console.log("Starting emoji survey timer and focus timer")
      startFocusTimer()
    }

    const referenceTime = lastSurveyRef.current ?? emojiTimerRef.current
    if (
      referenceTime &&
      createdAt - referenceTime >= SURVEY_INTERVAL_MS &&
      !showSurvey &&
      !showReminder
    ) {
      // Update: when the survey launches, only update emojiTimerRef
      // lastSurveyRef is updated only when the user finishes the survey
      emojiTimerRef.current = createdAt
      console.log(`Survey triggered; baseline time: ${new Date(referenceTime).toLocaleTimeString()}, current time: ${new Date(createdAt).toLocaleTimeString()}`)
      openSurvey(true)
      return
    }
  }, [chatMessages, isLocked, openSurvey, showReminder, showSurvey, triggerReminder])

  return (
    <>
      <ActivityTracker onActivity={() => undefined} />

      {/* Debug panel - live timer status */}
      {/* <TimerDebugPanel
        emojiTimerStart={emojiTimerRef.current}
        lastSurveyTime={lastSurveyRef.current}
        focusTimerActive={focusTimerActive}
        focusTimerStart={focusTimerStart}
        consecutiveShortCount={consecutiveShortCountRef.current}
        isLocked={isLocked}
        showSurvey={showSurvey}
        showReminder={showReminder}
        reminderType={reminderType}
      /> */}

      {showSurvey && (
        <WelcomeDialog
          surveyOrder={surveyOrder}
          isTimedSurvey={isTimedSurvey}
          onComplete={() => closeSurvey(true)}
        />
      )}

      {/* Debug panel - live timer status */}
      {/* <TimerDebugPanel
        emojiTimerStart={emojiTimerRef.current}
        lastSurveyTime={lastSurveyRef.current}
        focusTimerActive={focusTimerActive}
        focusTimerStart={focusTimerStart}
        consecutiveShortCount={consecutiveShortCountRef.current}
        isLocked={isLocked}
        showSurvey={showSurvey}
        showReminder={showReminder}
        reminderType={reminderType}
      /> */}

      {showReminder && reminderType && (
        <ChatReminder show type={reminderType} onClose={closeReminder} />
      )}

      {isLocked && (
        <div className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm" aria-hidden />
      )}
    </>
  )
}
