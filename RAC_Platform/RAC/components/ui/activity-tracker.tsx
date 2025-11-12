import { useEffect } from "react"

interface ActivityTrackerProps {
  onActivity: () => void
}

export function ActivityTracker({ onActivity }: ActivityTrackerProps) {
  useEffect(() => {
    // Monitor keyboard input
    const handleKeyPress = () => {
      onActivity()
    }

    // Monitor mouse clicks
    const handleClick = () => {
      onActivity()
    }

    // Monitor mouse movement with throttling
    let mouseMoveTimeout: NodeJS.Timeout | null = null
    const handleMouseMove = () => {
      if (mouseMoveTimeout) return
      mouseMoveTimeout = setTimeout(() => {
        onActivity()
        mouseMoveTimeout = null
      }, 1000) // Trigger at most once per second
    }

    // Monitor typing inside any chat input
    const handleInputChange = () => {
      onActivity()
    }

    // Attach event listeners
    document.addEventListener("keypress", handleKeyPress)
    document.addEventListener("keydown", handleKeyPress)
    document.addEventListener("click", handleClick)
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("input", handleInputChange)

    // Explicitly watch chat input elements
    const chatInputs = document.querySelectorAll('textarea, input[type="text"]')
    chatInputs.forEach(input => {
      input.addEventListener("input", handleInputChange)
      input.addEventListener("focus", handleInputChange)
    })

    return () => {
      document.removeEventListener("keypress", handleKeyPress)
      document.removeEventListener("keydown", handleKeyPress)
      document.removeEventListener("click", handleClick)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("input", handleInputChange)

      chatInputs.forEach(input => {
        input.removeEventListener("input", handleInputChange)
        input.removeEventListener("focus", handleInputChange)
      })

      if (mouseMoveTimeout) {
        clearTimeout(mouseMoveTimeout)
      }
    }
  }, [onActivity])

  return null // This component does not render anything
}
