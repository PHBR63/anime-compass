import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "robots.txt", "og-image.png", "custom-sw.js"],
      injectRegister: 'auto',
      manifest: {
        name: "AniCheck - Organize sua jornada anime",
        short_name: "AniCheck",
        description: "O melhor tracker de animes para organizar sua lista, descobrir novos títulos e acompanhar seu progresso.",
        theme_color: "#0a0f1a",
        background_color: "#0a0f1a",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        categories: ["entertainment", "lifestyle"],
        lang: "pt-BR",
        icons: [
          {
            src: "/icons/icon-72x72.png",
            sizes: "72x72",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/icon-96x96.png",
            sizes: "96x96",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/icon-128x128.png",
            sizes: "128x128",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/icon-144x144.png",
            sizes: "144x144",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/icon-152x152.png",
            sizes: "152x152",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/icon-384x384.png",
            sizes: "384x384",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/icon-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        screenshots: [
          {
            src: "/og-image.png",
            sizes: "1200x630",
            type: "image/png",
            form_factor: "wide",
            label: "AniCheck Dashboard"
          }
        ],
        shortcuts: [
          {
            name: "Minha Lista",
            short_name: "Lista",
            description: "Acesse sua lista de animes",
            url: "/list",
            icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }]
          },
          {
            name: "Descobrir",
            short_name: "Descobrir",
            description: "Descubra novos animes",
            url: "/discover",
            icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }]
          },
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "Veja suas estatísticas",
            url: "/dashboard",
            icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }]
          },
          {
            name: "Social",
            short_name: "Amigos",
            description: "Conecte-se com amigos",
            url: "/social",
            icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }]
          }
        ]
      },
      workbox: {
        // Forçar novo SW a assumir controle imediatamente
        clientsClaim: true,
        skipWaiting: true,
        // Aumentar limite para arquivos grandes (5MB)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Não falhar o build se um asset exceder o limite
        mode: "production",
        // Limpar caches antigos automaticamente
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.jikan\.moe\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "jikan-api-cache",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 // 24 horas
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/cdn\.myanimelist\.net\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "mal-images-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 dias
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5 // 5 minutos
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 10
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Configuração de code-splitting para reduzir tamanho do bundle
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - bibliotecas externas separadas
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-select",
            "@radix-ui/react-scroll-area",
          ],
          "vendor-animation": ["framer-motion", "gsap"],
          "vendor-charts": ["recharts"],
          "vendor-supabase": ["@supabase/supabase-js"],
        },
      },
    },
    // Aumentar limite de warning para chunks
    chunkSizeWarningLimit: 1000,
  },
}));
