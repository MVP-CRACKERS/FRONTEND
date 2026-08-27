import React from 'react';
import { Download, Zap, Loader2, Check } from 'lucide-react';
import { Fireworks } from '@fireworks-js/react';
import { downloadPriceList } from '../api/client';

// The hero product shot. WebP is 454 KB against 3.3 MB for the source
// PNG — worth it for the largest image on the page, which is also the
// first thing a customer waits for. The PNG fallback is only fetched by
// browsers without WebP support, which is almost nobody now.
import heroShotWebp from '../assets/dashboardmvp.webp';
import heroShotPng from '../assets/dashboardmvp-fallback.png';

export default function Hero() {
  const [pdfState, setPdfState] = React.useState('idle'); // idle | busy | done | error
  const [pdfError, setPdfError] = React.useState('');

  const handleDownloadPriceList = async () => {
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
    <section className="relative w-full h-[90vh] overflow-hidden flex items-center bg-primary-deep">
      
      {/* Background Layering */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        
        {/* 1. Base Yellow Background (Desktop) */}
        <div className="absolute inset-0 bg-[#FFB300] hidden md:block"></div>
        
        {/* 2. Green Polygon with Shadow (Desktop) */}
        <div className="absolute inset-0 hidden md:block" style={{ filter: 'drop-shadow(25px 0 35px rgba(0,0,0,0.6))' }}>
           <div 
             className="w-full h-full bg-primary-deep"
             style={{ clipPath: 'polygon(0 0, 68% 0, 52% 100%, 0 100%)' }}
           ></div>
        </div>

        {/* 3. Solid Green Base (Mobile) */}
        <div className="absolute inset-0 bg-primary-deep md:hidden"></div>

        {/* 4. Fireworks Overlay */}
        <Fireworks
          options={{ 
          opacity: 0.8, 
          particles: 150, 
          traceLength: 1, 
          traceSpeed: 10, 
          explosion: 15, 
          intensity: 15, 
          flickering: 80, 
          hue: { min: 15, max: 50 }, 
          brightness: { min: 70, max: 100 },
          acceleration: 1.1,
          friction: 0.95,
          gravity: 2
        }}
          style={{ top: 0, left: 0, width: '100%', height: '100%', position: 'absolute', background: 'transparent', zIndex: 1 }}
        />
      </div>

      <div className="max-w-[1280px] mx-auto px-4 w-full relative z-10 flex">
        {/* Left Content Stack */}
        <div className="w-full md:w-[55%] flex flex-col items-start gap-6">
          <div className="bg-accent-metallic/10 border border-accent-metallic text-accent-metallic text-sm font-bold px-4 py-1.5 rounded-full flex items-center gap-2 uppercase">
            <Zap className="w-4 h-4" />
            Direct from Sivakasi
          </div>

          {/* The badge used to read "Most valuable pyrotech"; that line is
              now the headline, so the badge carries a different claim
              rather than saying the same thing twice. */}
          <h1 className="text-red-500 drop-shadow-md font-heading font-extrabold text-3xl sm:text-4xl md:text-[34px] lg:text-[48px] xl:text-[60px] leading-[1.08] uppercase tracking-tight">
            MOST VALUABLE <br />
            <span className="text-accent-electric drop-shadow-[0_0_15px_rgba(57,255,20,0.5)]">PYROTECH</span>
          </h1>
          
          <p className="text-white/90 text-lg md:text-xl max-w-lg">
            Chennai's trusted cracker store — premium Sivakasi crackers delivered to your doorstep.<br />
            Min. order ₹1000 • 10% OFF on everything • FREE delivery • Cash on Delivery<br />
            <span className="text-sm opacity-80">(Delivery within Chennai only)</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto">
            <button 
              onClick={() => document.getElementById('price-list')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-accent-electric text-neutral-dark font-bold text-lg px-8 py-4 rounded-full flex justify-center items-center gap-2 w-full sm:w-auto hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] transition-all">
              SHOP NOW <Zap className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownloadPriceList}
              disabled={pdfState === 'busy'}
              className="bg-transparent border-2 border-accent-metallic text-accent-metallic font-bold text-lg px-8 py-4 rounded-full flex justify-center items-center gap-2 w-full sm:w-auto hover:bg-accent-metallic hover:text-neutral-dark disabled:opacity-70 disabled:cursor-wait transition-all"
            >
              {pdfState === 'busy' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> PREPARING PDF...
                </>
              ) : pdfState === 'done' ? (
                <>
                  <Check className="w-5 h-5" /> DOWNLOADED
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" /> DOWNLOAD PRICE LIST
                </>
              )}
            </button>
          </div>
          
          {pdfError && (
            <p className="text-red-300 text-sm font-semibold max-w-lg -mt-2">{pdfError}</p>
          )}

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 text-white/80 font-medium mt-6 text-center sm:text-left text-sm sm:text-base">
            <span className="text-accent-metallic font-bold">⭐ 4.9/5</span>
            <span>| 10,000+ Happy Customers | 25+ Years Trusted</span>
          </div>
        </div>
        
        {/* Right: the product shot.
            No white circle or border here — that framing suited a square
            logo, but this is a wide product pile and a circle would crop
            the boxes at both ends. A drop shadow grounds it instead. */}
        <div className="hidden md:flex w-[45%] justify-center items-center relative">
          <img
            src={heroShotWebp}
            onError={(e) => {
              // One retry with the PNG, then leave it alone — without the
              // guard a broken path would loop the error handler forever.
              if (e.currentTarget.dataset.fallback) return;
              e.currentTarget.dataset.fallback = '1';
              e.currentTarget.src = heroShotPng;
            }}
            alt="A selection of MVP Crackers Diwali fireworks — rockets, bombs, sparklers, ground chakkars and gift boxes"
            width="1200"
            height="800"
            /* This is the largest-contentful-paint element, so it loads
               eagerly and at high priority rather than being deferred. */
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="relative w-full max-w-[640px] h-auto object-contain drop-shadow-[0_18px_35px_rgba(0,0,0,0.45)] animate-zoom-in-out"
          />
        </div>
      </div>
    </section>
  );
}
