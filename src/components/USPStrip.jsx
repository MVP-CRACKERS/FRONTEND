import React from 'react';
import { Truck, ShieldCheck, Percent, Package } from 'lucide-react';
import { useCatalog } from '../CatalogContext';

export default function USPStrip() {
  // The discount and delivery claims are read from the live pricing
  // rules, so they can never drift from what customers are actually
  // charged when you change DISCOUNT_PERCENT or FREE_DELIVERY_ABOVE.
  const { pricing } = useCatalog();

  const deliveryDesc =
    pricing.freeDeliveryAbove > 0
      ? `On orders above ₹${Number(pricing.freeDeliveryAbove).toLocaleString('en-IN')}`
      : pricing.deliveryCharge > 0
        ? `Flat ₹${Number(pricing.deliveryCharge).toLocaleString('en-IN')} delivery`
        : 'On every order';

  const usps = [
    {
      icon: Truck,
      title: pricing.deliveryCharge > 0 && pricing.freeDeliveryAbove <= 0 ? 'Fast Delivery' : 'Free Delivery',
      desc: deliveryDesc,
    },
    { icon: ShieldCheck, title: '100% Original', desc: 'Direct from factory' },
    {
      icon: Percent,
      title: `${pricing.discountPercent}% Discount`,
      desc: 'On all products',
    },
    { icon: Package, title: 'Safe Packaging', desc: 'Licensed transport' },
  ];

  return (
    <div className="bg-neutral-dark text-white py-6">
      <div className="max-w-[1280px] mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
        {usps.map((usp, i) => (
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
