import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

export const getProfileByUserId = async (userId: string) => {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .limit(1)

  if (error) {
    throw new Error(error.message)
  }

  const profile = profiles?.[0]
  return profile || null
}

export const getProfilesByUserId = async (userId: string) => {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)

  if (!profiles) {
    throw new Error(error.message)
  }

  return profiles
}

export const createProfile = async (profile: TablesInsert<"profiles">) => {
  const { data: createdProfiles, error } = await supabase
    .from("profiles")
    .insert([profile])
    .select("*")

  if (error) {
    throw new Error(error.message)
  }

  const createdProfile = createdProfiles?.[0]
  if (!createdProfile) {
    throw new Error("Failed to create profile")
  }

  return createdProfile
}

export const updateProfile = async (
  profileId: string,
  profile: TablesUpdate<"profiles">
) => {
  const { data: updatedProfiles, error } = await supabase
    .from("profiles")
    .update(profile)
    .eq("id", profileId)
    .select("*")

  if (error) {
    throw new Error(error.message)
  }

  const updatedProfile = updatedProfiles?.[0]
  if (!updatedProfile) {
    throw new Error(`Failed to update profile with ID: ${profileId}`)
  }

  return updatedProfile
}

export const deleteProfile = async (profileId: string) => {
  const { error } = await supabase.from("profiles").delete().eq("id", profileId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}
