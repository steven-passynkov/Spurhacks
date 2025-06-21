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
    // Calculate average rating and review count
    const reviewCount = product.reviews?.length ?? 0
    const avgRating =
        reviewCount > 0
            ? (
                  product.reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
                  reviewCount
              ).toFixed(1)
            : null

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

            {showRatings && avgRating && (
                <div className="flex items-center gap-1 mb-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm text-gray-600">
                        {avgRating} ({reviewCount})
                    </span>
                </div>
            )}

            <div className={`flex items-center ${compact ? "justify-between" : "gap-2"}`}>
                <span className="font-bold text-lg">
                    {currency} {product.price}
                </span>
                {!product.inStock && (
                    <Badge variant="secondary" className="ml-2 flex items-center">
                        Out of Stock
                    </Badge>
                )}
                {compact && (
                    <Button size="sm" variant="outline" className="h-8 px-2">
                        <ShoppingCart className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}