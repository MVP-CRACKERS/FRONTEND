import React from 'react';
import { Download, Zap } from 'lucide-react';
import { Fireworks } from '@fireworks-js/react';

export default function Hero() {
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
        <div className="w-full md:w-[60%] flex flex-col items-start gap-6">
          <div className="bg-accent-metallic/10 border border-accent-metallic text-accent-metallic text-sm font-bold px-4 py-1.5 rounded-full flex items-center gap-2 uppercase">
            <Zap className="w-4 h-4" />
            Most valuable pyrotech
          </div>
          
          <h1 className="text-red-500 drop-shadow-md font-heading font-extrabold text-3xl sm:text-4xl md:text-[34px] lg:text-[48px] xl:text-[60px] leading-[1.08] uppercase tracking-tight">
            UNLEASH THE POWER <br />
            <span className="text-accent-electric drop-shadow-[0_0_15px_rgba(57,255,20,0.5)]">OF DIWALI</span>
          </h1>
          
          <p className="text-white/90 text-lg md:text-xl max-w-lg">
            Chennai's trusted cracker store — premium Sivakasi crackers delivered to your doorstep.<br />
            Min. order ₹1000 • 10% OFF above ₹3000 • FREE delivery above ₹5000<br />
            <span className="text-sm opacity-80">(Delivery within Chennai only)</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto">
            <button 
              onClick={() => document.getElementById('price-list')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-accent-electric text-neutral-dark font-bold text-lg px-8 py-4 rounded-full flex justify-center items-center gap-2 w-full sm:w-auto hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] transition-all">
              SHOP NOW <Zap className="w-5 h-5" />
            </button>
            <button className="bg-transparent border-2 border-accent-metallic text-accent-metallic font-bold text-lg px-8 py-4 rounded-full flex justify-center items-center gap-2 w-full sm:w-auto hover:bg-accent-metallic hover:text-neutral-dark transition-all">
              <Download className="w-5 h-5" /> DOWNLOAD PRICE LIST
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 text-white/80 font-medium mt-6 text-center sm:text-left text-sm sm:text-base">
            <span className="text-accent-metallic font-bold">⭐ 4.9/5</span>
            <span>| 10,000+ Happy Customers | 25+ Years Trusted</span>
          </div>
        </div>
        
        {/* Right Mascot placeholder */}
        <div className="hidden md:flex w-[40%] justify-center items-center relative">
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute w-96 h-96 bg-[#ffae00] rounded-full animate-ping opacity-40 mix-blend-screen"></div>
                <div className="absolute w-[400px] h-[400px] bg-red-600 rounded-full animate-ping opacity-20 mix-blend-screen" style={{ animationDelay: '200ms', animationDuration: '1.5s' }}></div>
                <img 
                  src="/MVP.png" 
                  alt="MVP Mascot" 
                  className="w-96 h-96 bg-white rounded-full object-contain p-8 shadow-[0_0_60px_rgba(57,255,20,0.4)] border-4 border-accent-electric animate-zoom-in-out" 
                />
            </div>
        </div>
      </div>
    </section>
  );
}
