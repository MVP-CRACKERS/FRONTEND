import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { CatalogProvider } from './CatalogContext';
import { CartProvider } from './CartContext';
import TopBar from './components/TopBar';
import Header from './components/Header';
import Home from './pages/Home';
import CartPage from './pages/CartPage';
import AdminPage from './pages/AdminPage';
import CheckoutModal from './components/CheckoutModal';

/** The storefront chrome is hidden on the admin panel. */
function Storefront() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <div className="min-h-screen font-sans">
      {!isAdmin && <TopBar />}
      {!isAdmin && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
      {!isAdmin && <CheckoutModal />}
    </div>
  );
}

function App() {
  return (
    <CatalogProvider>
      <CartProvider>
        <BrowserRouter>
          <Storefront />
        </BrowserRouter>
      </CartProvider>
    </CatalogProvider>
  );
}

export default App;
