/**
 * Centralised, validated environment configuration.
 * Every other module imports from here — never from process.env directly.
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const config = {
  env: process.env.NODE_ENV || 'development',
  port: num(process.env.PORT, 5000),

  mongoUri: process.env.MONGODB_URI,

  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@mvpcrackers.com',
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME || 'MVP Admin',
  },

  // CORS origins — comma separated in .env
  frontendUrls: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  publicBaseUrl: (process.env.PUBLIC_BASE_URL || 'http://localhost:5000').replace(/\/+$/, ''),

  business: {
    name: process.env.BUSINESS_NAME || 'MVP CRACKERS',
    tagline: process.env.BUSINESS_TAGLINE || "CHENNAI'S MVP FOR DIWALI - DIRECT FROM SIVAKASI",
    phone: process.env.BUSINESS_PHONE || '+91-9043621639',
    email: process.env.BUSINESS_EMAIL || 'manikandan621639@gmail.com',
    address: process.env.BUSINESS_ADDRESS || '24/67a saidapet road vadapalani chennai 600026',
    website: process.env.BUSINESS_WEBSITE || 'www.mvpcrackers.com',
    gstNumber: (process.env.GST_NUMBER || '').trim(),
    whatsappNumber: (process.env.WHATSAPP_NUMBER || '919043621639').replace(/\D/g, ''),
  },

  pricing: {
    discountPercent: num(process.env.DISCOUNT_PERCENT, 10),
    taxPercent: num(process.env.TAX_PERCENT, 5.833),
    deliveryCharge: num(process.env.DELIVERY_CHARGE, 0),
    freeDeliveryAbove: num(process.env.FREE_DELIVERY_ABOVE, 0),
    whitebagCharge: num(process.env.WHITEBAG_CHARGE, 0),
    minOrderValue: num(process.env.MIN_ORDER_VALUE, 0),
  },

  invoicesDir: path.resolve(__dirname, '../../invoices'),
  assetsDir: path.resolve(__dirname, '../../assets'),
};

/**
 * Fails fast at boot if a required secret is missing, so the server
 * never starts in a half-configured state.
 */
function validateConfig() {
  const missing = [];
  if (!config.mongoUri) missing.push('MONGODB_URI');
  if (!config.jwtSecret) missing.push('JWT_SECRET');

  if (missing.length) {
    // eslint-disable-next-line no-console
    console.error(
      '\n  Missing required environment variables: ' +
        missing.join(', ') +
        '\n   Copy backend/.env.example to backend/.env and fill these in.\n'
    );
    process.exit(1);
  }

  if (config.env === 'production' && config.jwtSecret.length < 32) {
    // eslint-disable-next-line no-console
    console.error('\n  JWT_SECRET is too short for production. Use at least 32 characters.\n');
    process.exit(1);
  }
}

module.exports = { config, validateConfig };
