import { useParams, useNavigate } from "react-router-dom"
import { useEffect } from "react"
import { ProductModal } from "../components/ProductModal"
import { useAppContext } from "../context/AppContext"

function Product() {
  const { randomProducts } = useAppContext()
  const { sku, companyId } = useParams<{ sku: string; companyId: string }>()
  const navigate = useNavigate()

  const product = randomProducts.find((p) => p.sku === sku)

  useEffect(() => {
    if (!product) {
      if (companyId) {
        navigate(`/${companyId}`, { replace: true })
      } else {
        navigate("/", { replace: true })
      }
    }
  }, [product, companyId, navigate])

  const handleModalClose = () => {
    if (companyId) {
      navigate(`/${companyId}`)
    } else {
      navigate("/")
    }
  }

  if (!product) return null

  return (
    <ProductModal
      product={product}
      isOpen={!!product}
      onClose={handleModalClose}
    />
  )
}

export default Product
