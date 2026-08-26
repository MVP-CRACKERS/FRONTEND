import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Minus, Plus, Loader2, AlertCircle, Download, Check } from 'lucide-react';
import { useCart } from '../CartContext';
import { useCatalog } from '../CatalogContext';
import { downloadPriceList } from '../api/client';



export default function PriceList() {
  // Live price list from MongoDB (falls back to the offline copy).
  const { categories: CATEGORIES, loading, loaded, isEmpty, error, apiProblem, refresh } = useCatalog();

  const [openSections, setOpenSections] = useState({});

  const { cart, updateQuantity, setQuantity } = useCart();

  // Every category starts expanded, including ones that arrive later.
  useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const cat of CATEGORIES) {
        if (next[cat.id] === undefined) {
          next[cat.id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [CATEGORIES]);

  const toggleSection = (id) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // A card in "Shop by Category" asks us to reveal that section.
  useEffect(() => {
    const onOpenCategory = (e) => {
      const id = e.detail?.categoryId;
      if (!id) return;
      setOpenSections((prev) => ({ ...prev, [id]: true }));
      // Wait for the section to expand before scrolling to it.
      requestAnimationFrame(() => {
        document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };
    window.addEventListener('mvp:open-category', onOpenCategory);
    return () => window.removeEventListener('mvp:open-category', onOpenCategory);
  }, []);

  // Same PDF the hero offers, repeated here where people actually browse.
  const [pdfState, setPdfState] = useState('idle');
  const [pdfError, setPdfError] = useState('');

  const handleDownloadPdf = async () => {
    if (pdfState === 'busy') return;
    setPdfState('busy');
    setPdfError('');
    try {
      await downloadPriceList();
      setPdfState('done');
      setTimeout(() => setPdfState('idle'), 4000);
    } catch (err) {
      setPdfError(err.message || 'The price list could not be downloaded.');
      setPdfState('error');
      setTimeout(() => setPdfState('idle'), 6000);
    }
  };



  
  return (
    <section id="price-list" className="py-12 bg-white">
      <div className="max-w-[1600px] w-[95%] mx-auto px-4 md:px-8">
        
        {/* Section Heading */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-neutral-dark inline-block relative uppercase tracking-tight">
            Price List
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-accent-metallic rounded-full"></div>
          </h2>

          <div className="mt-8 flex flex-col items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={pdfState === 'busy' || CATEGORIES.length === 0}
              className="bg-primary-deep text-white font-bold px-6 py-3 rounded-full inline-flex items-center gap-2 hover:bg-green-800 disabled:opacity-60 disabled:cursor-wait transition-colors"
            >
              {pdfState === 'busy' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Preparing PDF...
                </>
              ) : pdfState === 'done' ? (
                <>
                  <Check className="w-5 h-5" /> Downloaded
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" /> Download Full Price List (PDF)
                </>
              )}
            </button>
            <p className="text-xs text-gray-500">
              Every item with photos and today's prices — easy to print or send on WhatsApp.
            </p>
            {pdfError && <p className="text-sm text-red-600 font-semibold">{pdfError}</p>}
          </div>
        </div>

        {/* Loading — nothing is rendered from code, so wait for the API */}
        {loading && CATEGORIES.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="font-medium">Loading the latest prices...</span>
          </div>
        )}

        {/* The API could not be reached */}
        {!loading && error && (
          <div className="bg-amber-50 border-2 border-amber-200 text-amber-900 rounded-xl p-6 flex flex-col items-center text-center gap-4">
            <AlertCircle className="w-10 h-10" />
            <div>
              <p className="font-bold text-lg">We could not load the price list</p>
              <p className="text-sm mt-2 max-w-xl leading-relaxed">
                {apiProblem
                  ? apiProblem.message
                  : 'Our price list could not be reached just now. Prices come live from our server, so we would rather show you nothing than show you the wrong price. Please try again in a moment.'}
              </p>
            </div>
            <button
              onClick={refresh}
              className="bg-amber-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Connected, but there is genuinely nothing to sell yet */}
        {!loading && !error && isEmpty && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-xl font-bold text-gray-700">Our price list is being updated</p>
            <p className="text-gray-500 mt-2">
              No crackers are listed at the moment. Please check back shortly, or message us on
              WhatsApp and we will help you straight away.
            </p>
          </div>
        )}

        {CATEGORIES.length > 0 && (
        <div className="bg-white shadow-xl rounded-xl border border-gray-100 overflow-hidden">
          {CATEGORIES.map((category) => (
            <div
              key={category.id}
              id={`cat-${category.id}`}
              className="border-b border-gray-200 last:border-b-0 scroll-mt-24"
            >
              
              {/* Category Header */}
              <button 
                onClick={() => toggleSection(category.id)}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors">
                <div className="flex-1 text-center">
                  <h3 className="text-red-600 font-bold text-2xl underline decoration-red-600/30 underline-offset-4 uppercase">
                    {category.title}
                  </h3>
                  <p className="text-gray-400 text-sm mt-1 font-medium">
                    {category.items.length} {category.items.length === 1 ? 'product' : 'products'}
                  </p>
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
                      const subtotal = qty * (item.offerPrice ?? item.price);
                      // Two different reasons a product cannot be bought —
                      // say which, so "out of stock" never means "an admin
                      // flag is off".
                      const outOfStock = item.stock === 0;
                      const unavailable = item.isAvailable === false;
                      const soldOut = outOfStock || unavailable;
                      const onOffer =
                        item.offerPrice !== null &&
                        item.offerPrice !== undefined &&
                        item.offerPrice < item.price;
                      const unitPrice = onOffer ? item.offerPrice : item.price;

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
                                {onOffer && (
                                  <span className="inline-block mt-2 mr-2 bg-green-100 text-green-800 text-xs font-bold uppercase tracking-wide px-2 py-1 rounded">
                                    Offer
                                  </span>
                                )}
                                {soldOut && (
                                  <span className="inline-block mt-2 bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wide px-2 py-1 rounded">
                                    {outOfStock ? 'Out of stock' : 'Currently unavailable'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="col-span-2 lg:col-span-1 w-full flex justify-between md:justify-center mb-2 md:mb-0">
                            <span className="md:hidden text-gray-500 text-base font-bold">Content:</span>
                            <span className="text-red-600 font-bold text-base md:text-lg uppercase">{item.content}</span>
                          </div>

                          {/* Sales Price */}
                          <div className="col-span-2 lg:col-span-2 w-full flex justify-between md:justify-center md:flex-col md:items-center mb-4 md:mb-0">
                            <span className="md:hidden text-gray-500 text-base font-bold">Price:</span>
                            {onOffer ? (
                              <>
                                <span className="text-green-700 font-bold text-base md:text-lg">
                                  Rs. {item.offerPrice.toFixed(2)}
                                </span>
                                <span className="text-gray-400 text-sm line-through md:mt-0.5 ml-2 md:ml-0">
                                  Rs. {item.price.toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <span className="text-green-700 font-bold text-base md:text-lg">
                                Rs. {item.price.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Quantity Controls & Subtotal */}
                          <div className="col-span-2 lg:col-span-2 w-full flex flex-col items-center justify-center mb-4 md:mb-0">
                            <div className="flex items-center bg-white border border-gray-300 rounded-full h-10">
                              <button 
                                onClick={() => updateQuantity(item.id, -1)}
                                disabled={soldOut}
                                className="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-l-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Minus className="w-5 h-5" />
                              </button>
                              <input 
                                type="number" 
                                value={qty}
                                disabled={soldOut}
                                onChange={(e) => setQuantity(item.id, e.target.value)}
                                className="w-16 h-full text-center text-base md:text-lg font-bold border-x border-gray-300 focus:outline-none appearance-none disabled:bg-gray-50 disabled:text-gray-400"
                              />
                              <button 
                                onClick={() => updateQuantity(item.id, 1)}
                                disabled={soldOut}
                                className="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-r-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
        )}
      </div>
    </section>
  );
}
