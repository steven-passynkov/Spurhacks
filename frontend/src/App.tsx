import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Home from "./pages/Home.tsx";
import Product from "./pages/Product.tsx";
import './App.css';
import { useChatWebSocket } from "./hooks/useChatWebSocket";

function RequireCompanyId({ children }: { children: React.ReactNode }) {
  const { companyId } = useParams();
  const { lastMessage } = useChatWebSocket(companyId || 'waggin-tails');
  if (!companyId) {
    return <Home noCompany />;
  }
  return (
    <AppProvider companyId={companyId} lastMessage={lastMessage}>
      {children}
    </AppProvider>
  );
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
  );
}

export default App;