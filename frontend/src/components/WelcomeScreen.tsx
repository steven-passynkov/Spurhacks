import type { Product, StoreConfig } from "../types"
import { ProductCarousel } from "./ProductCarousel"
import { Bot } from "lucide-react"

interface WelcomeScreenProps {
    config: StoreConfig
    products: Product[]
    themeClasses: {
        accent: string
        text: string
    }
    onProductClick: (product: Product) => void
}

export const WelcomeScreen = ({ config, products, themeClasses, onProductClick }: WelcomeScreenProps) => {
    const logoUrl = config.branding?.logoUrl
    const title = config.welcome?.title || "Welcome!"
    const subtitle = config.welcome?.subtitle || ""
    const currency = config.products?.currency

    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-0 min-h-0">
            <div className="w-full h-full flex-1 flex flex-col overflow-auto min-h-0 p-6">
                <div className="mb-8">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-16 h-16 mx-auto mb-4 object-contain" />
                    ) : (
                        <Bot className={`w-16 h-16 ${themeClasses.accent} mx-auto mb-4`} />
                    )}
                    <h2 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>{title}</h2>
                    <p className="text-xl text-gray-600 mb-8">{subtitle}</p>
                </div>
                {products.length > 0 && (
                    <div className="w-full max-w-6xl mx-auto">
                        <ProductCarousel
                            products={products}
                            onProductClick={onProductClick}
                            currency={currency}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
