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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Shield,
  Users,
  Download,
  LogOut,
  Filter,
  Search,
  Calendar,
  Activity
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface UserTrackingData {
  user_id: string
  email: string
  display_name: string
  username: string
  created_at: string
  today_surveys: number
  total_surveys: number
  active_days: number
  last_activity: string
}

interface AdminData {
  id: string
  email: string
  name: string
}

export default function AdminTrackPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState<AdminData | null>(null)
  const [users, setUsers] = useState<UserTrackingData[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserTrackingData[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState("")

  // Filter state
  const [surveyFilter, setSurveyFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    checkAuth()
    loadTrackingData()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, surveyFilter, searchTerm])

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "verify" })
      })

      if (!response.ok) {
        router.push("/zh/admin/login")
        return
      }

      const data = await response.json()
      if (data.success) {
        setAdmin(data.admin)
      } else {
        router.push("/zh/admin/login")
      }
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/zh/admin/login")
    }
  }

  const loadTrackingData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/track")

      if (!response.ok) {
        throw new Error("Failed to load tracking data")
      }

      const data = await response.json()
      if (data.success) {
        setUsers(data.users)
      } else {
        setError("Failed to load tracking data")
      }
    } catch (error: any) {
      console.error("Load tracking data error:", error)
      setError(error.message || "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    // Filter based on today's survey count
    if (surveyFilter !== "all") {
      const filterValue = parseInt(surveyFilter)
      if (surveyFilter === "0") {
        filtered = filtered.filter(user => user.today_surveys === 0)
      } else if (surveyFilter === "3+") {
        filtered = filtered.filter(user => user.today_surveys >= 3)
      } else {
        filtered = filtered.filter(user => user.today_surveys === filterValue)
      }
    }

    // Filter based on search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        user =>
          user.email.toLowerCase().includes(term) ||
          user.display_name?.toLowerCase().includes(term) ||
          user.username.toLowerCase().includes(term) ||
          user.user_id.toLowerCase().includes(term)
      )
    }

    setFilteredUsers(filtered)
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
      router.push("/zh/admin/login")
    }
  }

  const handleExportUser = async (userId: string) => {
    try {
      setExporting(true)
      const response = await fetch(`/api/admin/export/user/${userId}`)

      if (!response.ok) {
        throw new Error("Export failed")
      }

      // Build the filename
      const contentDisposition = response.headers.get("content-disposition")
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1].replace(/"/g, "")
        : `user-${userId}-export.jsonl`

      // Trigger the download
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
    return new Date(dateString).toLocaleString("zh-CN")
  }

  const getSurveyBadgeVariant = (count: number) => {
    if (count === 0) return "destructive"
    if (count < 3) return "secondary"
    return "default"
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
                  User Tracking
                </h1>
                <p className="text-sm text-gray-500">Welcome, {admin?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push("/zh/admin/dashboard")}
                variant="outline"
              >
                Back to Dashboard
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

        {/* Statistics overview */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Today</CardTitle>
              <Activity className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.today_surveys > 0).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hit Daily Goal</CardTitle>
              <Calendar className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.today_surveys >= 3).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Today</CardTitle>
              <Users className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.today_surveys === 0).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters & Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 size-4 text-gray-400" />
                  <Input
                    placeholder="Search users (email, name, UUID)..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <Select value={surveyFilter} onValueChange={setSurveyFilter}>
                  <SelectTrigger>
                    <Filter className="mr-2 size-4" />
                    <SelectValue placeholder="Filter by today's survey count" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    <SelectItem value="0">0 times (inactive)</SelectItem>
                    <SelectItem value="1">1 time</SelectItem>
                    <SelectItem value="2">2 times</SelectItem>
                    <SelectItem value="3">3 times (goal)</SelectItem>
                    <SelectItem value="3+">More than 3 times</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User tracking table */}
        <Card>
          <CardHeader>
            <CardTitle>User Tracking List</CardTitle>
            <CardDescription>
              Showing {filteredUsers.length} / {users.length} users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>UUID</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Today</TableHead>
                    <TableHead>Total Surveys</TableHead>
                    <TableHead>Active Days</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {user.display_name || user.username}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {user.user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getSurveyBadgeVariant(user.today_surveys)}
                        >
                          {user.today_surveys} times
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.total_surveys}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <Calendar className="mr-1 size-3" />
                          {user.active_days} days
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.last_activity
                          ? formatDate(user.last_activity)
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportUser(user.user_id)}
                          disabled={exporting}
                        >
                          <Download className="mr-1 size-4" />
                          Export
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
