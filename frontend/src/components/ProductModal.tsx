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
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl md:max-w-5xl lg:max-w-6xl">
                <DialogHeader>
                    <DialogTitle>{product.name}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="aspect-square overflow-hidden rounded-lg">
                        <img
                            src={product.images[0] || "/placeholder.svg"}
                            alt={product.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="space-y-6">
                        <div className="text-sm text-gray-600">
                            <span className="font-medium">Brand:</span> {product.brand}
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
                                {product.currency} {product.price}
                            </span>
                        </div>

                        <p className="text-lg text-gray-700">{product.description}</p>

                        <div className="text-base text-gray-600">
                            <span className="font-medium">Category:</span> {product.category}
                        </div>

                        {product.location && (
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="w-5 h-5 text-blue-600" />
                                    <span className="font-medium text-blue-900">Store Location</span>
                                </div>
                                <div className="text-base text-blue-800">
                                    <div>Aisle: {product.location.aisle}</div>
                                    <div>Section: {product.location.section}</div>
                                    <div>Shelf: {product.location.shelf}</div>
                                </div>
                            </div>
                        )}

                        <div className="text-base text-gray-600">SKU: {product.sku}</div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}