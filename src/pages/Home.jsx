import React from 'react';
import Hero from '../components/Hero';
import USPStrip from '../components/USPStrip';
import Categories from '../components/Categories';
import PriceList from '../components/PriceList';

export default function Home() {
  return (
    <main>
      <Hero />
      <USPStrip />
      <Categories />
      <PriceList />
    </main>
  );
}
