import type { Product } from "../types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Star, MapPin } from "lucide-react"

interface ProductModalProps {
    product: Product | null
    isOpen: boolean
    onClose: () => void
}

export const ProductModal = ({ product, isOpen, onClose }: ProductModalProps) => {
    if (!product) return null

    const reviews = Array.isArray(product.reviews) ? product.reviews : []
    const reviewCount = reviews.length
    const avgRating =
        reviewCount > 0
            ? (
                  reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
                  reviewCount
              ).toFixed(1)
            : null

    const imageUrl =
        Array.isArray(product.images) && product.images.length > 0 && product.images[0]
            ? product.images[0]
            : "/placeholder.svg"

    const brand = product.brand || "Unknown"
    const currency = product.currency || ""
    const price = typeof product.price === "number" ? product.price : "-"
    const description = product.description || ""
    const category = product.category || "Uncategorized"
    const sku = product.sku || ""

    const handleClose = () => {
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
            <DialogContent className="max-w-4xl md:max-w-5xl lg:max-w-6xl">
                <DialogHeader>
                    <DialogTitle>{product.name || "Product"}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="aspect-square overflow-hidden rounded-lg">
                        <img
                            src={imageUrl}
                            alt={product.name || "Product image"}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="space-y-6">
                        <div className="text-sm text-gray-600">
                            <span className="font-medium">Brand:</span> {brand}
                        </div>

                        {avgRating && (
                            <div className="flex items-center gap-2">
                                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                <span className="font-medium">{avgRating}</span>
                                <span className="text-gray-600">({reviewCount} reviews)</span>
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <span className="text-4xl font-bold">
                                {currency} {price}
                            </span>
                        </div>

                        <p className="text-lg text-gray-700">{description}</p>

                        <div className="text-base text-gray-600">
                            <span className="font-medium">Category:</span> {category}
                        </div>

                        {product.location && (
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="w-5 h-5 text-blue-600" />
                                    <span className="font-medium text-blue-900">Store Location</span>
                                </div>
                                <div className="text-base text-blue-800">
                                    <div>Aisle: {product.location.aisle || "-"}</div>
                                    <div>Section: {product.location.section || "-"}</div>
                                    <div>Shelf: {product.location.shelf || "-"}</div>
                                </div>
                            </div>
                        )}

                        <div className="text-base text-gray-600">SKU: {sku}</div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
