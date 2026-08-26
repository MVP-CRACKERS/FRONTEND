import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react';
import CheckoutModal from './CheckoutModal';
import { useCart } from '../CartContext';
import { CATEGORIES } from '../data';



export default function PriceList() {
  const [openSections, setOpenSections] = useState(() => CATEGORIES.reduce((acc, cat) => ({...acc, [cat.id]: true}), {}));

  const { cart, updateQuantity, setQuantity, cartTotal, openCheckout } = useCart();
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const toggleSection = (id) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };



  
  return (
    <section id="price-list" className="py-12 bg-white">
      <div className="max-w-[1600px] w-[95%] mx-auto px-4 md:px-8">
        
        {/* Section Heading */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-heading text-neutral-dark inline-block relative uppercase tracking-wide">
            Price List
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-accent-metallic rounded-full"></div>
          </h2>
        </div>

        <div className="bg-white shadow-xl rounded-xl border border-gray-100 overflow-hidden">
          {CATEGORIES.map((category) => (
            <div key={category.id} className="border-b border-gray-200 last:border-b-0">
              
              {/* Category Header */}
              <button 
                onClick={() => toggleSection(category.id)}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors">
                <div className="flex-1 text-center">
                  <h3 className="text-red-600 font-bold text-2xl underline decoration-red-600/30 underline-offset-4 uppercase">
                    {category.title}
                  </h3>
                </div>
                <div className="text-gray-400">
                  {openSections[category.id] ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                </div>
              </button>

              {/* Category Content */}
              {openSections[category.id] && (
                <div className="p-4 pt-0">
                  
                  {/* Table Header (Desktop) */}
                  <div className="hidden md:grid md:grid-cols-12 gap-4 text-green-700 font-bold text-lg mb-6 border-b-2 pb-4 px-4 items-center">
                    <div className="col-span-5 lg:col-span-6">Name</div>
                    <div className="col-span-2 lg:col-span-1 text-center text-red-600">Content</div>
                    <div className="col-span-2 lg:col-span-2 text-center">Sales Price</div>
                    <div className="col-span-2 lg:col-span-2 text-center">Quantity</div>
                    <div className="col-span-1 lg:col-span-1 text-center">Image</div>
                  </div>

                  {/* Product Rows */}
                  <div className="flex flex-col gap-4 md:gap-0">
                    {category.items.map((item) => {
                      const qty = cart[item.id] || 0;
                      const subtotal = qty * item.price;

                      return (
                        <div key={item.id} className="flex flex-col md:grid md:grid-cols-12 gap-4 items-center border border-gray-100 md:border-0 md:border-b md:last:border-b-0 py-6 px-4 hover:bg-gray-50 transition-colors rounded-lg md:rounded-none">
                          
                          {/* Name & ID */}
                          <div className="col-span-5 lg:col-span-6 w-full mb-3 md:mb-0">
                            <div className="flex items-start gap-2">
                              <span className="text-red-600 font-bold text-xl">{item.id} .</span>
                              <div>
                                <h4 className="text-green-700 font-bold text-base md:text-lg leading-tight uppercase">
                                  {item.name}
                                </h4>
                                <p className="text-fuchsia-600 text-sm mt-2 font-medium">{item.tamilName}</p>
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="col-span-2 lg:col-span-1 w-full flex justify-between md:justify-center mb-2 md:mb-0">
                            <span className="md:hidden text-gray-500 text-base font-bold">Content:</span>
                            <span className="text-red-600 font-bold text-base md:text-lg uppercase">{item.content}</span>
                          </div>

                          {/* Sales Price */}
                          <div className="col-span-2 lg:col-span-2 w-full flex justify-between md:justify-center mb-4 md:mb-0">
                            <span className="md:hidden text-gray-500 text-base font-bold">Price:</span>
                            <span className="text-green-700 font-bold text-base md:text-lg">Rs. {item.price.toFixed(2)}</span>
                          </div>

                          {/* Quantity Controls & Subtotal */}
                          <div className="col-span-2 lg:col-span-2 w-full flex flex-col items-center justify-center mb-4 md:mb-0">
                            <div className="flex items-center bg-white border border-gray-300 rounded-full h-10">
                              <button 
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-l-full transition-colors"
                              >
                                <Minus className="w-5 h-5" />
                              </button>
                              <input 
                                type="number" 
                                value={qty}
                                onChange={(e) => setQuantity(item.id, e.target.value)}
                                className="w-16 h-full text-center text-base md:text-lg font-bold border-x border-gray-300 focus:outline-none appearance-none"
                              />
                              <button 
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-r-full transition-colors"
                              >
                                <Plus className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="text-fuchsia-600 font-bold text-sm md:text-base mt-2">
                              Rs.{subtotal.toFixed(2)}
                            </div>
                          </div>

                          {/* Image & Video Action */}
                          <div className="col-span-1 lg:col-span-1 w-full flex justify-center md:justify-center items-center gap-3">
                            <div className="w-20 h-20 bg-white border border-gray-200 flex items-center justify-center rounded p-1 shadow-sm overflow-hidden">
                              <img src={item.image || "/MVP.png"} alt={item.name} className={`w-full h-full object-contain ${item.image ? '' : 'opacity-50'}`} />
                            </div>

                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Checkout Modal */}
      
    </section>
  );
}
