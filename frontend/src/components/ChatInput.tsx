
import type React from "react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"

interface ChatInputProps {
    value: string
    onChange: (value: string) => void
    onSend: () => void
    placeholder: string
    disabled: boolean
    themeClasses: {
        primary: string
    }
}

export const ChatInput = ({ value, onChange, onSend, placeholder, disabled, themeClasses }: ChatInputProps) => {
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            onSend()
        }
    }

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
            </div>
        </div>
    )
}