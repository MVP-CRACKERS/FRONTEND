import React from 'react';

const CATEGORIES = [
  { name: 'Sparklers', count: 14, icon: '⚡' },
  { name: 'Flower Pots / Fountains', count: 6, icon: '🌸' },
  { name: 'Ground Chakkars', count: 4, icon: '🌀' },
  { name: 'Twinkling Star / Candles', count: 6, icon: '✨' },
  { name: 'Laxmi Crackers', count: 8, icon: '💥' },
  { name: 'Rockets', count: 2, icon: '🚀' },
  { name: 'Bombs', count: 8, icon: '💣' },
  { name: 'Giant / Deluxe Crackers', count: 4, icon: '🎇' },
  { name: 'Counting Crackers', count: 4, icon: '🎯' },
  { name: 'Brand Tape Crackers', count: 5, icon: '🏆' },
  { name: 'Fancy / Novelty', count: 18, icon: '🎆' },
  { name: 'Multi-Shot / Aerial Fancy', count: 19, icon: '🎇' },
  { name: 'Gift Boxes', count: 3, icon: '🎁' }
];

export default function Categories() {
  return (
    <section className="py-24 bg-white relative">
      <div className="max-w-[1280px] mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-heading text-neutral-dark inline-block relative">
            SHOP BY CATEGORY
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-accent-metallic rounded-full"></div>
          </h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {CATEGORIES.map((cat) => (
            <div key={cat.name} className="group bg-white rounded-xl p-6 border-2 border-transparent shadow-[0_10px_40px_rgba(15,61,30,0.08)] hover:border-accent-electric hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(57,255,20,0.15)] transition-all cursor-pointer relative overflow-hidden">
              <div className="absolute top-4 right-4 text-2xl">{cat.icon}</div>
              <h3 className="font-bold text-sm sm:text-base md:text-lg text-neutral-dark pr-6 sm:pr-8">{cat.name}</h3>
              <p className="text-neutral-500 text-sm mt-1">{cat.count} products</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
