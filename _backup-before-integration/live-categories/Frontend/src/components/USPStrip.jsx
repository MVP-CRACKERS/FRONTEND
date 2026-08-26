import React from 'react';
import { Truck, ShieldCheck, Percent, Package } from 'lucide-react';

const USPS = [
  { icon: Truck, title: 'Free Delivery', desc: 'Tamil Nadu min ₹3000' },
  { icon: ShieldCheck, title: '100% Original', desc: 'Direct from factory' },
  { icon: Percent, title: '10% Discount', desc: 'On all products' },
  { icon: Package, title: 'Safe Packaging', desc: 'Licensed transport' }
];

export default function USPStrip() {
  return (
    <div className="bg-neutral-dark text-white py-6">
      <div className="max-w-[1280px] mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
        {USPS.map((usp, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="text-accent-electric">
              <usp.icon className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-sm md:text-base">{usp.title}</h4>
              <p className="text-xs md:text-sm text-neutral-400">{usp.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
