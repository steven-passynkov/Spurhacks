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
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-0 min-h-0">
            <div className="w-full h-full flex-1 flex flex-col overflow-auto min-h-0 p-6">
                <div className="mb-8">
                    {config.welcome.showBotIcon && <Bot className={`w-16 h-16 ${themeClasses.accent} mx-auto mb-4`} />}
                    <h2 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>{config.welcome.title}</h2>
                    <p className="text-xl text-gray-600 mb-8">{config.welcome.subtitle}</p>
                </div>
                {config.products.showOnHomepage && (
                    <div className="w-full max-w-6xl mx-auto">
                        <ProductCarousel
                            products={products.slice(0, config.products.homepageLimit)}
                            onProductClick={onProductClick}
                            showBrand={config.products.showBrand}
                            showRatings={config.products.showRatings}
                            currency={config.products.currency}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
