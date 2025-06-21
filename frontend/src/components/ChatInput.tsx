import type React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, RotateCcw } from "lucide-react"

interface ChatInputProps {
    value: string
    onChange: (value: string) => void
    onSend: () => void
    onReset?: () => void
    placeholder: string
    disabled: boolean
    themeClasses: {
        primary: string
    }
    conversationLength?: number
}

export const ChatInput = ({
    value,
    onChange,
    onSend,
    onReset,
    placeholder,
    disabled,
    themeClasses,
    conversationLength = 0
}: ChatInputProps) => {
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            onSend()
        }
    }

    const canReset = !!onReset && conversationLength > 0

    return (
        <div className="border-t border-gray-200 p-4 flex-shrink-0">
            <div className="flex gap-2 max-w-4xl mx-auto">
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={placeholder}
                    className="flex-1"
                    disabled={disabled}
                />
                <Button onClick={onSend} disabled={!value.trim() || disabled} size="icon" className={themeClasses.primary}>
                    <Send className="w-4 h-4" />
                </Button>
                {onReset && canReset && (
                    <Button
                        onClick={onReset}
                        disabled={disabled}
                        variant="secondary"
                        size="icon"
                        aria-label="Reset chat"
                        className="flex items-center justify-center"
                    >
                        <RotateCcw className="w-6 h-6" />
                    </Button>
                )}
            </div>
        </div>
    )
}
