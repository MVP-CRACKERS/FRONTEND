import React from 'react';
import { Sparkles } from 'lucide-react';

export default function TopBar() {
  return (
    <div className="bg-primary-deep text-white py-2 px-4 relative overflow-hidden">
      {/* Subtle sparkle overlay could be added here via CSS or small absolute divs */}
      <div className="max-w-[1280px] mx-auto flex justify-between items-center text-sm font-medium">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-metallic" />
          <span>Diwali Dhamaka Offer — 10% OFF on all crackers!</span>
          <Sparkles className="w-4 h-4 text-accent-metallic" />
        </div>
        <div>
          <a href="#" className="hover:text-accent-electric transition-colors">
            📞 +91-9043621639 <span className="text-accent-electric">| WhatsApp Order</span>
          </a>
        </div>
      </div>
    </div>
  );
}
