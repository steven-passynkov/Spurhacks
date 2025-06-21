import { useNavigate, Outlet, useParams } from "react-router-dom"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { Message, Product } from "../types"
import { mockProducts } from "../data/products"
import { mockTextOnlyResponses } from "../data/responses"
import { ProductCarousel } from "../components/ProductCarousel"
import { ChatMessage } from "../components/ChatMessage"
import { WelcomeScreen } from "../components/WelcomeScreen"
import { ChatInput } from "../components/ChatInput"
import { useInactivityTimer } from "../hooks/useInactivityTimer"
import { useConversation } from "../hooks/useConversation"
import { useCompanyConfig } from "../hooks/useCompanyConfig"
import { useRandomProducts } from "../hooks/useRandomProducts"
import { useState } from "react"
import { ProductModal } from "../components/ProductModal"

function Home({ noCompany }: { noCompany?: boolean }) {
  const { companyId } = useParams()
  const { config, loading, error } = useCompanyConfig(companyId)
  const { products: randomProducts, loading: loadingRandom } = useRandomProducts(companyId)

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

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

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
    setSelectedProduct(product)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setSelectedProduct(null)
  }

  const getThemeClasses = () => {
    const { primaryColor, backgroundColor, textColor } = config?.theme || {}
    return {
      background: backgroundColor === "white" ? "bg-white" : backgroundColor ? `bg-${backgroundColor}` : "bg-white",
      text: textColor ? `text-${textColor}` : "",
      primary: primaryColor ? `bg-${primaryColor}-600 hover:bg-${primaryColor}-700` : "",
      accent: primaryColor ? `text-${primaryColor}-600` : "",
    }
  }

  const themeClasses = getThemeClasses()

  if (loading || (messages.length === 0 && loadingRandom)) {
    return (
      <div className="flex items-center justify-center h-screen w-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen w-screen">
        <div className="bg-white p-8 rounded shadow text-center">
          <div className="text-2xl font-bold mb-2">Company Not Found</div>
          <div className="text-gray-600 mb-4">
            The company <span className="font-mono">{companyId}</span> does not exist or could not be loaded.
          </div>
          <div>
            Please check your link or contact support.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-screen ${themeClasses.background} overflow-hidden`}>
      <Dialog open={!!noCompany}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Missing Company</DialogTitle>
          <div className="text-center py-4">
            <p className="mb-4">A company id is required in the URL.<br />Please access the app via a company-specific link (e.g. <code>/acme/</code>).</p>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex-1 w-full flex flex-col min-h-0">
        {messages.length === 0 ? (
          <WelcomeScreen
            config={config}
            products={randomProducts}
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
                          currency={config?.products?.currency}
                          compact={true}
                        />
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <ChatMessage isTyping themeClasses={themeClasses} />
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
          placeholder={config?.chat?.placeholder}
          disabled={isTyping}
          themeClasses={themeClasses}
          conversationLength={messages.length}
        />
      </div>

      <ProductModal
        product={selectedProduct}
        isOpen={modalOpen}
        onClose={handleModalClose}
      />

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