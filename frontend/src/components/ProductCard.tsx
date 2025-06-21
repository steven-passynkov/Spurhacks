import type { Product } from "../types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, ShoppingCart } from "lucide-react"

interface ProductCardProps {
    product: Product
    onClick: (product: Product) => void
    showBrand?: boolean
    showRatings?: boolean
    currency?: string
    compact?: boolean
}

export const ProductCard = ({
                                product,
                                onClick,
                                showBrand = true,
                                showRatings = true,
                                currency = "USD",
                                compact = false,
                            }: ProductCardProps) => {
    return (
        <div
            onClick={() => onClick(product)}
            className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow"
        >
            <div className="aspect-square mb-3 overflow-hidden rounded-md">
                <img src={product.images[0] || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" />
            </div>

            <h3 className="font-semibold text-sm mb-2 line-clamp-2">{product.name}</h3>

            {showBrand && <div className="text-xs text-gray-500 mb-2">{product.brand}</div>}

            {showRatings && product.rating && (
                <div className="flex items-center gap-1 mb-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm text-gray-600">
            {product.rating} ({product.reviews})
          </span>
                </div>
            )}

            <div className={`flex items-center ${compact ? "justify-between" : "gap-2"}`}>
        <span className="font-bold text-lg">
          {currency} {product.price}
        </span>
                {compact && (
                    <Button size="sm" variant="outline" className="h-8 px-2">
                        <ShoppingCart className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {!product.inStock && (
                <Badge variant="secondary" className="mt-2">
                    Out of Stock
                </Badge>
            )}
        </div>
    )
}
