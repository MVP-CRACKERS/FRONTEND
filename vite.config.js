import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * VITE_API_URL is baked into the bundle at build time and cannot be changed
 * afterwards. A wrong value produces a shop that looks perfectly fine and
 * silently reaches nothing — which is exactly what happened when the host's
 * dashboard held a stale value that quietly overrode .env.production.
 *
 * So: say out loud what got baked in, and refuse to build a production
 * bundle that is certain to be broken.
 */
function assertApiUrl(mode) {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const url = (env.VITE_API_URL || '').trim();
  const isProd = mode === 'production';

  const from = process.env.VITE_API_URL
    ? 'the hosting platform (Vercel Environment Variables) — this OVERRIDES .env.production'
    : `a local env file (.env.${mode}, or .env)`;

  // eslint-disable-next-line no-console
  console.log(`\n  VITE_API_URL = ${url || '(empty)'}\n  source: ${from}\n`);

  const raw = env.VITE_API_URL || '';
  if (raw !== raw.trim()) {
    // eslint-disable-next-line no-console
    console.warn(
      '  NOTE: this value has leading/trailing whitespace (dashboards use a\n' +
        '  multi-line box, so a pasted URL often keeps a newline). The app trims\n' +
        '  it, but it is worth cleaning up at the source.\n'
    );
  }

  if (!isProd) return;

  const fail = (why, fix) => {
    throw new Error(
      `\n\n  Refusing to build: VITE_API_URL is ${why}.\n` +
        `  Value : ${url || '(empty)'}\n` +
        `  Source: ${from}\n` +
        `  Fix   : ${fix}\n`
    );
  };

  if (!url) fail('not set', 'set it to https://api.mvpcrackers.com');

  // api-mvpcrackers.com was never a registered domain: no NS, no SOA. It is
  // a separate domain, not a subdomain, so it can never resolve.
  if (/api-mvpcrackers\.com/.test(url)) {
    fail(
      'the api-mvpcrackers.com domain, which does not exist',
      'use https://api.mvpcrackers.com (a subdomain of the domain you own). ' +
        'If this came from Vercel, edit it under Settings -> Environment Variables and redeploy.'
    );
  }

  if (/^http:\/\//.test(url)) {
    fail('plain http', 'browsers block http calls from an https page — use https://');
  }

  if (/localhost|127\.0\.0\.1/.test(url)) {
    fail('a localhost address', 'nobody else can reach your machine — use the public API domain');
  }
}

export default defineConfig(({ mode }) => {
  assertApiUrl(mode);

  return {
  plugins: [react(), tailwindcss()],

  // Served from the domain root on mvpcrackers.com.
  base: '/',

  build: {
    outDir: 'dist',
    assetsDir: 'assets',

    // Source maps would publish readable source on a public domain.
    sourcemap: false,

    // Anything under 4 KB is inlined rather than costing a round trip.
    assetsInlineLimit: 4096,

    rollupOptions: {
      output: {
        // Split the vendor libraries out of the app bundle: React and
        // the icons barely change, so returning visitors keep them
        // cached across deploys of the shop itself.
        // (Vite 8 uses rolldown, which wants a function here.)
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'react';
          }
          if (id.includes('lucide-react')) return 'icons';
          return 'vendor';
        },
      },
    },

    chunkSizeWarningLimit: 700,
  },

  server: {
    port: 5173,
    strictPort: false,
  },

  preview: {
    port: 4173,
  },
  };
});
