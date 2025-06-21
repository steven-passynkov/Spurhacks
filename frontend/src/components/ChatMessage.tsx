import type { Message } from "../types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Bot, User, Volume2 } from "lucide-react"

interface ChatMessageProps {
    message: Message
    themeClasses: {
        primary: string
        accent: string
    }
}

export const ChatMessage = ({
    message,
    themeClasses,
}: ChatMessageProps) => {
    return (
        <div className={`flex gap-3 ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
            {message.sender === "system" && (
                <Avatar className="w-8 h-8 bg-blue-100">
                    <AvatarFallback>
                        <Bot className={`w-4 h-4 ${themeClasses.accent}`} />
                    </AvatarFallback>
                </Avatar>
            )}

            <div
                className={`max-w-[70%] rounded-lg p-3 bg-gray-100 text-gray-900`}
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="whitespace-pre-wrap flex-1">{message.content}</div>
                    {message.audioUrl && message.sender === "system" && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {}}
                            className="p-1 h-auto min-w-0"
                        >
                            <Volume2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>
                <div className="text-xs mt-1 text-gray-500">
                    {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </div>
            </div>

            {message.sender === "user" && (
                <Avatar className="w-8 h-8 bg-gray-100">
                    <AvatarFallback>
                        <User className="w-4 h-4 text-gray-600" />
                    </AvatarFallback>
                </Avatar>
            )}
        </div>
    )
}