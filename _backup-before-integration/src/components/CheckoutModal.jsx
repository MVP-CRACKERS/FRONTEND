import React from 'react';
import { useCart } from '../CartContext';
import { getProductById, CATEGORIES } from '../data';
import { Minus, Plus, ShoppingBag, MapPin, ShieldCheck } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const OutlinedField = ({ label, type = 'text', value, readOnly, className = '' }) => (
  <div className={`relative ${className}`}>
    <label className="absolute -top-2.5 left-3 bg-white px-2 text-xs text-gray-500 font-semibold tracking-wide">
      {label}
    </label>
    <input 
      type={type} 
      className="w-full border-2 border-gray-200 rounded-lg p-3 text-gray-800 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-600/10 font-bold bg-gray-50/50" 
      readOnly={readOnly} 
      value={value} 
    />
  </div>
);

export default function CheckoutModal() {
  const { cart, updateQuantity, setQuantity, cartTotal, isCheckoutOpen, closeCheckout } = useCart();
  const [logoBase64, setLogoBase64] = React.useState(null);

  React.useEffect(() => {
    const img = new Image();
    img.src = '/MVP.png';
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_HEIGHT = 100;
      const scale = MAX_HEIGHT / img.height;
      canvas.height = MAX_HEIGHT;
      canvas.width = img.width * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setLogoBase64({ url: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height });
    };
  }, []);

  const [invoiceState, setInvoiceState] = React.useState(null);

  if (!isCheckoutOpen) return null;

  const cartItems = Object.entries(cart).map(([id, qty]) => ({
    ...getProductById(id),
    qty
  })).filter(item => item.name);

  const rate = cartTotal;
  const offerPrice = rate * 0.1; 
  const salesPrice = rate - offerPrice;
  const taxAmount = salesPrice * 0.05833;
  const finalTotal = salesPrice + taxAmount; // We'll just use salesPrice in the PDF to strictly match the screenshot format

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const phone = fd.get('phone') || 'Not provided';
    const name = fd.get('name') || 'Customer';
    const state = fd.get('state') || '';
    const city = fd.get('city') || 'Not provided';
    const address = fd.get('address') || 'Not provided';
    
    const orderNo = "2026MVP" + Math.floor(Math.random() * 10000);
    const dateStr = new Date().toLocaleDateString('en-GB'); // dd-mm-yyyy
    
    const doc = new jsPDF();
    
    // Global Border
    doc.setDrawColor(15, 61, 30); // Dark Green
    doc.setLineWidth(0.5);
    doc.rect(5, 5, 200, 287);

    // Header Logo & Titles
    if (logoBase64) {
       const imgHeight = 12;
       const imgWidth = (logoBase64.w / logoBase64.h) * imgHeight;
       doc.addImage(logoBase64.url, 'PNG', 18, 9, imgWidth, imgHeight);
    } else {
       doc.setFontSize(28);
       doc.setFont("helvetica", "bold");
       doc.setTextColor(15, 61, 30);
       doc.text("MVP CRACKERS", 20, 20);
    }
    
    doc.setFontSize(10);
    doc.setTextColor(218, 165, 32); // Gold
    doc.text("CHENNAI'S MVP FOR DIWALI • DIRECT FROM SIVAKASI", 20, 28);
    
    // Address Info
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");
    doc.text("24/67a saidapet road vadapalani chennai 600026", 20, 36);
    doc.text("+91-9043621639  |  manikandan621639@gmail.com", 20, 41);
    doc.setTextColor(30, 130, 60);
    doc.text("www.mvpcrackers.com", 20, 46);

    // Order Info (Right aligned)
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Order No: ", 170, 20, { align: 'right' });
    doc.text("Date: ", 170, 25, { align: 'right' });
    doc.text("Invoice #: ", 170, 30, { align: 'right' });
    
    doc.setFont("helvetica", "normal");
    doc.text(`${orderNo}`, 172, 20, { align: 'left' });
    doc.text(`${dateStr}`, 172, 25, { align: 'left' });
    doc.text(`INV/${orderNo.slice(4)}`, 172, 30, { align: 'left' });
    
    // Horizontal Line
    doc.setDrawColor(15, 61, 30);
    doc.setLineWidth(0.8);
    doc.line(15, 55, 195, 55);

    // Customer Box (Pale Yellow)
    doc.setFillColor(255, 250, 235);
    doc.rect(15, 62, 180, 35, 'F');
    doc.setFillColor(218, 165, 32);
    doc.rect(15, 62, 2, 35, 'F'); // Gold Left Border
    
    // Customer Details
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 61, 30); // Green labels
    doc.text("Name:", 22, 70);
    doc.text("Address:", 22, 77);
    doc.text("Delivery City:", 22, 84);
    doc.text("Mobile:", 22, 91);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`${name}`, 55, 70);
    doc.text(`${address.substring(0, 50)}${address.length > 50 ? '...' : ''}`, 55, 77);
    doc.text(`${city}${state ? `, ${state}` : ''}`, 55, 84);
    doc.text(`${phone}`, 55, 91);
    
    // Group Cart Items
    const groupedCart = {};
    Object.entries(cart).forEach(([id, qty]) => {
      if (qty > 0) {
        CATEGORIES.forEach(cat => {
          const item = cat.items.find(i => i.id === parseInt(id));
          if (item) {
            if (!groupedCart[cat.title]) groupedCart[cat.title] = [];
            groupedCart[cat.title].push({ ...item, qty });
          }
        });
      }
    });

    const tableColumn = ["S.NO", "PRODUCT", "QTY", "CONTENT", "SALES PRICE", "TOTAL"];
    const tableRows = [];
    
    let counter = 1;
    Object.entries(groupedCart).forEach(([catTitle, items]) => {
       tableRows.push([{ content: `⚡ ${catTitle}`, colSpan: 6, styles: { fillColor: [218, 165, 32], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'left' } }]);
       
       items.forEach(item => {
          const itemSalesPrice = (item.price * 0.9).toFixed(2);
          const itemTotal = (item.price * item.qty * 0.9).toFixed(2);
          tableRows.push([
            counter.toString(),
            item.name,
            item.qty.toString(),
            item.content,
            `Rs. ${itemSalesPrice}`,
            `Rs. ${itemTotal}`
          ]);
          counter++;
       });
    });
    
    tableRows.push([
      "", "GRAND TOTAL", "", "", 
      `Rs. ${(rate * 0.9).toFixed(2)}`, 
      `Rs. ${(salesPrice).toFixed(2)}`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 105,
      theme: 'grid',
      styles: { fontSize: 9, halign: 'center', textColor: [0, 0, 0], lineColor: [15, 61, 30], lineWidth: 0.1 },
      columnStyles: {
        1: { halign: 'left', cellWidth: 70, fontStyle: 'bold', textColor: [15, 61, 30] }, // Bold green products
        0: { textColor: [15, 61, 30], fontStyle: 'bold' },
        4: { textColor: [15, 61, 30], fontStyle: 'bold' },
        5: { textColor: [15, 61, 30], fontStyle: 'bold' }
      },
      headStyles: { fillColor: [15, 61, 30], textColor: [255, 255, 255], fontStyle: 'bold', textTransform: 'uppercase' },
      margin: { left: 15, right: 15 },
      didParseCell: function (data) {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
      didDrawPage: function (data) {
        const pageHeight = doc.internal.pageSize.height;
        
        // Watermark
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.1 }));
        doc.setFontSize(80);
        doc.setTextColor(15, 61, 30);
        doc.text("VV Crakers", 105, pageHeight / 2 + 20, { align: 'center', angle: 45 });
        doc.restoreGraphicsState();

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 61, 30);
        doc.text("THANK YOU FOR CHOOSING MVP CRACKERS — HAVE A SAFE & HAPPY DIWALI!", 105, pageHeight - 32, { align: 'center' });
        
        // Footer Box
        doc.setFillColor(15, 61, 30);
        doc.rect(15, pageHeight - 27, 180, 20, 'F');
        doc.setTextColor(218, 165, 32);
        doc.text("MVP CRACKERS", 105, pageHeight - 20, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(255, 255, 255);
        doc.text("Chennai's #1 Online Cracker Store | Direct from Sivakasi", 105, pageHeight - 15, { align: 'center' });
        doc.text("+91-9043621639 | WhatsApp Orders | manikandan621639@gmail.com", 105, pageHeight - 10, { align: 'center' });
      }
    });
    
    try {
      const pdfBlobUrl = doc.output('datauristring'); // better for iframe compatibility

      let text = `Hello MVP Crackers, here is my order invoice PDF.`;

      setInvoiceState({
        pdfUrl: pdfBlobUrl,
        waLink: `https://wa.me/919043621639?text=${encodeURIComponent(text)}`,
        doc: doc,
        orderNo: orderNo
      });

    } catch (error) {
      console.error("PDF Generation Error: ", error);
      alert("There was an error generating your invoice: " + error.message);
    }
  };

  if (invoiceState) {
    return (
      <div className="fixed inset-0 bg-neutral-dark/90 backdrop-blur-md z-50 flex justify-center items-center p-4 sm:p-6 transition-all duration-300">
         <div className="bg-white rounded-2xl w-full max-w-5xl h-[95vh] flex flex-col overflow-hidden animate-in zoom-in shadow-2xl">
            <div className="bg-gradient-to-r from-[#0F3D1E] to-[#1B7A3E] px-6 py-4 flex justify-between items-center shadow-md z-10">
               <h2 className="text-white text-xl sm:text-2xl font-bold tracking-wide">INVOICE PREVIEW</h2>
               <button onClick={() => { setInvoiceState(null); closeCheckout(); }} className="text-white/70 hover:text-white transition-colors text-3xl leading-none">
                 &times;
               </button>
            </div>
            <div className="flex-1 bg-gray-200 p-2 sm:p-4 overflow-hidden">
               <iframe src={invoiceState.pdfUrl} className="w-full h-full rounded shadow-inner border-0 bg-white" title="PDF Invoice" />
            </div>
            <div className="p-4 sm:p-6 bg-white border-t-2 border-gray-100 flex flex-col sm:flex-row justify-end gap-4">
               <button onClick={() => setInvoiceState(null)} className="px-8 py-4 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all uppercase tracking-wide">
                  BACK TO CHECKOUT
               </button>
               <button onClick={async () => {
                  try {
                    const doc = invoiceState.doc;
                    const pdfBlob = doc.output('blob');
                    const file = new File([pdfBlob], `MVP_Invoice_${invoiceState.orderNo}.pdf`, { type: 'application/pdf' });

                    // Try native OS sharing first (Attaches file directly to WhatsApp on Mobile/Supported Desktop)
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                      await navigator.share({
                        files: [file],
                        title: 'MVP Crackers Invoice',
                        text: 'Here is my order invoice for MVP Crackers.'
                      });
                    } else {
                      // Fallback for browsers that don't support native file sharing
                      alert("Direct file sharing is not supported on this browser. We will download the invoice and open WhatsApp instead.");
                      doc.save(`MVP_Invoice_${invoiceState.orderNo}.pdf`);
                      window.open(invoiceState.waLink, '_blank');
                    }
                  } catch (error) {
                    // User cancelled share or it failed
                    console.error("Sharing failed:", error);
                  }
               }} className="px-8 py-4 bg-[#25D366] text-white font-black rounded-xl hover:bg-green-600 transition-all uppercase tracking-widest text-lg sm:text-xl flex justify-center items-center shadow-md gap-3">
                  <span>ORDER IN WHATS APP</span>
               </button>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-neutral-dark/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 sm:p-6 transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F3D1E] to-[#1B7A3E] text-white px-6 py-4 flex justify-between items-center shadow-md z-10">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-accent-electric" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-wide">SECURE CHECKOUT</h2>
          </div>
          <button onClick={closeCheckout} type="button" className="text-white/70 hover:text-white transition-colors text-3xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 bg-gray-50/50">
          <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* LEFT COLUMN: Order Summary */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="flex items-center gap-2 border-b-2 border-gray-100 pb-3">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Order Summary</h3>
              </div>
              
              {/* Cart Items List */}
              <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {cartItems.map(item => (
                  <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <div className="text-red-700 font-bold uppercase text-sm">{item.name}</div>
                      <div className="text-gray-500 text-xs font-medium mt-1">Rs. {item.price.toFixed(2)} / item</div>
                    </div>
                    
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg h-9 w-24">
                        <button type="button" onClick={() => updateQuantity(item.id, -1)} className="w-8 h-full flex items-center justify-center text-gray-600 hover:text-red-600 hover:bg-gray-200 rounded-l-lg transition-colors"><Minus className="w-3 h-3" /></button>
                        <input type="number" value={item.qty} onChange={(e) => setQuantity(item.id, e.target.value)} className="w-full h-full text-center text-sm font-bold border-x border-gray-200 bg-transparent appearance-none focus:outline-none" />
                        <button type="button" onClick={() => updateQuantity(item.id, 1)} className="w-8 h-full flex items-center justify-center text-gray-600 hover:text-green-600 hover:bg-gray-200 rounded-r-lg transition-colors"><Plus className="w-3 h-3" /></button>
                      </div>
                      <div className="text-right text-gray-800 font-bold w-20">
                        Rs. {(item.price * item.qty).toFixed(0)}
                      </div>
                    </div>
                  </div>
                ))}
                {cartItems.length === 0 && (
                  <div className="text-center py-8 text-gray-500 font-medium">Your cart is empty.</div>
                )}
              </div>

              {/* Pricing Grid */}
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm mt-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                  <OutlinedField label="Rate" value={rate.toFixed(2)} readOnly />
                  <OutlinedField label="Offer Price (10%)" value={offerPrice.toFixed(2)} readOnly className="text-green-600" />
                  <OutlinedField label="Tax (GST)" value={taxAmount.toFixed(2)} readOnly />
                </div>
                <div className="mt-5 pt-5 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-sm">Grand Total</span>
                  <span className="text-3xl font-black text-[#d32f2f]">Rs. {finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Delivery & Details */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              <div className="flex items-center gap-2 border-b-2 border-gray-100 pb-3">
                <MapPin className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Delivery Details</h3>
              </div>

              {/* User Details Form */}
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="text" name="name" placeholder="Full Name" required className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-600/10 transition-all font-medium" />
                  <input type="tel" name="phone" placeholder="Mobile Number" required className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-600/10 transition-all font-medium" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="email" name="email" placeholder="Email Address (Optional)" className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-600/10 transition-all font-medium" />
                  <input type="text" name="state" placeholder="State" className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-600/10 transition-all font-medium" />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <input type="text" name="city" placeholder="Delivery City" required className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-600/10 transition-all font-medium" />
                </div>
                <textarea name="address" placeholder="Complete Delivery Address" required className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-600/10 transition-all font-medium min-h-[100px] resize-y" />
                
                {/* Checkboxes */}
                <div className="flex flex-col gap-3 mt-2 bg-gray-50 p-4 rounded-lg">
                  <label className="flex items-center gap-3 text-sm font-semibold text-gray-700 cursor-pointer group">
                    <input type="checkbox" className="w-5 h-5 border-2 border-gray-300 rounded text-green-600 focus:ring-green-600 transition-all cursor-pointer" />
                    <span className="group-hover:text-green-700 transition-colors">Include Whitebag Charge?</span>
                  </label>
                  <label className="flex items-center gap-3 text-sm font-semibold text-gray-700 cursor-pointer group">
                    <input type="checkbox" required className="w-5 h-5 border-2 border-gray-300 rounded text-green-600 focus:ring-green-600 transition-all cursor-pointer" />
                    <span className="group-hover:text-green-700 transition-colors">I confirm this order details</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 mt-2">
                <button type="button" onClick={closeCheckout} className="w-1/3 px-6 py-4 bg-white border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all uppercase tracking-wide">
                  Cancel
                </button>
                <button type="submit" className="w-2/3 px-6 py-4 bg-[#113e21] border-[4px] border-[#0066cc] text-white font-black rounded-2xl hover:bg-green-900 transition-all uppercase tracking-widest text-xl flex justify-center items-center shadow-md">
                  CONFIRM ORDER
                </button>
              </div>

            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
