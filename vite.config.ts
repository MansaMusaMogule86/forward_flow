import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-slot', '@radix-ui/react-toast', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          charts: ['recharts'],
          supabase: ['@supabase/supabase-js'],
          markdown: ['react-markdown', 'remark-gfm', 'rehype-raw']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
}));
