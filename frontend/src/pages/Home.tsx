import { Outlet } from "react-router-dom"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { Product } from "../types"
import { ChatMessage } from "../components/ChatMessage"
import { WelcomeScreen } from "../components/WelcomeScreen"
import { ChatInput } from "../components/ChatInput"
import { useState } from "react"
import { ProductModal } from "../components/ProductModal"
import { useAppContext } from "../context/AppContext"

function Home({
    noCompany,
}: {
    noCompany?: boolean;
}) {
    const { config, randomProducts, loading, error, messages, sendMessage, resetConversation } = useAppContext();

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");

    const handleSendMessage = () => {
        if (!inputValue.trim()) return;
        sendMessage(inputValue);
        setInputValue("");
    };

    const handleProductClick = (product: Product) => {
        setSelectedProduct(product);
        setModalOpen(true);
    };

    const handleModalClose = () => {
        setModalOpen(false);
        setSelectedProduct(null);
    };

    const getThemeClasses = () => {
        const { primaryColor, backgroundColor, textColor } = config?.theme || {};
        return {
            background: backgroundColor === "white" ? "bg-white" : backgroundColor ? `bg-${backgroundColor}` : "bg-white",
            text: textColor ? `text-${textColor}` : "",
            primary: primaryColor ? `bg-${primaryColor}-600 hover:bg-${primaryColor}-700` : "",
            accent: primaryColor ? `text-${primaryColor}-600` : "",
        };
    };

    const themeClasses = getThemeClasses();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen w-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
            </div>
        );
    }

    if (noCompany || error) {
        return (
            <div className="flex items-center justify-center h-screen w-screen">
                <div className="bg-white p-8 rounded shadow text-center">
                    <div className="text-2xl font-bold mb-2">
                        {noCompany ? "Missing Company ID" : "Company Not Found"}
                    </div>
                    <div className="text-gray-600 mb-4">
                        {noCompany
                            ? "A company ID is required in the URL. Please access the app via a company-specific link (e.g. /acme/)."
                            : `The company does not exist or could not be loaded.`}
                    </div>
                    <div>Please check your link or contact support.</div>
                </div>
            </div>
        )
    }

    // messages from context, assumed to be Message[]
    const chatMessages = messages || [];

    return (
        <div className={`flex flex-col h-screen ${themeClasses.background} overflow-hidden`}>
            <Dialog open={!!noCompany}>
                <DialogContent className="sm:max-w-md">
                    <DialogTitle>Missing Company</DialogTitle>
                    <div className="text-center py-4">
                        <p className="mb-4">A company id is required in the URL.<br/>Please access the app via a
                            company-specific link (e.g. <code>/acme/</code>).</p>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="flex-1 w-full flex flex-col min-h-0">
                {chatMessages.length === 0 ? (
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
                                {chatMessages.map((message) => (
                                    <div key={message.id} className="space-y-3">
                                        <ChatMessage
                                            message={message}
                                            themeClasses={themeClasses}
                                        />
                                    </div>
                                ))}
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
                    themeClasses={themeClasses}
                    conversationLength={chatMessages.length}
                />
            </div>

            <ProductModal
                product={selectedProduct}
                isOpen={modalOpen}
                onClose={handleModalClose}
            />

            <Outlet/>
        </div>
    )
}

export default Home