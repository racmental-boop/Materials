"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Shield,
  Users,
  MessageSquare,
  BarChart3,
  Download,
  LogOut,
  Eye,
  Calendar,
  Activity,
  FileText,
  UserPlus,
  Trash2
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface UserData {
  user_id: string
  email: string
  display_name: string
  username: string
  created_at: string
  has_onboarded: boolean
  statistics: {
    total_required_surveys: number
    total_extra_surveys: number
    total_messages: number
    total_chats: number
    active_days: number
  }
  daily_progress: any[]
  emoji_surveys: any[]
  chats: any[]
  messages: any[]
}

interface AdminData {
  id: string
  email: string
  name: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [admin, setAdmin] = useState<AdminData | null>(null)
  const [users, setUsers] = useState<UserData[]>([])
  const [summary, setSummary] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [error, setError] = useState("")
  

  // State for creating new users
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")

  // State for deleting users
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")

  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [passwordResetting, setPasswordResetting] = useState(false)
  const [passwordResetUser, setPasswordResetUser] = useState<UserData | null>(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")


  useEffect(() => {
    checkAuth()
    loadUsersData()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "verify" }),
        credentials: "include" // Ensure cookies are sent
      })
      
      if (!response.ok) {
        router.push("/admin/login")
        return
      }

      const data = await response.json()
      if (data.success) {
        setAdmin(data.admin)
      } else {
        router.push("/admin/login")
      }
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/admin/login")
    }
  }

  const loadUsersData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/users", {
        method: "GET",
        credentials: "include", // Include cookies for auth
        headers: {
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        throw new Error("Failed to load user data")
      }

      const data = await response.json()
      if (data.success) {
        setUsers(data.users)
        setSummary(data.summary)
      } else {
        setError("Failed to load user data")
      }
    } catch (error: any) {
      console.error("Load users error:", error)
      setError(error.message || "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "logout" })
      })
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      router.push("/admin/login")
    }
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const response = await fetch("/api/admin/export", {
        method: "GET",
        credentials: "include", // Include cookies for auth
        headers: {
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        throw new Error("Export failed")
      }

      // Determine the filename
      const contentDisposition = response.headers.get("content-disposition")
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1].replace(/"/g, "")
        : "mentalshield-export.jsonl"

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      console.error("Export error:", error)
      setError(error.message || "Export failed")
    } finally {
      setExporting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const downloadUserData = async (user: UserData) => {
    try {
      console.log("Starting user data download:")
      console.log("Full user object:", user)
      console.log("User ID:", user.user_id)
      console.log("User ID type:", typeof user.user_id)
      console.log("User ID length:", user.user_id?.length)
      
      // Call the single-user export API to pull the complete dataset
      // Use a relative path so the browser resolves the current origin
      const apiUrl = `/api/admin/export/user/${user.user_id}`
      console.log("API URL:", apiUrl)
      console.log("Current origin:", window.location.origin)
      console.log("Full request URL:", new URL(apiUrl, window.location.origin).toString())
      
      const response = await fetch(apiUrl, {
        method: "GET",
        credentials: "include", // Include cookies for auth
        headers: {
          "Content-Type": "application/json"
        }
      })
      
      console.log("Response status:", response.status)
      console.log("Response headers:", Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error("API error response:", errorText)
        throw new Error(`Export failed: ${response.status} - ${errorText}`)
      }

      // Determine the filename
      const contentDisposition = response.headers.get("content-disposition")
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1].replace(/"/g, "")
        : `user-${user.username || user.user_id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.jsonl`

      console.log("Filename:", filename)

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      console.log("Download complete")
    } catch (error: any) {
      console.error("User export error:", error)
      setError(error.message || "Failed to export user data")
    }
  }



  // Create user helper
  const handleCreateUser = async () => {
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      setError("Please provide both email and password")
      return
    }

    try {
      setCreatingUser(true)
      const response = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include", // Include cookies for auth
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: newUserEmail.trim(),
          password: newUserPassword.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create user")
      }

      if (data.success) {
        setNewUserEmail("")
        setNewUserPassword("")
        setCreateUserDialogOpen(false)
        setError("")
        // Reload user data
        await loadUsersData()
      } else {
        setError(data.error || "Failed to create user")
      }
    } catch (error: any) {
      console.error("Create user error:", error)
      setError(error.message || "Failed to create user")
    } finally {
      setCreatingUser(false)
    }
  }

  // Delete user helper
  const openDeleteUserDialog = (user: UserData) => {
    setUserToDelete(user)
    setDeleteConfirmation("")
    setDeleteUserDialogOpen(true)
  }

  const handleDeleteUser = async () => {
    if (!userToDelete || deleteConfirmation !== "DELETE") {
      setError('Type "DELETE" to confirm removal')
      return
    }

    try {
      setDeletingUser(true)
      const response = await fetch(`/api/admin/users/${userToDelete.user_id}`, {
        method: "DELETE",
        credentials: "include", // Include cookies for auth
        headers: {
          "Content-Type": "application/json"
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete user")
      }

      if (data.success) {
        setDeleteUserDialogOpen(false)
        setUserToDelete(null)
        setDeleteConfirmation("")
        setError("")
        // Reload user data
        await loadUsersData()
      } else {
        setError(data.error || "Failed to delete user")
      }
    } catch (error: any) {
      console.error("Delete user error:", error)
      setError(error.message || "Failed to delete user")
    } finally {
      setDeletingUser(false)
    }
  }

  const openPasswordResetDialog = (user: UserData) => {
    setPasswordResetUser(user)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmNewPassword("")
    setResetPasswordDialogOpen(true)
  }

  const handlePasswordReset = async () => {
    if (!passwordResetUser) {
      setError("No user selected")
      return
    }

    if (!currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      setError("Please fill in every password field")
      return
    }

    if (newPassword !== confirmNewPassword) {
      setError("New password entries do not match")
      return
    }

    try {
      setPasswordResetting(true)
      const response = await fetch(`/api/admin/users/${passwordResetUser.user_id}/password`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim()
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update password")
      }

      setResetPasswordDialogOpen(false)
      setPasswordResetUser(null)
      setError("")
    } catch (error: any) {
      console.error("Reset password error:", error)
      setError(error.message || "Failed to update password")
    } finally {
      setPasswordResetting(false)
    }
  }


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="size-32 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Shield className="mr-3 size-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  MentalShield Project Admin
                </h1>
                <p className="text-sm text-gray-500">Welcome, {admin?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setCreateUserDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="mr-2 size-4" />
                Create User
              </Button>
              <Button
                onClick={() => router.push("/zh/admin/track")}
                variant="outline"
              >
                <Activity className="mr-2 size-4" />
                User Tracking
              </Button>
              <Button
                onClick={handleExport}
                disabled={exporting}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="mr-2 size-4" />
                {exporting ? "Exporting..." : "Export Data"}
              </Button>
              <Button onClick={handleLogout} variant="outline">
                <LogOut className="mr-2 size-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.total_users || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Surveys</CardTitle>
              <BarChart3 className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.total_surveys || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.total_messages || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Chats</CardTitle>
              <FileText className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.total_chats || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User data table */}
        <Card>
          <CardHeader>
            <CardTitle>User Data Overview</CardTitle>
            <CardDescription>
              Detailed information and progress for every participant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Active Days</TableHead>
                    <TableHead>Required Surveys</TableHead>
                    <TableHead>Extra Surveys</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        {user.display_name || user.username}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <Calendar className="mr-1 size-3" />
                          {user.statistics.active_days} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">
                          {user.statistics.total_required_surveys}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.statistics.total_extra_surveys}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <MessageSquare className="mr-1 size-3" />
                          {user.statistics.total_messages}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.has_onboarded ? "default" : "destructive"
                          }
                        >
                          {user.has_onboarded ? "Setup complete" : "Setup incomplete"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadUserData(user)}
                          >
                            <Download className="mr-1 size-4" />
                            Download Data
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPasswordResetDialog(user)}
                          >
                            Reset Password
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openDeleteUserDialog(user)}
                          >
                            <Trash2 className="mr-1 size-4" />
                            Delete
                          </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Eye className="mr-1 size-4" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-h-[80vh] max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>
                                User Details:
                                {selectedUser?.display_name ||
                                  selectedUser?.username}
                              </DialogTitle>
                              <DialogDescription>
                                {selectedUser?.email} -{" "}
                                {selectedUser &&
                                  formatDate(selectedUser.created_at)}
                              </DialogDescription>
                            </DialogHeader>

                            {selectedUser && (
                              <ScrollArea className="h-[60vh]">
                                <Tabs defaultValue="surveys" className="w-full">
                                  <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="surveys">
                                      Emoji Surveys
                                    </TabsTrigger>
                                    <TabsTrigger value="chats">
                                      Chat Logs
                                    </TabsTrigger>
                                    <TabsTrigger value="progress">
                                      Daily Progress
                                    </TabsTrigger>
                                  </TabsList>

                                  <TabsContent
                                    value="surveys"
                                    className="space-y-4"
                                  >
                                    <div className="grid grid-cols-1 gap-4">
                                      {selectedUser.emoji_surveys.map(
                                        (survey, index) => (
                                          <Card key={index}>
                                            <CardContent className="pt-4">
                                              <div className="flex items-start justify-between">
                                                <div>
                                                  <p className="font-medium">
                                                    {survey.question_text}
                                                  </p>
                                                  <p className="text-sm text-gray-600">
                                                    Emotion score:{" "}
                                                    {survey.emotion_score}/5
                                                  </p>
                                                  <p className="text-sm text-gray-500">
                                                    {formatDate(
                                                      survey.created_at
                                                    )}
                                                  </p>
                                                </div>
                                                <Badge
                                                  variant={
                                                    survey.survey_type ===
                                                    "daily_required"
                                                      ? "default"
                                                      : "secondary"
                                                  }
                                                >
                                                  {survey.survey_type ===
                                                  "daily_required"
                                                    ? "Required"
                                                    : "Extra"}
                                                </Badge>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        )
                                      )}
                                    </div>
                                  </TabsContent>

                                  <TabsContent
                                    value="chats"
                                    className="space-y-4"
                                  >
                                    <div className="grid grid-cols-1 gap-4">
                                      {selectedUser.chats.map((chat, index) => (
                                        <Card key={index}>
                                          <CardContent className="pt-4">
                                            <div className="mb-2 flex items-start justify-between">
                                              <h4 className="font-medium">
                                                {chat.name}
                                              </h4>
                                              <p className="text-sm text-gray-500">
                                                {formatDate(chat.created_at)}
                                              </p>
                                            </div>
                                            <div className="max-h-40 space-y-2 overflow-y-auto">
                                              {selectedUser.messages
                                                .filter(
                                                  msg => msg.chat_id === chat.id
                                                )
                                                .slice(0, 5)
                                                .map((message, msgIndex) => (
                                                  <div
                                                    key={msgIndex}
                                                    className="text-sm"
                                                  >
                                                    <span className="font-medium">
                                                      {message.role === "user"
                                                        ? "User"
                                                        : "Assistant"}
                                                      :
                                                    </span>
                                                    <span className="ml-2 text-gray-700">
                                                      {message.content.substring(
                                                        0,
                                                        100
                                                      )}
                                                      {message.content.length >
                                                      100
                                                        ? "..."
                                                        : ""}
                                                    </span>
                                                  </div>
                                                ))}
                                            </div>
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                  </TabsContent>

                                  <TabsContent
                                    value="progress"
                                    className="space-y-4"
                                  >
                                    <div className="grid grid-cols-1 gap-4">
                                      {selectedUser.daily_progress.map(
                                        (progress, index) => (
                                          <Card key={index}>
                                            <CardContent className="pt-4">
                                              <div className="flex items-center justify-between">
                                                <div>
                                                  <p className="font-medium">
                                                    {progress.session_date}
                                                  </p>
                                                  <p className="text-sm text-gray-600">
                                                    Required surveys:{" "}
                                                    {
                                                      progress.required_surveys_completed
                                                    }
                                                    /3
                                                  </p>
                                                  <p className="text-sm text-gray-600">
                                                    Extra surveys:{" "}
                                                    {
                                                      progress.extra_surveys_completed
                                                    }
                                                  </p>
                                                </div>
                                                <Badge
                                                  variant={
                                                    progress.required_surveys_completed >=
                                                    3
                                                      ? "default"
                                                      : "destructive"
                                                  }
                                                >
                                                  {progress.required_surveys_completed >=
                                                  3
                                                    ? "Complete"
                                                    : "Incomplete"}
                                                </Badge>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        )
                                      )}
                                    </div>
                                  </TabsContent>
                                </Tabs>
                              </ScrollArea>
                            )}
                          </DialogContent>
                        </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>


        {/* Create user dialog */}
        <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Enter the email and password for the new user. They will finish onboarding after their first login.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-user-email">Email address</Label>
                <Input
                  id="new-user-email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="new-user-password">Password</Label>
                <Input
                  id="new-user-password"
                  type="password"
                  placeholder="Enter a password (minimum 6 characters)"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCreateUserDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={creatingUser || !newUserEmail.trim() || !newUserPassword.trim()}
                >
                  <UserPlus className="mr-2 size-4" />
                  {creatingUser ? "Creating..." : "Create User"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete user confirmation dialog */}
        <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                ⚠️ Warning: this action permanently removes the user's data, including:
                <br />
                • Profile information
                <br />
                • Chats and messages
                <br />
                • Emoji survey records
                <br />
                • Daily progress data
                <br />
                <br />
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="rounded-md border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">
                  User to delete: {userToDelete?.display_name || userToDelete?.username}
                </p>
                <p className="text-sm text-red-700">
                  Email: {userToDelete?.email}
                </p>
              </div>
              
              <div>
                <Label htmlFor="delete-confirmation">
                  Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
                </Label>
                <Input
                  id="delete-confirmation"
                  placeholder='Enter "DELETE" to confirm'
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteUserDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteUser}
                  disabled={deletingUser || deleteConfirmation !== "DELETE"}
                >
                  <Trash2 className="mr-2 size-4" />
                  {deletingUser ? "Deleting..." : "Confirm Delete"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update User Password</DialogTitle>
              <DialogDescription>
                Administrators can reset a password after verifying the user's identity.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-md border bg-muted/50 p-4 text-sm">
                <p>User: {passwordResetUser?.display_name || passwordResetUser?.username}</p>
                <p>Email: {passwordResetUser?.email}</p>
              </div>

              <div>
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter the current password"
                />
              </div>

              <div>
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter a new password"
                />
              </div>

              <div>
                <Label htmlFor="confirm-new-password">Confirm new password</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter the new password"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePasswordReset} disabled={passwordResetting}>
                  {passwordResetting ? "Updating..." : "Confirm Update"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  )
}
