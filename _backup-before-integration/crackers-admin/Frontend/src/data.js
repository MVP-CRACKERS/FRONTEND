/**
 * OFFLINE FALLBACK PRICE LIST
 * ---------------------------------------------------------------
 * MongoDB is the source of truth for products and prices — this file
 * is only rendered when the API cannot be reached, so the shop never
 * shows an empty page. It is NEVER used to calculate what a customer
 * is charged: the backend re-prices every order from the database.
 *
 * Keep it roughly in sync by running `npm run seed` in ../Backend,
 * which seeds MongoDB from this same list (images included).
 */
export const getCategoryImage = (catId) => {
  const map = {
    'sparklers': '/images/cat_sparklers.jpg',
    'flower_pots': '/images/cat_flowerpots.jpg',
    'ground_chakkars': '/images/cat_chakkars.jpg',
    'twinkling_star': '/images/cat_sparklers.jpg',
    'laxmi_crackers': '/images/cat_bombs.jpg',
    'rockets': '/images/cat_rockets.jpg',
    'bombs': '/images/cat_bombs.jpg',
    'giant_deluxe_crackers': '/images/cat_bombs.jpg',
    'counting_crackers': '/images/cat_bombs.jpg',
    'brand_tape_crackers': '/images/cat_bombs.jpg',
    'fancy_novelty': '/images/cat_skyshots.jpg',
    'multi_shot_aerial_fancy': '/images/cat_skyshots.jpg',
    'gift_boxes': '/images/cat_giftboxes_real.png',
  };
  return map[catId] || '/MVP.png';
};

export const CATEGORIES = [
  {
    id: 'sparklers',
    title: 'SPARKLER ITEMS',
    items: [
      { id: 1, name: '10 CM Electric Sparkler 10 Pcs', content: '1 BOX', price: 20.00, image: '/images/10_cm_electric_sparkler.png' },
      { id: 2, name: '10 CM Colour Sparkler 10 Pcs', content: '1 BOX', price: 20.00, image: '/images/10_cm_colour_sparkler.png' },
      { id: 3, name: '12 CM Electric Sparkler 10 Pcs', content: '1 BOX', price: 30.00, image: '/images/12_cm_electric_sparkler.png' },
      { id: 4, name: '12 CM Colour Sparkler 10 Pcs', content: '1 BOX', price: 35.00, image: '/images/12_cm_colour_sparkler.png' },
      { id: 5, name: '15 CM Electric Sparkler 10 Pcs', content: '1 BOX', price: 50.00, image: '/images/15_cm_electric_sparkler.png' },
      { id: 6, name: '15 CM Colour Sparkler 10 Pcs', content: '1 BOX', price: 55.00, image: '/images/15_cm_colour_sparkler.png' },
      { id: 7, name: '15 CM Green Sparkler 10 Pcs', content: '1 BOX', price: 55.00, image: '/images/15_cm_green_sparkler.png' },
      { id: 8, name: '15 CM Red Sparkler 10 Pcs', content: '1 BOX', price: 60.00, image: '/images/15_cm_red_sparkler.png' },
      { id: 9, name: '30 CM Electric Sparkler 5 Pcs', content: '1 BOX', price: 50.00, image: '/images/30_cm_electric_sparkler.png' },
      { id: 10, name: '30 CM Colour Sparkler 5 Pcs', content: '1 BOX', price: 55.00, image: '/images/30_cm_colour_sparkler.png' },
      { id: 11, name: '30 CM Green Sparkler 5 Pcs', content: '1 BOX', price: 55.00, image: '/images/30_cm_green_sparkler.png' },
      { id: 12, name: '30 CM Red Sparkler 5 Pcs', content: '1 BOX', price: 60.00, image: '/images/30_cm_red_sparkler.png' },
      { id: 13, name: '50 CM Electric Sparkler 5 Pcs', content: '1 BOX', price: 130.00, image: '/images/50_cm_electric_sparkler.png' },
      { id: 14, name: '50 CM Colour Sparkler 5 Pcs', content: '1 BOX', price: 140.00, image: '/images/50_cm_colour_sparkler.png' }
    ]
  },
  {
    id: 'flower_pots',
    title: 'FLOWER POTS / FOUNTAINS',
    items: [
      { id: 15, name: 'Flower Pot Gaint & Ashoka 10 Pcs', content: '1 BOX', price: 100.00, image: '/images/flower_pot_gaint_ashoka.jpg' },
      { id: 16, name: 'Flower Pot Deluxe 5 Pcs', content: '1 BOX', price: 150.00, image: '/images/flower_pot_deluxe.jpg' },
      { id: 17, name: 'Colour Koti 3 Colours 10 Pcs', content: '1 BOX', price: 180.00, image: '/images/colour_koti.png' },
      { id: 18, name: 'Tri Colour Fountains 5 Pcs', content: '1 BOX', price: 250.00, image: '/images/tri_colour_fountains.png' },
      { id: 19, name: 'Scooby Doo / Wonder 5 Pcs', content: '1 BOX', price: 250.00, image: '/images/scooby_doo_wonder.jpg' },
      { id: 20, name: 'Water Falls Candle 5 Pcs / Queen Candle', content: '1 BOX', price: 70.00, image: '/images/water_falls_candle.png' }
    ]
  },
  {
    id: 'ground_chakkars',
    title: 'GROUND CHAKKARS',
    items: [
      { id: 21, name: 'Ground Chakkar Delux Plastic Spinner 10 Pcs', content: '1 BOX', price: 140.00, image: '/images/ground_chakkar_delux_plastic.png' },
      { id: 22, name: 'Ground Chakkars Deluxe 10 Pcs', content: '1 BOX', price: 150.00, image: '/images/ground_chakkars_deluxe_10.jpg' },
      { id: 23, name: 'Ground Chakkars Special / Ashoka 10 Pcs', content: '1 BOX', price: 90.00, image: '/images/ground_chakkars_special.jpg' },
      { id: 24, name: 'Chotta Bheem / Tom & Jerry / Hi-Fi 5 Colours 5 Pcs', content: '1 BOX', price: 200.00, image: '/images/chotta_bheem_tom_jerry.png' }
    ]
  },
  {
    id: 'twinkling_star',
    title: 'TWINKLING STAR / CANDLES',
    items: [
      { id: 25, name: '4" Twinkling Star Deluxe 10 Pcs', content: '1 BOX', price: 75.00, image: '/images/twinkling_star_deluxe.jpg' },
      { id: 26, name: '1½ Twinkling Star 10 Pcs', content: '1 BOX', price: 40.00, image: '/images/1_5_twinkling_star.png' },
      { id: 27, name: 'Water Falls Candle / Smart Candle 5 Pcs', content: '1 BOX', price: 120.00, image: '/images/water_falls_smart_candle.png' },
      { id: 28, name: 'Sivakasi Special Crackling / 2K Crackling / Twitter Candle', content: '1 BOX', price: 180.00, image: '/images/sivakasi_special_crackling.png' },
      { id: 29, name: 'Disco Shower 5 Pcs', content: '1 BOX', price: 105.00, image: '/images/disco_shower.png' },
      { id: 30, name: 'Power Ranger / Honey Mix / Party Mix / Tang (Color Mixed) 5 Pcs', content: '1 BOX', price: 220.00, image: '/images/party_mix.jpg' }
    ]
  },
  {
    id: 'laxmi_crackers',
    title: 'LAXMI CRACKERS',
    items: [
      { id: 31, name: '2¾" Kuruvi Crackers', content: '25 PKT', price: 190.00, image: '/images/kuruvi_crackers.jpg' },
      { id: 32, name: '3½" Medium Laxmi', content: '10 PKT', price: 150.00, image: '/images/medium_laxmi.jpg' },
      { id: 33, name: '4" Laxmi Crackers', content: '10 PKT', price: 220.00, image: '/images/4_laxmi_crackers.jpg' },
      { id: 34, name: '4" Laxmi / Joker / Gold Laxmi 12 PLY', content: '10 PKT', price: 350.00, image: '/images/gold_laxmi.png' },
      { id: 35, name: '4" Laxmi Delux / Hulk Mask 16 PLY', content: '10 PKT', price: 380.00, image: '/images/4_laxmi_delux.jpg' },
      { id: 36, name: '5" Jallikattu', content: '5 PKT', price: 280.00, image: '/images/5_jallikattu.png' },
      { id: 37, name: '50 Deluxe Crackers', content: '1 PKT', price: 120.00, image: '/images/50_deluxe_crackers.jpg' },
      { id: 38, name: '100 Deluxe Crackers', content: '1 PKT', price: 200.00, image: '/images/100_deluxe_crackers.png' }
    ]
  },
  {
    id: 'rockets',
    title: 'ROCKETS',
    items: [
      { id: 39, name: 'Lunik Rocket 10 Pcs', content: '1 BOX', price: 120.00, image: '/images/lunik_rocket.png' },
      { id: 40, name: 'Whistling Rocket 10 Pcs', content: '1 BOX', price: 180.00, image: '/images/whistling_rocket.png' }
    ]
  },
  {
    id: 'bombs',
    title: 'BOMBS',
    items: [
      { id: 41, name: 'Digital Bomb / Sindhu Bomb 10 Pcs', content: '1 BOX', price: 210.00, image: '/images/digital_bomb.png' },
      { id: 42, name: 'Hydro Bomb Green / Funnel Bomb Green', content: '1 BOX', price: 80.00, image: '/images/hydro_bomb_green.png' },
      { id: 43, name: 'King of King Bomb Green / Commondo Bomb / Out Vedi', content: '1 BOX', price: 110.00, image: '/images/king_of_king_bomb.png' },
      { id: 44, name: 'Agni Bomb / Dinosaur Bomb', content: '1 BOX', price: 240.00, image: '/images/agni_dinosaur_bomb.png' },
      { id: 45, name: 'Joker Paper Bomb', content: '1 BOX', price: 50.00, image: '/images/joker_paper_bomb.png' },
      { id: 46, name: 'Joker Paper Bomb 500gm', content: '1 BOX', price: 95.00, image: '/images/joker_paper_bomb_500gm.png' },
      { id: 47, name: 'Joker Paper Bomb 1KG', content: '1 BOX', price: 180.00, image: '/images/joker_paper_bomb_1kg.png' },
      { id: 48, name: 'Mega Siren 3 Pcs', content: '1 BOX', price: 190.00, image: '/images/mega_siren.png' }
    ]
  },
  {
    id: 'giant_deluxe_crackers',
    title: 'GIANT / DELUXE CRACKERS',
    items: [
      { id: 49, name: '28 Giant Crackers', content: '1 PKT', price: 20.00, image: '/images/28_giant_crackers.png' },
      { id: 50, name: '56 Giant Crackers', content: '1 PKT', price: 34.00, image: '/images/56_giant_crackers.png' },
      { id: 51, name: '24 Deluxe Crackers', content: '1 PKT', price: 55.00, image: '/images/24_deluxe_crackers.png' },
      { id: 52, name: 'Ganga Jamuna / Laila Majnu 5 Pcs', content: '1 BOX', price: 70.00, image: '/images/ganga_jamuna.png' }
    ]
  },
  {
    id: 'counting_crackers',
    title: 'COUNTING CRACKERS',
    items: [
      { id: 53, name: '1K Others Half Counting', content: '1 BOX', price: 250.00, image: '/images/1k_others_half_counting.png' },
      { id: 54, name: '2K Others Half Counting', content: '1 BOX', price: 500.00, image: '/images/2k_others_half_counting.png' },
      { id: 55, name: '5K Others Half Counting', content: '1 BOX', price: 900.00, image: '/images/5k_others_half_counting.png' },
      { id: 56, name: '10K Others Half Counting', content: '1 BOX', price: 1800.00, image: '/images/10k_others_half_counting.png' }
    ]
  },
  {
    id: 'brand_tape_crackers',
    title: 'BRAND TAPE CRACKERS',
    items: [
      { id: 57, name: '100K Brand 80 Count', content: '1 BOX', price: 40.00, image: '/images/100k_brand_80_count.jpg' },
      { id: 58, name: '1K Brand Tape', content: '1 BOX', price: 250.00, image: '/images/1k_brand_tape.png' },
      { id: 59, name: '2K Brand Tape', content: '1 BOX', price: 800.00, image: '/images/2k_brand_tape.png' },
      { id: 60, name: '5K Brand Tape', content: '1 BOX', price: 1300.00, image: '/images/5k_brand_tape.png' },
      { id: 61, name: '10K Brand Tape', content: '1 BOX', price: 2800.00, image: '/images/10k_brand_tape.png' }
    ]
  },
  {
    id: 'fancy_novelty',
    title: 'FANCY / NOVELTY',
    items: [
      { id: 62, name: 'Butterfly Colour Changing 10 Pcs', content: '1 BOX', price: 80.00, image: '/images/butterfly_colour_changing.png' },
      { id: 63, name: 'Magic / Electic Stone / Magic Pop 10 Pcs', content: '1 BOX', price: 80.00, image: '/images/electric_stone.png' },
      { id: 64, name: 'Kit Kat / Tic Tac / Tin Tin 10 Pcs', content: '1 BOX', price: 15.00, image: '/images/kit_kat.png' },
      { id: 65, name: 'Photo Flash', content: '1 BOX', price: 60.00, image: '/images/photo_flash.png' },
      { id: 66, name: 'Peñta / Jolly Coola 5 Pcs', content: '1 BOX', price: 180.00, image: '/images/jolly_coola.png' },
      { id: 67, name: 'Golden Fly / Sky Silver Colour 6 Pcs', content: '1 BOX', price: 140.00, image: '/images/golden_fly.png' },
      { id: 68, name: 'Sky Force / Sky Wings / Five Falls 5 Pcs', content: '1 BOX', price: 120.00, image: '/images/sky_force.png' },
      { id: 69, name: 'Annam / Gems', content: '1 BOX', price: 80.00, image: '/images/annam_gems.png' },
      { id: 70, name: 'Hero / Golden Classic', content: '1 BOX', price: 150.00, image: '/images/golden_classic.png' },
      { id: 71, name: 'Royal Super Mega', content: '1 BOX', price: 180.00, image: '/images/royal_super_mega.png' },
      { id: 72, name: 'Delux Revolver Gun', content: '1 PCS', price: 50.00, image: '/images/delux_revolver_gun.png' },
      { id: 73, name: 'Red Bloom 5 Pcs', content: '1 BOX', price: 210.00, image: '/images/red_bloom.png' },
      { id: 74, name: 'Mayajaal Red / Green / Oreo Crackling 5 Pcs', content: '1 BOX', price: 185.00, image: '/images/mayajaal.png' },
      { id: 75, name: 'Selfie Stick Photo Flash 5 Pcs', content: '1 BOX', price: 110.00, image: '/images/selfie_stick.png' },
      { id: 76, name: 'Peacock Feather 5 Pcs', content: '1 BOX', price: 95.00, image: '/images/peacock_feather.png' },
      { id: 77, name: 'Rainbow Colours Smoke', content: '1 BOX', price: 120.00, image: '/images/rainbow_colours_smoke.png' },
      { id: 78, name: 'Badaa Peacock 1 Pcs', content: '1 BOX', price: 45.00, image: '/images/badaa_peacock.png' },
      { id: 79, name: 'Peacock Red & Green & Gold', content: '1 BOX', price: 40.00, image: '/images/peacock_red_green_gold.jpg' },
      { id: 102, name: 'I Cone 2 Pcs', content: '1 BOX', price: 350.00, image: '/images/i_cone.png' },
      { id: 103, name: 'Emu Egg 5 Pcs', content: '1 BOX', price: 350.00, image: '/images/emu_egg.png' }
    ]
  },
  {
    id: 'multi_shot_aerial_fancy',
    title: 'MULTI-SHOT / AERIAL FANCY',
    items: [
      { id: 80, name: '12 Shot Crackling Brand', content: '1 BOX', price: 140.00, image: '/images/12_shot_crackling_brand.png' },
      { id: 81, name: '12 Shot Hexagon Colour Brand', content: '1 BOX', price: 210.00, image: '/images/12_shot_hexagon_colour.jpg' },
      { id: 82, name: '25 Shot Rider', content: '1 BOX', price: 225.00, image: '/images/25_shot_rider.png' },
      { id: 83, name: '30 Shot Multi Colour Brand Full Crackling', content: '1 BOX', price: 500.00, image: '/images/30_shot_multi_colour.png' },
      { id: 84, name: '60 Shot Multi Colour Brand Full Crackling', content: '1 BOX', price: 1050.00, image: '/images/60_shot_multi_colour.png' },
      { id: 85, name: '120 Shot Multi Colour Brand', content: '1 BOX', price: 2200.00, image: '/images/120_shot_multi_colour.png' },
      { id: 86, name: '15 Shot Smoke Shot', content: '1 BOX', price: 50.00, image: '/images/15_shot_smoke_shot.png' },
      { id: 87, name: '30 Shot Mega Display Setout', content: '1 BOX', price: 3200.00, image: '/images/30_shot_mega_display.png' },
      { id: 88, name: '20 Shot Mega Display Setout', content: '1 BOX', price: 240.00, image: '/images/20_shot_mega_display.png' },
      { id: 89, name: '1 1/4 Chota Fancy', content: '1 BOX', price: 40.00, image: '/images/chota_fancy.png' },
      { id: 90, name: '2 Arial Fancy Other 1 Pcs', content: '1 BOX', price: 90.00, image: '/images/2_arial_fancy.png' },
      { id: 91, name: '2 Arial Fancy 3 Pcs Other', content: '1 BOX', price: 265.00, image: '/images/2_arial_fancy_3pcs.png' },
      { id: 92, name: '2½ Arial Fancy 1 Pcs 10 Varieties', content: '1 BOX', price: 140.00, image: '/images/2_5_arial_fancy.png' },
      { id: 93, name: '3½ Arial Fancy 1 Pcs 10 Varieties', content: '1 BOX', price: 300.00 },
      { id: 94, name: '3½ Nayagara Falls 1 Pcs', content: '1 BOX', price: 350.00, image: '/images/nayagara_falls.png' },
      { id: 95, name: '3½" Arial Fancy Crackling', content: '1 BOX', price: 350.00, image: '/images/3_5_arial_fancy_crackling.png' },
      { id: 96, name: '3½" Arial Fancy Sizzling', content: '1 BOX', price: 350.00, image: '/images/3_5_arial_fancy_sizzling.png' },
      { id: 97, name: '4½" Arial Fancy 1 Pcs', content: '1 BOX', price: 450.00, image: '/images/4_5_arial_fancy.png' },
      { id: 98, name: '3½ Arial Fancy Brand 1 Pcs 10 Varieties', content: '1 BOX', price: 400.00, image: '/images/3_5_arial_fancy_brand.png' },
      { id: 104, name: 'Double ball 4inch sky shot', content: '1 BOX', price: 650.00, image: '/images/double_ball_4inch.png' },
      { id: 105, name: '5inch 2 pcs', content: '1 BOX', price: 950.00, image: '/images/5inch_2_pcs.png' }
    ]
  },
  {
    id: 'gift_boxes',
    title: 'GIFT BOXES',
    items: [
      { id: 106, name: '30 Items Gokulam Gift Box', content: '1 BOX', price: 0.00, image: '/images/30_items_gokulam.png' },
      { id: 99, name: '40 Items Gokulam Gift Box', content: '1 BOX', price: 510.00, image: '/images/40_items_gokulam.png' },
      { id: 100, name: '50 Items Gokulam Gift Box', content: '1 BOX', price: 740.00, image: '/images/50_items_gokulam.png' },
      { id: 101, name: '60 Item Gift Box', content: '1 BOX', price: 1050.00, image: '/images/60_item_gift_box.png' }
    ]
  }
];

export const getProductById = (id) => {
  return CATEGORIES.flatMap(c => c.items.map(i => ({...i, categoryId: c.id}))).find(item => item.id === parseInt(id));
};
