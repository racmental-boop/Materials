import { ChatbotUIContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { ContentType } from "@/types"
import { FC, useContext } from "react"
import { SIDEBAR_WIDTH } from "../ui/dashboard"
import { Tabs, TabsContent } from "../ui/tabs"
// Removed WorkspaceSwitcher and WorkspaceSettings imports
import { SidebarContent } from "./sidebar-content"
import Link from "next/link"
import { useParams } from "next/navigation"

interface SidebarProps {
  contentType: ContentType
  showSidebar: boolean
}

export const Sidebar: FC<SidebarProps> = ({ contentType, showSidebar }) => {
  const {
    folders,
    chats,
    presets,
    prompts,
    files,
    collections,
    assistants,
    tools,
    models
  } = useContext(ChatbotUIContext)

  const params = useParams()
  const locale = params ? (params.locale as string) : ""

  const chatFolders = folders.filter(folder => folder.type === "chats")
  const presetFolders = folders.filter(folder => folder.type === "presets")
  const promptFolders = folders.filter(folder => folder.type === "prompts")
  const filesFolders = folders.filter(folder => folder.type === "files")
  const collectionFolders = folders.filter(
    folder => folder.type === "collections"
  )
  const assistantFolders = folders.filter(
    folder => folder.type === "assistants"
  )
  const toolFolders = folders.filter(folder => folder.type === "tools")
  const modelFolders = folders.filter(folder => folder.type === "models")

  const renderSidebarContent = (
    contentType: ContentType,
    data: any[],
    folders: Tables<"folders">[]
  ) => {
    return (
      <SidebarContent contentType={contentType} data={data} folders={folders} />
    )
  }

  return (
    <Tabs defaultValue={contentType} className="w-full">
      <TabsContent
        className="m-0 w-full space-y-2"
        style={{
          // Sidebar - SidebarSwitcher
          minWidth: showSidebar ? `calc(${SIDEBAR_WIDTH}px - 60px)` : "0px",
          maxWidth: showSidebar ? `calc(${SIDEBAR_WIDTH}px - 60px)` : "0px",
          width: showSidebar ? `calc(${SIDEBAR_WIDTH}px - 60px)` : "0px"
        }}
        value={contentType}
      >
        <div className="flex h-full flex-col p-3">
          {/* Removed WorkspaceSwitcher and WorkspaceSettings buttons */}

          <div className="flex flex-col gap-2 py-2">
            <Link
              href={`/${locale}/characters`}
              className="hover:bg-accent flex items-center gap-2 rounded-lg px-3 py-2"
            >
              <span>Character Choose</span>
            </Link>
          </div>

          {(() => {
            switch (contentType) {
              case "chats":
                return renderSidebarContent("chats", chats, chatFolders)

              case "presets":
                return renderSidebarContent("presets", presets, presetFolders)

              case "prompts":
                return renderSidebarContent("prompts", prompts, promptFolders)

              case "files":
                return renderSidebarContent("files", files, filesFolders)

              case "collections":
                return renderSidebarContent(
                  "collections",
                  collections,
                  collectionFolders
                )

              case "assistants":
                return renderSidebarContent(
                  "assistants",
                  assistants,
                  assistantFolders
                )

              case "tools":
                return renderSidebarContent("tools", tools, toolFolders)

              case "models":
                return renderSidebarContent("models", models, modelFolders)


              default:
                return null
            }
          })()}
        </div>
      </TabsContent>
    </Tabs>
  )
}
