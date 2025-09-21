// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 你用内联 manifest 也OK（不需要 public/manifest.webmanifest）
      manifest: {
        name: '1112',
        short_name: 'VLINKS',
        description: 'Calm • Focus • Connect',
        start_url: '/',     // 若部署到子路径要改成 '/子路径/'
        scope: '/',         // 同上
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
        // 构建时要能匹配到你的静态文件
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3}'],

        // 让 SPA 的路由在刷新时回退到 index.html（代替你原来对 navigate 的函数判断）
        navigateFallback: 'index.html',

        // 用正则而不是函数来匹配资源
        runtimeCaching: [
          // 静态资源（脚本/样式/图片/字体）
          {
            urlPattern: /.*\.(?:js|css|png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'assets' }
          },
          // 你的 BGM mp3（精确文件名）
          {
            urlPattern: /sea-veiw-361392\.mp3$/i,
            handler: 'CacheFirst',
            options: { cacheName: 'media' }
          },
          // 谷歌字体（如果用到）
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

      // 开发环境可装PWA（不影响生产）
      devOptions: { enabled: true }
    })
  ]
})
