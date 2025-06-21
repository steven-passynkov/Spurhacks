import { useCallback } from "react"
import type { Product } from "../types"
import { mockProducts } from "../data/products"

const productCache: Record<string, Product> = {}

export function useProductCache() {
    const cacheProduct = useCallback((product: Product) => {
        if (product && product.sku) {
            productCache[product.sku] = product
        }
    }, [])

    const getProductBySku = useCallback((sku?: string) => {
        if (!sku) return null
        return productCache[sku] || mockProducts.find(p => p.sku === sku) || null
    }, [])

    return { cacheProduct, getProductBySku }
}
