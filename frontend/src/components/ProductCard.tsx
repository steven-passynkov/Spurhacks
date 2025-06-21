import type { Product } from "../types"
import { Badge } from "@/components/ui/badge"

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
            className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow flex flex-col h-full"
        >
            <div className="aspect-square mb-3 overflow-hidden rounded-md">
                <img src={product.images[0] || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" />
            </div>

            <h3 className="font-semibold text-sm mb-2 line-clamp-2 min-h-[2.5em]">{product.name}</h3>

            {showBrand && <div className="text-xs text-gray-500 mb-2 min-h-[1.25em]">{product.brand}</div>}

            {showRatings && avgRating && (
                <div className="flex items-center gap-1 mb-2 min-h-[1.5em]">
                    <svg className="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                    <span className="text-sm text-gray-600">
                        {avgRating} ({reviewCount})
                    </span>
                </div>
            )}

            <div className={`flex items-center ${compact ? "justify-between" : "gap-2"} mt-auto`}>
                <span className="font-bold text-lg">
                    {currency} {product.price}
                </span>
                {!product.inStock && (
                    <Badge variant="secondary" className="ml-2 flex items-center">
                        Out of Stock
                    </Badge>
                )}
            </div>
        </div>
    )
}
