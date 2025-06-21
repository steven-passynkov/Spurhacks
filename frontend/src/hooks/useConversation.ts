import { useState, useCallback } from "react"
import type { Message, Product } from "../types"

export function useConversation() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  const resetConversation = useCallback(() => {
    setMessages([])
    setInputValue("")
    setIsTyping(false)
  }, [])

  return {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isTyping,
    setIsTyping,
    resetConversation,
  }
}
