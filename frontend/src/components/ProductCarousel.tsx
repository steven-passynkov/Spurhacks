import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Product } from "../types"
import { ProductCard } from "./ProductCard"

interface ProductCarouselProps {
    products: Product[]
    onProductClick: (product: Product) => void
    showBrand?: boolean
    showRatings?: boolean
    currency?: string
    compact?: boolean
}

export const ProductCarousel = ({
                                    products,
                                    onProductClick,
                                    showBrand = true,
                                    showRatings = true,
                                    currency = "USD",
                                    compact = false,
                                }: ProductCarouselProps) => {
    const [currentIndex, setCurrentIndex] = useState(0)
    const itemsPerView = compact ? 3 : 4
    const maxIndex = Math.max(0, products.length - itemsPerView)

    const goToPrevious = () => {
        setCurrentIndex((prev) => Math.max(0, prev - 1))
    }

    const goToNext = () => {
        setCurrentIndex((prev) => Math.min(maxIndex, prev + 1))
    }

    if (products.length <= itemsPerView) {
        return (
            <div
                className={`grid ${compact ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"} gap-6`}
            >
                {products.map((product) => (
                    <ProductCard
                        key={product.sku}
                        product={product}
                        onClick={onProductClick}
                        showBrand={showBrand}
                        showRatings={showRatings}
                        currency={currency}
                        compact={compact}
                    />
                ))}
            </div>
        )
    }

    return (
        <div className="relative">
            <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPrevious}
                        disabled={currentIndex === 0}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNext}
                        disabled={currentIndex >= maxIndex}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="text-sm text-gray-500">
                    {currentIndex + 1}-{Math.min(currentIndex + itemsPerView, products.length)} of {products.length}
                </div>
            </div>

            <div className="overflow-hidden">
                <div
                    className={`grid ${compact ? "grid-cols-3" : "grid-cols-4"} gap-6 transition-transform duration-300`}
                    style={{
                        transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
                        width: `${(products.length / itemsPerView) * 100}%`,
                    }}
                >
                    {products.map((product) => (
                        <ProductCard
                            key={product.sku}
                            product={product}
                            onClick={onProductClick}
                            showBrand={showBrand}
                            showRatings={showRatings}
                            currency={currency}
                            compact={compact}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
