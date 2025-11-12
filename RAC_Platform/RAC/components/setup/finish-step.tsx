import { FC } from "react"

interface FinishStepProps {
  displayName: string
}

export const FinishStep: FC<FinishStepProps> = ({ displayName }) => {
  return (
    <div className="max-h-[60vh] space-y-4 overflow-y-auto sm:max-h-[500px] sm:space-y-6">
      <div className="text-center">
        <h2 className="mb-2 text-lg font-bold sm:text-2xl">
          Welcome to MentalShield Project
          {displayName.length > 0 ? `, ${displayName.split(" ")[0]}` : null}!
        </h2>
      </div>

      <div className="space-y-3 text-xs sm:space-y-4 sm:text-sm">
        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20 sm:p-4">
          <h3 className="mb-2 text-sm font-semibold sm:text-base">
            Project Information & Consent Statement
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Please read the following information carefully before proceeding.
          </p>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-start space-x-2">
            <span className="mt-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 sm:text-sm">
              1.
            </span>
            <p className="text-xs leading-relaxed sm:text-sm">
              You have completed the pre-survey and been notified via email that
              you are eligible to participate in this project.
            </p>
          </div>

          <div className="flex items-start space-x-2">
            <span className="mt-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 sm:text-sm">
              2.
            </span>
            <p className="text-xs leading-relaxed sm:text-sm">
              This project will be conducted on this website for 7 days. You
              need to interact with your preferred character for at least 10
              minutes each day.
            </p>
          </div>

          <div className="flex items-start space-x-2">
            <span className="mt-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 sm:text-sm">
              3.
            </span>
            <p className="text-xs leading-relaxed sm:text-sm">
              Daily completion is marked by ensuring your daily progress bar
              shows you have completed 3 emoji surveys.
            </p>
          </div>

          <div className="flex items-start space-x-2">
            <span className="mt-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 sm:text-sm">
              4.
            </span>
            <p className="text-xs leading-relaxed sm:text-sm">
              If you complete 6 days of content, you will receive $30. Complete
              7 days plus additional surveys to receive $40.
            </p>
          </div>

          <div className="flex items-start space-x-2">
            <span className="mt-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 sm:text-sm">
              5.
            </span>
            <p className="text-xs leading-relaxed sm:text-sm">
              We will review chat content during the study. Highly repetitive or
              arbitrary content will result in email notification of data
              invalidation and immediate deletion of personal project
              information.
            </p>
          </div>

          <div className="flex items-start space-x-2">
            <span className="mt-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 sm:text-sm">
              6.
            </span>
            <p className="text-xs leading-relaxed sm:text-sm">
              You may withdraw from this project at any time by missing project
              tasks, and you will be automatically excluded.
            </p>
          </div>

          <div className="flex items-start space-x-2">
            <span className="mt-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 sm:text-sm">
              7.
            </span>
            <p className="text-xs leading-relaxed sm:text-sm">
              For any personal questions, please contact:{" "}
              <span className="break-all font-mono text-blue-600 dark:text-blue-400">
                swinmentalshield@gmail.com
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20 sm:p-4">
          <p className="text-xs font-medium leading-relaxed text-yellow-800 dark:text-yellow-200 sm:text-sm">
            By clicking Next, you confirm that you have read and understood the
            above information and provide your informed consent to participate
            in the MentalShield Project.
          </p>
        </div>
      </div>
    </div>
  )
}
