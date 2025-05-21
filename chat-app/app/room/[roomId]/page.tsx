"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Send, LogOut, X, MessageSquare, Users, ChevronLeft, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import axios from "axios"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

interface Message {
  id?: string
  content: string
  senderId: string
  senderName?: string
  timestamp: string
  roomId?: string
}

interface User {
  id: string
  name: string
  color?: string
}

export default function ChatRoom() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState("")
  const [isJoined, setIsJoined] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [roomName, setRoomName] = useState("Loading...")
  const [isSending, setIsSending] = useState(false)
  const [isConnecting, setIsConnecting] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Get user info from localStorage (set in the home page)
  const getUserFromStorage = () => {
    const chatUserStr = localStorage.getItem("chatUser")
    if (!chatUserStr) {
      // If no user is stored, redirect to home page
      router.push("/")
      return { id: "", name: "" }
    }

    try {
      return JSON.parse(chatUserStr)
    } catch (e) {
      console.log(e);
      console.error("Failed to parse user from localStorage", e)
      router.push("/")
      return { id: "", name: "" }
    }
  }

  const user = getUserFromStorage()
  const userId = user.id
  const userName = user.name || "Anonymous"



  useEffect(() => {
    const fetchInitialMessages = async () => {
      try {
        const response = await fetch(`/api/chatRoom/message?roomId=${roomId}`);
        const data = await response.json();
        
        if (data.success && Array.isArray(data.messages)) {
          setMessages(data.messages.map((msg: Message) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            senderName: msg.senderName || "Unknown",
          })));
        }
      } catch (error) {
        console.error('Failed to fetch initial messages:', error);
        setError('Failed to load message history');
      }
    };

    fetchInitialMessages();
  }, [roomId]);

  // Connect to WebSocket server
  useEffect(() => {
    // Set room name from URL parameter initially
    setRoomName(`Room ${roomId}`)
    setIsConnecting(true)

    const connectWebSocket = () => {
      const ws = new WebSocket("https://socket-dcn-assignment.onrender.com/")

      ws.onopen = () => {
        console.log("Connected to WebSocket")
        setIsConnected(true)
        setIsConnecting(false)
        setError("")

        // Set user identity
        ws.send(
          JSON.stringify({
            type: "SET_USER",
            userId: userId,
            userName: userName,
            roomId: roomId,
          }),
        )

        toast.success("Connected to chat server")
      }

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        console.log("Received message:", message)

        switch (message.type) {
          case "USER_SET":
            // User ID successfully set, now join the room
            ws.send(
              JSON.stringify({
                type: "JOIN_ROOM",
                roomId: roomId,
              }),
            )
            break

          case "CHAT_MESSAGE":
            const newMessage = {
              id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              content: message.content,
              senderId: message.senderId,
              senderName: message.senderName || getUserNameById(message.senderId),
              timestamp: message.timestamp || new Date().toISOString(),
            }
            setMessages((prev) => [...prev, newMessage])
            break

          case "USER_JOINED":
            const newUser = {
              id: message.userId,
              name: message.userName || `User ${message.userId.substring(0, 5)}`,
              color: getRandomColor(),
            }

            setUsers((prev) => {
              // Only add if not already in the list
              if (!prev.some((user) => user.id === message.userId)) {
                return [...prev, newUser]
              }
              return prev
            })

            // Show system message for user joined
            setMessages((prev) => [
              ...prev,
              {
                id: `system-${Date.now()}`,
                content: `${newUser.name} joined the chat`,
                senderId: "system",
                timestamp: new Date().toISOString(),
              },
            ])

            toast.info(`${newUser.name} joined the chat`)
            break

          case "USER_LEFT":
            const leftUserName =
              getUserNameById(message.userId) || message.userName || `User ${message.userId.substring(0, 5)}`

            setUsers((prev) => prev.filter((user) => user.id !== message.userId))

            // Show system message for user left
            setMessages((prev) => [
              ...prev,
              {
                id: `system-${Date.now()}`,
                content: `${leftUserName} left the chat`,
                senderId: "system",
                timestamp: new Date().toISOString(),
              },
            ])

            toast.info(`${leftUserName} left the chat`)
            break

          case "ROOM_JOINED":
            setIsJoined(true)
            // Update room name if provided by server
            if (message.name) {
              setRoomName(message.name)
            }

            // Since we're joining, we need to update our users list
            // This will happen through subsequent USER_JOINED messages

            toast.success("Joined the chat room")
            break

          case "ROOM_LEFT":
            setIsJoined(false)
            setUsers([])
            toast.info("Left the chat room")
            break

          case "ERROR":
            setError(message.message)
            setIsConnecting(false)
            toast.error(message.message)
            break

          default:
            console.log("Unhandled message type:", message.type)
        }
      }

      ws.onclose = () => {
        console.log("Disconnected from WebSocket")
        setIsConnected(false)
        setIsJoined(false)
        toast.error("Disconnected from chat server. Reconnecting...")

        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000)
      }

      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        setError("Connection error. Please try again.")
        setIsConnecting(false)
        toast.error("Connection error. Reconnecting...")
      }

      wsRef.current = ws
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        // Send leave room message before disconnecting
        if (isJoined) {
          wsRef.current.send(JSON.stringify({ type: "LEAVE_ROOM" }))
        }
        wsRef.current.close()
      }
    }
  }, [roomId, userId, userName, router])

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input when joined
  useEffect(() => {
    if (isJoined && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isJoined])

  // Get a random color for user avatars
  const getRandomColor = () => {
    const colors = [
      "bg-rose-500",
      "bg-emerald-500",
      "bg-blue-500",
      "bg-amber-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
      "bg-orange-500",
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  // Get user name by ID from users array
  const getUserNameById = (id: string) => {
    const user = users.find((u) => u.id === id)
    return user ? user.name : id.substring(0, 5)
  }

  // Get user color by ID
  const getUserColorById = (id: string) => {
    const user = users.find((u) => u.id === id)
    return user?.color || "bg-gray-500"
  }

  // Leave room and go back to home
  const handleLeaveRoom = () => {
    if (wsRef.current && isJoined) {
      wsRef.current.send(JSON.stringify({ type: "LEAVE_ROOM" }))
    }
    router.push("/")
  }

  // Handle form submission for sending a message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim() || !wsRef.current || !isJoined || isSending) return

     await axios.post(`/api/chatRoom/message`, {
      content: messageInput,
      senderId: userId,
      roomId: roomId,
    })

    setIsSending(true)

    wsRef.current.send(
      JSON.stringify({
        type: "CHAT_MESSAGE",
        content: messageInput,
        senderName: userName,
      }),
    )

    setMessageInput("")

    // Reset sending state after a short delay
    setTimeout(() => setIsSending(false), 300)

    // Focus the input after sending
    inputRef.current?.focus()
  }

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    try {
      const msgDate = new Date(timestamp)
      const now = new Date()

      // If the message is from today, show only time
      if (msgDate.toDateString() === now.toDateString()) {
        return msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }

      // If message is from this year, show month and day
      if (msgDate.getFullYear() === now.getFullYear()) {
        return (
          msgDate.toLocaleDateString([], { month: "short", day: "numeric" }) +
          " " +
          msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        )
      }

      // Otherwise show full date
      return (
        msgDate.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }) +
        " " +
        msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      )
    } catch (e) {
      console.log(e);
      return timestamp
    }
  }

  // Get time groupings for messages
  const getMessageDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      const now = new Date()

      if (date.toDateString() === now.toDateString()) {
        return "Today"
      } else if (date.toDateString() === new Date(now.setDate(now.getDate() - 1)).toDateString()) {
        return "Yesterday"
      } else {
        return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })
      }
    } catch (e) {
      console.log(e);
      return ""
    }
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups: Record<string, Message[]>, message) => {
    const date = getMessageDate(message.timestamp)
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {})

  // Group consecutive messages from the same sender
  const groupMessagesBySender = (messages: Message[]) => {
    return messages.reduce((groups: Message[][], message, index, array) => {
      // If this is the first message or the sender is different from the previous message
      if (index === 0 || message.senderId !== array[index - 1].senderId) {
        groups.push([message])
      } else {
        // Add to the last group if the sender is the same
        groups[groups.length - 1].push(message)
      }
      return groups
    }, [])
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {/* Sidebar */}
        <Sidebar variant="floating" collapsible="offcanvas">
          <SidebarHeader className="border-b">
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="md:hidden">
                  <ChevronLeft size={18} />
                </Button>
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <MessageSquare size={18} className="text-primary" />
                    {roomName}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {isConnected ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1.5">
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full inline-block"></span>
                        Disconnected
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <SidebarTrigger className="md:hidden" />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
                <Users size={14} />
                Participants ({users.length})
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <ScrollArea className="h-[calc(100vh-240px)]">
                  <div className="space-y-1 p-1">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent group">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={getUserColorById(user.id)}>
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate flex items-center gap-2">
                            {user.name}
                            {user.id === userId && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                You
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{user.id.substring(0, 8)}...</p>
                        </div>
                      </div>
                    ))}

                    {users.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Users size={32} className="text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">No participants yet</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t">
            <div className="p-3">
              <div className="flex items-center gap-3 p-2 rounded-md bg-accent/50">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{userId.substring(0, 12)}...</p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLeaveRoom}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <LogOut size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Leave Room</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* Mobile header */}
          <div className="md:hidden flex items-center justify-between p-3 bg-background border-b">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div>
                <h2 className="font-medium text-sm">{roomName}</h2>
                <p className="text-xs text-muted-foreground">{users.length} participants</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLeaveRoom} className="h-8 w-8">
              <LogOut size={16} />
            </Button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mx-4 my-2">
              <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md p-3 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Connection Error</p>
                  <p className="text-xs">{error}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setError("")} className="h-6 w-6 -mr-1 -mt-1">
                  <X size={14} />
                </Button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isConnecting && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="flex flex-col items-center gap-4 max-w-md text-center p-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Loader2 size={24} className="text-primary animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">Connecting to chat...</h3>
                  <p className="text-sm text-muted-foreground mt-1">Establishing connection to the chat server</p>
                </div>
              </div>
            </div>
          )}

          {/* Messages container */}
          {!isConnecting && (
            <ScrollArea className="flex-1 px-4 py-6">
              <div className="max-w-3xl mx-auto space-y-8">
                {Object.keys(groupedMessages).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="bg-primary/10 p-4 rounded-full mb-4">
                      <MessageSquare size={32} className="text-primary" />
                    </div>
                    <h3 className="text-xl font-medium">No messages yet</h3>
                    <p className="mt-2 text-muted-foreground text-center max-w-sm">
                      Be the first to start a conversation in this room!
                    </p>
                  </div>
                ) : (
                  Object.entries(groupedMessages).map(([date, msgs]) => (
                    <div key={date} className="space-y-6">
                      <div className="flex items-center justify-center">
                        <div className="bg-muted px-3 py-1 rounded-full">
                          <span className="text-xs font-medium text-muted-foreground">{date}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {groupMessagesBySender(msgs).map((group, groupIndex) => {
                          const isCurrentUser = group[0].senderId === userId
                          const isSystem = group[0].senderId === "system"

                          if (isSystem) {
                            return (
                              <div key={`group-${groupIndex}`} className="flex justify-center">
                                <div className="bg-muted/50 text-xs text-center py-1.5 px-3 rounded-full text-muted-foreground">
                                  {group[0].content}
                                </div>
                              </div>
                            )
                          }

                          return (
                            <div
                              key={`group-${groupIndex}`}
                              className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                            >
                              {!isCurrentUser && (
                                <Avatar className="mr-2 flex-shrink-0 mt-1 h-8 w-8">
                                  <AvatarFallback className={getUserColorById(group[0].senderId)}>
                                    {getInitials(group[0].senderName || getUserNameById(group[0].senderId))}
                                  </AvatarFallback>
                                </Avatar>
                              )}

                              <div
                                className={`max-w-xs sm:max-w-md space-y-1 ${isCurrentUser ? "items-end" : "items-start"}`}
                              >
                                {!isCurrentUser && (
                                  <p className="text-xs font-medium text-muted-foreground ml-1">
                                    {group[0].senderName || getUserNameById(group[0].senderId)}
                                  </p>
                                )}

                                <div className="space-y-1">
                                  {group.map((message, msgIndex) => (
                                    <div
                                      key={message.id || msgIndex}
                                      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                                    >
                                      <div
                                        className={`px-3 py-2 rounded-2xl max-w-full ${
                                          isCurrentUser
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-card border rounded-tl-none"
                                        } ${msgIndex > 0 ? (isCurrentUser ? "rounded-tr-2xl" : "rounded-tl-2xl") : ""}`}
                                      >
                                        <p className="break-words">{message.content}</p>
                                        <p
                                          className={`text-[10px] mt-1 text-right ${
                                            isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
                                          }`}
                                        >
                                          {formatTime(message.timestamp)}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}

          {/* Message input */}
          <div className="bg-background border-t p-3">
            <form onSubmit={sendMessage} className="max-w-3xl mx-auto flex gap-2">
              <Input
                ref={inputRef}
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={isConnected && isJoined ? "Type a message..." : "Connecting..."}
                className="flex-1"
                disabled={!isConnected || !isJoined || isSending}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="submit"
                      disabled={!isConnected || !isJoined || !messageInput.trim() || isSending}
                      size="icon"
                      className={isSending ? "opacity-70" : ""}
                    >
                      {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Send Message</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </form>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
