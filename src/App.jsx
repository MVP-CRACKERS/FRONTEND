import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './CartContext';
import TopBar from './components/TopBar';
import Header from './components/Header';
import Home from './pages/Home';
import CartPage from './pages/CartPage';
import CheckoutModal from './components/CheckoutModal';

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <div className="min-h-screen font-sans">
          <TopBar />
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cart" element={<CartPage />} />
          </Routes>
          <CheckoutModal />
        </div>
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;
