import { BrowserRouter, Routes, Route, useParams } from "react-router-dom"
import Home from "./pages/Home.tsx"
import Product from "./pages/Product.tsx"
import './App.css'

function RequireCompanyId({ children }: { children: React.ReactNode }) {
  const { companyId } = useParams()
  if (!companyId) {
    return <Home noCompany />
  }
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/:companyId" element={
          <RequireCompanyId>
            <Home />
          </RequireCompanyId>
        }>
          <Route path="product/:sku" element={<Product />} />
        </Route>
        <Route path="*" element={<Home noCompany />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
