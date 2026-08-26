import React from 'react';
import { useCatalog } from '../CatalogContext';

/**
 * Category artwork. Keyed by the category id stored in MongoDB, with a
 * keyword fallback so a category the admin invents later still gets a
 * sensible icon instead of a blank corner.
 */
const ICONS = {
  sparklers: '⚡',
  flower_pots: '🌸',
  ground_chakkars: '🌀',
  twinkling_star: '✨',
  laxmi_crackers: '💥',
  rockets: '🚀',
  bombs: '💣',
  giant_deluxe_crackers: '🎇',
  counting_crackers: '🎯',
  brand_tape_crackers: '🏆',
  fancy_novelty: '🎆',
  multi_shot_aerial_fancy: '🎇',
  gift_boxes: '🎁',
};

const KEYWORD_ICONS = [
  [/spark/i, '⚡'],
  [/flower|fountain|pot/i, '🌸'],
  [/chakkar|spinner/i, '🌀'],
  [/twink|candle|star/i, '✨'],
  [/laxmi|lakshmi/i, '💥'],
  [/rocket/i, '🚀'],
  [/bomb/i, '💣'],
  [/giant|deluxe/i, '🎇'],
  [/count/i, '🎯'],
  [/brand|tape/i, '🏆'],
  [/fancy|novelty/i, '🎆'],
  [/shot|aerial|sky/i, '🎇'],
  [/gift|box/i, '🎁'],
  [/kid|child/i, '🧒'],
  [/smoke|colour|color/i, '🌈'],
];

function iconFor(category) {
  if (ICONS[category.id]) return ICONS[category.id];
  const match = KEYWORD_ICONS.find(([re]) => re.test(category.title));
  return match ? match[1] : '🎇';
}

export default function Categories() {
  // Counts come straight from the live catalogue, so adding a cracker in
  // the admin panel changes the number here with no code edit.
  const { categories, loading, loaded } = useCatalog();

  /** Opens that category in the price list and scrolls to it. */
  const openCategory = (categoryId) => {
    window.dispatchEvent(new CustomEvent('mvp:open-category', { detail: { categoryId } }));
  };

  const totalProducts = categories.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <section className="py-24 bg-white relative">
      <div className="max-w-[1280px] mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-neutral-dark inline-block relative tracking-tight">
            SHOP BY CATEGORY
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-accent-metallic rounded-full"></div>
          </h2>
          {totalProducts > 0 && (
            <p className="text-neutral-500 mt-6">
              {totalProducts} crackers across {categories.length}{' '}
              {categories.length === 1 ? 'category' : 'categories'}
            </p>
          )}
        </div>

        {/* Skeletons while the catalogue loads — nothing is guessed */}
        {loading && categories.length === 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-gray-50 rounded-xl p-6 h-[104px] animate-pulse border-2 border-transparent"
              />
            ))}
          </div>
        )}

        {!loading && loaded && categories.length === 0 && (
          <p className="text-center text-gray-500">
            Our categories are being updated. Please check back shortly.
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => openCategory(cat.id)}
              className="group text-left bg-white rounded-xl p-6 border-2 border-transparent shadow-[0_10px_40px_rgba(15,61,30,0.08)] hover:border-accent-electric hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(57,255,20,0.15)] focus:outline-none focus:border-accent-electric transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 text-2xl">{iconFor(cat)}</div>
              <h3 className="font-bold text-sm sm:text-base md:text-lg text-neutral-dark pr-6 sm:pr-8">
                {cat.title}
              </h3>
              <p className="text-neutral-500 text-sm mt-1">
                {cat.items.length} {cat.items.length === 1 ? 'product' : 'products'}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
