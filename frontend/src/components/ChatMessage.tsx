import type { Message } from "../types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Bot, User, Volume2 } from "lucide-react"
import { useAppContext } from "../context/AppContext"

interface ChatMessageProps {
    message?: Message
    themeClasses: {
        primary: string
        accent: string
    }
    isTyping?: boolean
}

export const ChatMessage = ({
                                message,
                                themeClasses,
                                isTyping = false,
                            }: ChatMessageProps) => {
    const {config} = useAppContext()

    const logoUrl = config?.branding?.logoUrl || null

    const isSystem = isTyping || (message && message.sender === "system")

    return (
        <div className={`flex gap-3 ${message?.sender === "user" ? "justify-end" : "justify-start"}`}>
            {isSystem && (
                <Avatar className="w-8 h-8 bg-blue-100">
                    <AvatarFallback>
                        {logoUrl
                            ? <img src={logoUrl} alt="Logo" className="w-6 h-6 object-contain"/>
                            : <Bot className={`w-4 h-4 ${themeClasses.accent}`}/>
                        }
                    </AvatarFallback>
                </Avatar>
            )}

            {isTyping ? (
                <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{animationDelay: "0.1s"}}
                        ></div>
                        <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{animationDelay: "0.2s"}}
                        ></div>
                    </div>
                </div>
            ) : message ? (
                <div
                    className={`max-w-[70%] rounded-lg p-3 bg-gray-100 text-gray-900`}
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="whitespace-pre-wrap flex-1">{message.content}</div>
                        {message.audioUrl && message.sender === "system" && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                }}
                                className="p-1 h-auto min-w-0"
                            >
                                <Volume2 className="w-4 h-4"/>
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
            ) : null}

            {message?.sender === "user" && (
                <Avatar className="w-8 h-8 bg-gray-100">
                    <AvatarFallback>
                        <User className="w-4 h-4 text-gray-600"/>
                    </AvatarFallback>
                </Avatar>
            )}
        </div>
    )
}