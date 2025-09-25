// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/', // 根路徑主機必須用 '/'
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '1112',
        short_name: 'VLINKS',
        description: 'Calm • Focus • Connect',
        start_url: '/',    
        scope: '/',        
        display: 'standalone',
        background_color: '#071024',
        theme_color: '#071024',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /.*\.(?:js|css|png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'assets' }
          },
          {
            urlPattern: /sea-veiw-361392\.mp3$/i, // 檔名要跟實際一致
            handler: 'CacheFirst',
            options: { cacheName: 'media' }
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      },
      devOptions: { enabled: true }
    })
  ]
})
