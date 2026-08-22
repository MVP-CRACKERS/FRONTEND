import React from 'react';
import { ShoppingCart, MessageCircle } from 'lucide-react';
import { useCart } from '../CartContext';
import { Link } from 'react-router-dom';

export default function Header() {
  const { cartCount } = useCart();
  return (
    <header className="bg-red-600 border-b-[3px] border-accent-electric sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1280px] mx-auto px-4 h-20 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <img src="/MVP.png" alt="MVP Crackers" className="h-16 w-auto" />
        </div>



        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <Link to="/cart" className="bg-accent-metallic text-neutral-dark flex items-center gap-2 px-4 py-2 rounded-full font-bold hover:bg-yellow-400 transition-colors">
            <ShoppingCart className="w-5 h-5" />
            <span className="bg-accent-electric text-neutral-dark px-2 py-0.5 rounded-full text-xs">{cartCount}</span>
          </Link>

          <a href="https://wa.me/919043621639" target="_blank" rel="noopener noreferrer" className="bg-primary-mid text-white flex items-center gap-2 px-5 py-2 rounded-full font-semibold hover:bg-green-700 transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="hidden lg:inline">WhatsApp</span>
          </a>
        </div>
      </div>
    </header>
  );
}
