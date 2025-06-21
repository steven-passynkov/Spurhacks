import { useState, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot } from "lucide-react"

import type { Message, Product } from "./types"
import { mockProducts } from "./data/products"
import { mockResponsesWithProducts, mockTextOnlyResponses } from "./data/responses"
import { ProductCarousel } from "./components/ProductCarousel"
import { ChatMessage } from "./components/ChatMessage"
import { ProductModal } from "./components/ProductModal"
import { WelcomeScreen } from "./components/WelcomeScreen"
import { ChatInput } from "./components/ChatInput"
import storeConfig from "./config/store-config.json"
import './App.css'

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const sku = urlParams.get("sku")
    if (sku) {
      const product = mockProducts.find((p) => p.sku === sku)
      if (product) {
        setSelectedProduct(product)
        setIsModalOpen(true)
      }
    }
  }, [])

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

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
      // Randomly decide whether to show products (50% chance)
      const shouldShowProducts = Math.random() > 0.5

      let response
      if (shouldShowProducts) {
        // Select 1-3 random products
        const numProducts = Math.floor(Math.random() * 3) + 1
        const randomProducts = [...mockProducts]
          .sort(() => Math.random() - 0.5)
          .slice(0, numProducts)

        const productResponse = {
          text: "Here are some products you might like:",
          audioUrl: "/mock-audio-default.mp3",
          products: randomProducts,
        }
        response = productResponse
      } else {
        const textResponse = mockTextOnlyResponses[Math.floor(Math.random() * mockTextOnlyResponses.length)]
        response = textResponse
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
    }, 1500)
  }

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
    window.history.pushState({}, "", `?sku=${product.sku}`)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedProduct(null)
    window.history.pushState({}, "", window.location.pathname)
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
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4 max-w-4xl mx-auto">
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
          )}

          <ChatInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSendMessage}
              placeholder={storeConfig.chat.placeholder}
              disabled={isTyping}
              themeClasses={themeClasses}
          />
        </div>

        <ProductModal product={selectedProduct} isOpen={isModalOpen} onClose={handleModalClose} />
      </div>
  )
}

export default App