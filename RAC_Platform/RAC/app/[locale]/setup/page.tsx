"use client"

import { ChatbotUIContext } from "@/context/context"
import { getProfileByUserId, updateProfile } from "@/db/profile"
import {
  getHomeWorkspaceByUserId,
  getWorkspacesByUserId
} from "@/db/workspaces"
import {
  fetchHostedModels,
  fetchOpenRouterModels
} from "@/lib/models/fetch-models"
import { supabase } from "@/lib/supabase/browser-client"
import { TablesUpdate } from "@/supabase/types"
import { useRouter } from "next/navigation"
import { useContext, useEffect, useState } from "react"
import { FinishStep } from "../../../components/setup/finish-step"
import { ProfileStep } from "../../../components/setup/profile-step"
import {
  SETUP_STEP_COUNT,
  StepContainer
} from "../../../components/setup/step-container"

export default function SetupPage() {
  const {
    profile,
    setProfile,
    setWorkspaces,
    setSelectedWorkspace,
    setEnvKeyMap,
    setAvailableHostedModels,
    setAvailableOpenRouterModels
  } = useContext(ChatbotUIContext)

  const router = useRouter()

  const [loading, setLoading] = useState(true)

  const [currentStep, setCurrentStep] = useState(1)

  // Profile Step
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState(profile?.username || "")
  const [usernameAvailable, setUsernameAvailable] = useState(true)

  // Default OpenAI API key state
  const [defaultOpenaiAPIKey, setDefaultOpenaiAPIKey] = useState("")

  useEffect(() => {
    ;(async () => {
      const session = (await supabase.auth.getSession()).data.session

      if (!session) {
        return router.push("/login")
      }

      const user = session.user

      // Fetch the profile and default API key in parallel
      const [profile, apiKeyResponse] = await Promise.all([
        getProfileByUserId(user.id),
        fetch("/api/keys/default").catch(() => null)
      ])

      // If no profile exists, create a baseline entry
      if (!profile) {
        // The user has not configured a profile yet; keep them in setup
        setProfile(null)
        setUsername("")
        setLoading(false)
        return
      }

      setProfile(profile)
      setUsername(profile.username || "")

      // Handle default API key values
      if (apiKeyResponse) {
        try {
          const data = await apiKeyResponse.json()
          setDefaultOpenaiAPIKey(data.defaultOpenaiApiKey || "")
        } catch (error) {
          console.error("Failed to get default API key:", error)
        }
      }

      if (!profile.has_onboarded) {
        setLoading(false)
      } else {
        // If onboarding is complete, jump straight to chat
        // Skip loading heavy model data on the setup page
        const homeWorkspaceId = await getHomeWorkspaceByUserId(user.id)
        return router.push(`/${homeWorkspaceId}/chat`)
      }
    })()
  }, [])

  const handleShouldProceed = (proceed: boolean) => {
    if (proceed) {
      if (currentStep === SETUP_STEP_COUNT) {
        handleSaveSetupSetting()
      } else {
        setCurrentStep(currentStep + 1)
      }
    } else {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSaveSetupSetting = async () => {
    const session = (await supabase.auth.getSession()).data.session
    if (!session) {
      return router.push("/login")
    }

    const user = session.user
    let currentProfile = await getProfileByUserId(user.id)

    let updatedProfile

    if (!currentProfile) {
      // Create a new profile record
      const createProfilePayload = {
        user_id: user.id,
        has_onboarded: true,
        display_name: displayName,
        username,
        bio: "",
        profile_context: "",
        openai_api_key: defaultOpenaiAPIKey,
        openai_organization_id: "",
        anthropic_api_key: "",
        google_gemini_api_key: "",
        mistral_api_key: "",
        groq_api_key: "",
        perplexity_api_key: "",
        openrouter_api_key: "",
        use_azure_openai: false,
        azure_openai_api_key: "",
        azure_openai_endpoint: "",
        azure_openai_35_turbo_id: "",
        azure_openai_45_turbo_id: "",
        azure_openai_45_vision_id: "",
        azure_openai_embeddings_id: ""
      }
      
      const { createProfile } = await import("@/db/profile")
      updatedProfile = await createProfile(createProfilePayload)
    } else {
      // Update the existing profile
      const updateProfilePayload: TablesUpdate<"profiles"> = {
        ...currentProfile,
        has_onboarded: true,
        display_name: displayName,
        username,
        openai_api_key: defaultOpenaiAPIKey,
        openai_organization_id: "",
        anthropic_api_key: "",
        google_gemini_api_key: "",
        mistral_api_key: "",
        groq_api_key: "",
        perplexity_api_key: "",
        openrouter_api_key: "",
        use_azure_openai: false,
        azure_openai_api_key: "",
        azure_openai_endpoint: "",
        azure_openai_35_turbo_id: "",
        azure_openai_45_turbo_id: "",
        azure_openai_45_vision_id: "",
        azure_openai_embeddings_id: ""
      }

      updatedProfile = await updateProfile(currentProfile.id, updateProfilePayload)
    }
    
    setProfile(updatedProfile)

    const workspaces = await getWorkspacesByUserId(updatedProfile.user_id)
    const homeWorkspace = workspaces.find(w => w.is_home)

    // There will always be a home workspace
    setSelectedWorkspace(homeWorkspace!)
    setWorkspaces(workspaces)

    return router.push(`/${homeWorkspace?.id}/chat`)
  }

  const renderStep = (stepNum: number) => {
    switch (stepNum) {
      // Profile Step
      case 1:
        return (
          <StepContainer
            stepDescription="Let's create your profile."
            stepNum={currentStep}
            stepTitle="Welcome to MentalShield Project"
            onShouldProceed={handleShouldProceed}
            showNextButton={!!(username && usernameAvailable)}
            showBackButton={false}
          >
            <ProfileStep
              username={username}
              usernameAvailable={usernameAvailable}
              displayName={displayName}
              onUsernameAvailableChange={setUsernameAvailable}
              onUsernameChange={setUsername}
              onDisplayNameChange={setDisplayName}
            />
          </StepContainer>
        )

      // Finish Step (jump straight to step 2)
      case 2:
        return (
          <StepContainer
            stepDescription="Please read the project information and consent statement below."
            stepNum={currentStep}
            stepTitle="MentalShield Project - Informed Consent"
            onShouldProceed={handleShouldProceed}
            showNextButton={true}
            showBackButton={true}
          >
            <FinishStep displayName={displayName} />
          </StepContainer>
        )
      default:
        return null
    }
  }

  if (loading) {
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-900 dark:to-gray-800">
      {renderStep(currentStep)}
    </div>
  )
}
