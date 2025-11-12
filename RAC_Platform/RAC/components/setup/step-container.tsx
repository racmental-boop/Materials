import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { FC, useRef } from "react"

export const SETUP_STEP_COUNT = 2

interface StepContainerProps {
  stepDescription: string
  stepNum: number
  stepTitle: string
  onShouldProceed: (shouldProceed: boolean) => void
  children?: React.ReactNode
  showBackButton?: boolean
  showNextButton?: boolean
}

export const StepContainer: FC<StepContainerProps> = ({
  stepDescription,
  stepNum,
  stepTitle,
  onShouldProceed,
  children,
  showBackButton = false,
  showNextButton = true
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (buttonRef.current) {
        buttonRef.current.click()
      }
    }
  }

  return (
    <Card
      className="mx-4 w-full max-w-2xl overflow-auto sm:mx-0 sm:w-[600px]"
      onKeyDown={handleKeyDown}
    >
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="text-lg sm:text-xl">{stepTitle}</div>

          <div className="text-xs text-muted-foreground sm:text-sm">
            {stepNum} / {SETUP_STEP_COUNT}
          </div>
        </CardTitle>

        <CardDescription className="text-sm sm:text-base">{stepDescription}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-6">{children}</CardContent>

      <CardFooter className="flex justify-between p-4 sm:p-6">
        <div>
          {showBackButton && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onShouldProceed(false)}
              className="text-xs sm:text-sm"
            >
              Back
            </Button>
          )}
        </div>

        <div>
          {showNextButton && (
            <Button
              ref={buttonRef}
              size="sm"
              onClick={() => onShouldProceed(true)}
              className="text-xs sm:text-sm"
            >
              Next
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
