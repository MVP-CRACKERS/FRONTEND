import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
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
});
