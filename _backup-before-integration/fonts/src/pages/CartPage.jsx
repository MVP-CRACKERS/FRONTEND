import React from 'react';
import { useCart } from '../CartContext';
import { useCatalog } from '../CatalogContext';
import { Trash2, Minus, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CartPage() {
  // cartItems / estimate come from the live price list, and the estimate
  // uses the same percentages the backend applies.
  const { cartItems, updateQuantity, setQuantity, removeItem, cartTotal, estimate, openCheckout } =
    useCart();
  const { pricing } = useCatalog();

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-12 min-h-[60vh]">
      <h1 className="text-4xl font-heading text-neutral-dark mb-8">YOUR CART</h1>
      
      {cartItems.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-6 text-xl">Your cart is empty.</p>
          <Link to="/" className="bg-accent-metallic text-neutral-dark font-bold px-8 py-3 rounded hover:bg-yellow-400 transition-colors">
            START SHOPPING
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-2/3 flex flex-col gap-4">
            <div className="hidden md:grid grid-cols-12 gap-4 text-sm font-bold text-gray-500 uppercase border-b pb-2 px-4">
              <div className="col-span-6">Product</div>
              <div className="col-span-2 text-center">Price</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            {cartItems.map((item) => (
              <div key={item.id} className="flex flex-col md:grid md:grid-cols-12 gap-4 items-center bg-white p-4 border border-gray-100 rounded-lg shadow-sm">
                <div className="col-span-6 flex items-center gap-4">
                  <div className="w-20 h-20 bg-gray-50 rounded p-2 flex-shrink-0 border border-gray-200 overflow-hidden">
                    <img
                      src={item.image || '/MVP.png'}
                      alt={item.name}
                      className={`w-full h-full object-contain ${item.image ? '' : 'opacity-50'}`}
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-green-700">{item.name}</h3>
                    <p className="text-sm text-fuchsia-600">{item.tamilName}</p>
                    <p className="text-xs text-red-600 mt-1 font-bold">{item.content}</p>
                  </div>
                </div>
                <div className="w-full md:w-auto col-span-2 flex justify-between md:justify-center items-center font-bold text-gray-700">
                  <span className="md:hidden text-gray-500 font-normal">Price:</span>Rs. {item.price.toFixed(2)}</div>
                <div className="w-full md:w-auto col-span-2 flex justify-between md:justify-center items-center">
                  <span className="md:hidden text-gray-500 font-normal">Qty:</span>
                  <div className="flex items-center bg-white border border-gray-300 rounded h-10 w-28">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-full flex items-center justify-center text-gray-600 hover:bg-gray-100"><Minus className="w-4 h-4" /></button>
                    <input type="number" value={item.qty} onChange={(e) => setQuantity(item.id, e.target.value)} className="w-full h-full text-center text-sm font-bold border-x border-gray-300 appearance-none focus:outline-none" />
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-full flex items-center justify-center text-gray-600 hover:bg-gray-100"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="w-full md:w-auto col-span-2 flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0">
                  <span className="md:hidden text-gray-500 font-normal">Total:</span>
                  <span className="font-bold text-lg text-neutral-dark">Rs. {(item.price * item.qty).toFixed(2)}</span>
                  <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="lg:w-1/3">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 sticky top-24">
              <h2 className="text-xl font-heading font-bold mb-4 border-b pb-4">ORDER SUMMARY</h2>
              <div className="flex justify-between mb-3 text-gray-600">
                <span>Subtotal ({cartItems.length} items)</span>
                <span>Rs. {cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-3 text-green-600 font-bold">
                <span>Diwali Discount ({pricing.discountPercent}%)</span>
                <span>- Rs. {estimate.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-3 text-gray-600">
                <span>Estimated Tax ({pricing.taxPercent}%)</span>
                <span>Rs. {estimate.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-6 text-gray-600">
                <span>Delivery</span>
                <span>{estimate.delivery > 0 ? `Rs. ${estimate.delivery.toFixed(2)}` : 'FREE'}</span>
              </div>
              <div className="flex justify-between text-2xl font-bold border-t pt-4 mb-2">
                <span>Total</span>
                <span>Rs. {estimate.grandTotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-400 mb-6">
                Confirmed by our server when you place the order.
              </p>
              <button onClick={openCheckout} className="w-full bg-primary-deep text-white font-bold py-4 rounded hover:bg-green-800 transition-colors text-lg flex justify-center items-center gap-2">
                PROCEED TO CHECKOUT
              </button>
              <Link to="/" className="block text-center mt-4 text-green-700 font-bold hover:underline">Continue Shopping</Link>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
