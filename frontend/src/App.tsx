import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Home from "./pages/Home.tsx"
import Product from "./pages/Product.tsx"
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />}>
          <Route path="product/:sku" element={<Product />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
