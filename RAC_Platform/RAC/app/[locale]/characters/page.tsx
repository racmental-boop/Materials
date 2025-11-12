"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"

// Preload character data into a static variable to limit API calls
let charactersCache: any[] | null = null

export default function CharactersPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params ? (params.locale as string) : ""
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const charactersPerPage = 12
  const [characters, setCharacters] = useState<
    {
      rank: string
      character_name: string
      short_description: string
      image_url: string
      system_prompt: string
    }[]
  >([])

  useEffect(() => {
    // Use the cache to reduce API calls
    if (charactersCache) {
      console.log("Using cached character data") // Debug log
      setCharacters(charactersCache)
      return
    }

    // Fetch character data from API
    fetch("/api/prompts")
      .then(response => response.json())
      .then(
        (data: Array<{ 
          character_name: string; 
          system_prompt: string;
          rank: string;
          short_description: string;
          image_url: string;
        }>) => {
          console.log("Loaded character data:", data) // Debug log
          charactersCache = data // Cache the data
          setCharacters(data)
        }
      )
      .catch(error => console.error("Error fetching character data:", error))
  }, [])

  // Filter characters
  const filteredCharacters = characters.filter(
    character =>
      character.character_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      character.short_description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate total pages
  const totalPages = Math.ceil(filteredCharacters.length / charactersPerPage)

  // Compute the characters for the current page
  const currentCharacters = filteredCharacters.slice(
    (currentPage - 1) * charactersPerPage,
    currentPage * charactersPerPage
  )

  const [creatingChat, setCreatingChat] = useState<string | null>(null)

  const handleChoose = async (character: (typeof characters)[0]) => {
    if (creatingChat === character.rank) return // Prevent double-clicks
    
    try {
      setCreatingChat(character.rank) // Show loading state
      
      // Create new chat session
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          characterId: character.rank,
          characterName: character.character_name,
          systemPrompt: character.system_prompt,
          characterImageUrl: character.image_url
        })
      })

      if (!response.ok) {
        throw new Error("Failed to create chat")
      }

      const newChat = await response.json()
      const targetUrl = `/${locale}/${newChat.workspace_id}/chat/${newChat.id}?characterName=${character.character_name}&characterImageUrl=${encodeURIComponent(character.image_url)}`
      
      // Prefetch the destination page
      router.prefetch(targetUrl)
      
      // Navigate to workspace chat page
      router.push(targetUrl)
    } catch (error) {
      console.error("Failed to create chat:", error)
      setCreatingChat(null) // Reset loading state
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6 sm:px-6">
        <h1 className="mb-6 text-center text-2xl font-bold sm:mb-8 sm:text-3xl">
          Character Choose
        </h1>

        {/* Search bar */}
        <div className="mb-6">
          <Input
            type="text"
            placeholder="Search characters..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="mx-auto max-w-md"
          />
        </div>

        {/* Character grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {currentCharacters.map(character => (
            <div
              key={character.rank}
              className="rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md dark:bg-gray-800 sm:p-6"
            >
              {/* Avatar */}
              <div className="mb-3 flex justify-center sm:mb-4">
                <img
                  src={character.image_url}
                  alt={character.character_name}
                  className="h-16 w-16 rounded-full object-cover sm:h-20 sm:w-20 lg:h-24 lg:w-24"
                  onError={(e) => {
                    // Fallback to a default avatar when the image fails to load
                    (e.target as HTMLImageElement).src = "/default-avatar.png"
                  }}
                />
              </div>
              
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold sm:text-xl">
                  {character.character_name}
                </h2>
                <span className="text-muted-foreground text-xs sm:text-sm">
                  #{character.rank}
                </span>
              </div>
              
              <p className="mb-3 text-xs text-gray-600 line-clamp-3 sm:mb-4 sm:text-sm dark:text-gray-300">
                {character.short_description}
              </p>
              
              <Button 
                className="w-full text-sm" 
                onClick={() => handleChoose(character)}
                disabled={creatingChat === character.rank}
              >
                {creatingChat === character.rank ? "Creating..." : "Choose"}
              </Button>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:justify-center sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="w-full sm:w-auto"
          >
            Previous
          </Button>
          <span className="flex items-center px-2 text-sm sm:px-4">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="w-full sm:w-auto"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
