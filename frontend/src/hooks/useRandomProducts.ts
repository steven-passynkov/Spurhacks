import { useEffect, useState } from "react"
import type { Product } from "../types"
import { useProductCache } from "./useProductCache"

export function useRandomProducts(companyId?: string) {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const { cacheProduct } = useProductCache()

    useEffect(() => {
        if (!companyId) {
            setProducts([])
            setLoading(false)
            setError(new Error("Missing companyId"))
            return
        }
        setLoading(true)
        fetch("https://m8m6pya9y5.execute-api.us-east-1.amazonaws.com/prod/search", {
            headers: {
                "company-id": companyId,
            },
        })
            .then((res) => res.json())
            .then((data: Product[]) => {
                data.forEach(cacheProduct)
                const shuffled = data.sort(() => 0.5 - Math.random())
                setProducts(shuffled.slice(0, 5))
                setLoading(false)
            })
            .catch((err) => {
                setError(err)
                setLoading(false)
            })
    }, [companyId, cacheProduct])

    return { products, loading, error }
}
