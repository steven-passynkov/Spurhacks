import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ProductModal } from "../components/ProductModal"
import { mockProducts } from "../data/products"
import type { Product } from "../types"

function Product() {
  const { sku } = useParams<{ sku: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)

  useEffect(() => {
    if (sku) {
      const foundProduct = mockProducts.find((p) => p.sku === sku)
      setProduct(foundProduct || null)
    }
  }, [sku])

  const handleModalClose = () => {
    navigate("/")
  }

  // If product not found, redirect to home
  useEffect(() => {
    if (sku && !mockProducts.some(p => p.sku === sku)) {
      navigate("/")
    }
  }, [sku, navigate])

  // Render just the modal without any container div
  return (
    <ProductModal 
      product={product} 
      isOpen={!!product} 
      onClose={handleModalClose} 
    />
  )
}

export default Product
