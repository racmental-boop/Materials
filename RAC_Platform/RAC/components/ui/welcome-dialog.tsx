import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useContext } from "react"
import { ChatbotUIContext } from "@/context/context"
import { supabase } from "@/lib/supabase/browser-client"

interface WelcomeDialogProps {
  surveyOrder?: number
  isTimedSurvey?: boolean
  onComplete?: () => void
}

export function WelcomeDialog({
  surveyOrder = 1,
  isTimedSurvey = false,
  onComplete
}: WelcomeDialogProps = {}) {
  const [open, setOpen] = useState(false)
  const [selectedEmotion, setSelectedEmotion] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { profile } = useContext(ChatbotUIContext)

  useEffect(() => {
    // If the survey is controlled via props (timed survey), show it immediately
    if (isTimedSurvey || surveyOrder > 1) {
      setOpen(true)
      return
    }

    // Otherwise check the status of the first daily survey
    const checkSurveyStatus = async () => {
      if (!profile?.user_id) return

      try {
        const response = await fetch(
          `/api/emoji-survey?userId=${profile.user_id}`
        )
        const data = await response.json()

        // If there is no progress data or zero completions, show the survey
        if (!data.progress || data.progress.required_surveys_completed === 0) {
          setOpen(true)
        }
      } catch (error) {
        console.error("Error checking survey status:", error)
        setOpen(true)
      }
    }

    checkSurveyStatus()
  }, [profile, isTimedSurvey, surveyOrder])

  const handleEmotionSelect = (value: number) => {
    setSelectedEmotion(value)
  }

  const handleConfirm = async () => {
    if (selectedEmotion !== null && profile?.user_id) {
      setIsSubmitting(true)

      try {
        const response = await fetch("/api/emoji-survey", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userId: profile.user_id,
            emotionScore: selectedEmotion,
            questionText: "good about myself",
            surveyType: surveyOrder <= 3 ? "daily_required" : "extra_voluntary",
            surveyOrder: Math.min(surveyOrder, 3) // Database constraint: maximum of 3
          })
        })

        const data = await response.json()

        if (data.success) {
          console.log("Survey submitted successfully:", data)
          setOpen(false)

          // Trigger a progress update event
          window.dispatchEvent(
            new CustomEvent("surveyCompleted", {
              detail: {
                progress: data.progress || null,
                surveyOrder: surveyOrder
              }
            })
          )

          // Invoke the completion callback
          if (onComplete) {
            onComplete()
          }
        } else {
          console.error("Failed to submit survey:", data.error)
          alert(`Failed to submit survey: ${data.error}`)
        }
      } catch (error) {
        console.error("Error submitting survey:", error)
        alert("Error submitting survey. Please try again.")
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[500px]"
        onPointerDownOutside={e => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            Welcome to Chat!
          </DialogTitle>
          <DialogDescription className="text-center">
            Emo Survey {surveyOrder}/3
          </DialogDescription>
          <p className="text-muted-foreground mt-2 text-center text-sm">
            Before start, you need to record your current state.
          </p>
        </DialogHeader>

        <div className="py-6">
          {/* Question prompt and emoji */}
          <div className="mb-6 text-center">
            <div className="mb-3 text-6xl">😊</div>
            <div className="text-lg font-medium">good about myself</div>
          </div>

          {/* Scale */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Very little</span>
              <span className="text-sm text-gray-600">Very much</span>
            </div>

            <div className="flex items-center justify-between px-4">
              {[1, 2, 3, 4, 5].map(value => (
                <button
                  key={value}
                  onClick={() => handleEmotionSelect(value)}
                  className={`size-8 rounded-full border-2 transition-all${
                    selectedEmotion === value
                      ? "scale-110 border-blue-500 bg-blue-500"
                      : "border-gray-300 hover:scale-105 hover:border-blue-300"
                  }`}
                >
                  {selectedEmotion === value && (
                    <div className="size-full scale-50 rounded-full bg-white"></div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-between px-4 text-xs text-gray-500">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>

          {/* Confirmation button */}
          <div className="mt-8 flex justify-center">
            <Button
              onClick={handleConfirm}
              disabled={selectedEmotion === null || isSubmitting}
              className="px-8 py-2"
            >
              {isSubmitting ? "Submitting..." : "Confirm"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
