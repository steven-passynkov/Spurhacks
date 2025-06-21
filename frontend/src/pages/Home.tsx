import { useNavigate, Outlet } from "react-router-dom"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { Message, Product } from "../types"
import { mockProducts } from "../data/products"
import { mockResponsesWithProducts, mockTextOnlyResponses } from "../data/responses"
import { ProductCarousel } from "../components/ProductCarousel"
import { ChatMessage } from "../components/ChatMessage"
import { WelcomeScreen } from "../components/WelcomeScreen"
import { ChatInput } from "../components/ChatInput"
import storeConfig from "../config/store-config.json"
import { useInactivityTimer } from "../hooks/useInactivityTimer"
import { useConversation } from "../hooks/useConversation"

function Home() {
  const {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isTyping,
    setIsTyping,
    resetConversation,
  } = useConversation()
  const navigate = useNavigate()

  const {
    showInactivityModal,
    countdownTimer,
    resetChat,
    recordActivity,
    cancelCountdown
  } = useInactivityTimer({
    onReset: resetConversation,
    shouldCount: messages.length > 0
  })

  // Record activity when messages or input changes
  // (no need for useEffect, global listeners in inactivity hook handle this)

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    recordActivity()
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentQuery = inputValue
    setInputValue("")
    setIsTyping(true)

    setTimeout(() => {
      const shouldShowProducts = Math.random() > 0.5
      let response
      if (shouldShowProducts) {
        const numProducts = Math.floor(Math.random() * 3) + 1
        const randomProducts = [...mockProducts]
          .sort(() => Math.random() - 0.5)
          .slice(0, numProducts)
        response = {
          text: "Here are some products you might like:",
          audioUrl: "/mock-audio-default.mp3",
          products: randomProducts,
        }
      } else {
        response = mockTextOnlyResponses[Math.floor(Math.random() * mockTextOnlyResponses.length)]
      }

      const systemMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.text,
        sender: "system",
        timestamp: new Date(),
        audioUrl: response.audioUrl,
        products: response.products || [],
      }

      setMessages((prev) => [...prev, systemMessage])
      setIsTyping(false)
      recordActivity()
    }, 1500)
  }

  const handleProductClick = (product: Product) => {
    recordActivity()
    navigate(`/product/${product.sku}`)
  }

  const getThemeClasses = () => {
    const { primaryColor, backgroundColor, textColor } = storeConfig.theme
    return {
      background: backgroundColor === "white" ? "bg-white" : `bg-${backgroundColor}`,
      text: `text-${textColor}`,
      primary: `bg-${primaryColor}-600 hover:bg-${primaryColor}-700`,
      accent: `text-${primaryColor}-600`,
    }
  }

  const themeClasses = getThemeClasses()

  return (
    <div className={`flex flex-col h-screen ${themeClasses.background} overflow-hidden`}>
      <div className="flex-1 w-full flex flex-col min-h-0">
        {messages.length === 0 ? (
          <WelcomeScreen
            config={storeConfig}
            products={mockProducts}
            themeClasses={themeClasses}
            onProductClick={handleProductClick}
          />
        ) : (
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full w-full p-6">
              <div className="space-y-4 max-w-4xl mx-auto pb-4">
                {messages.map((message) => (
                  <div key={message.id} className="space-y-3">
                    <ChatMessage
                      message={message}
                      themeClasses={themeClasses}
                    />
                    {message.products && message.products.length > 0 && (
                      <div className="ml-11">
                        <ProductCarousel
                          products={message.products}
                          onProductClick={handleProductClick}
                          showBrand={storeConfig.products.showBrand}
                          showRatings={storeConfig.products.showRatings}
                          currency={storeConfig.products.currency}
                          compact={true}
                        />
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="w-8 h-8 bg-blue-100">
                      <AvatarFallback>
                        <Bot className={`w-4 h-4 ${themeClasses.accent}`} />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          onReset={resetConversation}
          placeholder={storeConfig.chat.placeholder}
          disabled={isTyping}
          themeClasses={themeClasses}
          conversationLength={messages.length}
        />
      </div>

      <Outlet />

      <Dialog open={showInactivityModal} onOpenChange={(open) => !open && cancelCountdown()}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Session Timeout</DialogTitle>
          <div className="text-center py-4">
            <p className="mb-4">No activity detected for a minute.</p>
            <p className="text-lg font-semibold">Chat will reset in {countdownTimer} seconds</p>
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={resetChat}
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                Reset Now
              </button>
              <button
                onClick={cancelCountdown}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Home