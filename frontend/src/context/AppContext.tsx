import React, { createContext, useContext, useState, useEffect } from "react"
import { useCompanyConfig } from "../hooks/useCompanyConfig"
import { useRandomProducts } from "../hooks/useRandomProducts"
import type { Product, StoreConfig, Message } from "../types"

interface AppState {
  config: StoreConfig | null
  randomProducts: Product[]
  loading: boolean
  error: any
  messages: Message[]
  sendMessage: (content: string) => void
  resetConversation: () => void
}

const AppContext = createContext<AppState | undefined>(undefined)

export const AppProvider: React.FC<{ companyId: string; children: React.ReactNode }> = ({ companyId, children }) => {
  const { config, loading: loadingConfig, error } = useCompanyConfig(companyId)
  const { products: randomProducts, loading: loadingRandom } = useRandomProducts(companyId)

  const [appState, setAppState] = useState<Omit<AppState, "messages" | "sendMessage" | "resetConversation">>({
    config: null,
    randomProducts: [],
    loading: true,
    error: null,
  })

  const [messages, setMessages] = useState<Message[]>([])

  const sendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: "user",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newMessage])
  }

  const resetConversation = () => setMessages([])

  useEffect(() => {
    if (!loadingConfig && !loadingRandom) {
      setAppState({
        config,
        randomProducts,
        loading: false,
        error,
      })
    }
  }, [config, randomProducts, loadingConfig, loadingRandom, error])

  return (
    <AppContext.Provider value={{
      ...appState,
      messages,
      sendMessage,
      resetConversation,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = (): AppState => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider")
  }
  return context
}