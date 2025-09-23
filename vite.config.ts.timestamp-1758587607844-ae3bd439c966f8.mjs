// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { VitePWA } from "file:///home/project/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // 你用内联 manifest 也OK（不需要 public/manifest.webmanifest）
      manifest: {
        name: "1112",
        short_name: "VLINKS",
        description: "Calm \u2022 Focus \u2022 Connect",
        start_url: "/",
        // 若部署到子路径要改成 '/子路径/'
        scope: "/",
        // 同上
        display: "standalone",
        background_color: "#071024",
        theme_color: "#071024",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        // 构建时要能匹配到你的静态文件
        globPatterns: ["**/*.{js,css,html,ico,png,svg,mp3}"],
        // 让 SPA 的路由在刷新时回退到 index.html（代替你原来对 navigate 的函数判断）
        navigateFallback: "index.html",
        // 用正则而不是函数来匹配资源
        runtimeCaching: [
          // 静态资源（脚本/样式/图片/字体）
          {
            urlPattern: /.*\.(?:js|css|png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "assets" }
          },
          // 你的 BGM mp3（精确文件名）
          {
            urlPattern: /sea-veiw-361392\.mp3$/i,
            handler: "CacheFirst",
            options: { cacheName: "media" }
          },
          // 谷歌字体（如果用到）
          {
            urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      },
      // 开发环境可装PWA（不影响生产）
      devOptions: { enabled: true }
    })
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjsvLyB2aXRlLmNvbmZpZy50c1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIFZpdGVQV0Eoe1xuICAgICAgcmVnaXN0ZXJUeXBlOiAnYXV0b1VwZGF0ZScsXG4gICAgICAvLyBcdTRGNjBcdTc1MjhcdTUxODVcdTgwNTQgbWFuaWZlc3QgXHU0RTVGT0tcdUZGMDhcdTRFMERcdTk3MDBcdTg5ODEgcHVibGljL21hbmlmZXN0LndlYm1hbmlmZXN0XHVGRjA5XG4gICAgICBtYW5pZmVzdDoge1xuICAgICAgICBuYW1lOiAnMTExMicsXG4gICAgICAgIHNob3J0X25hbWU6ICdWTElOS1MnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0NhbG0gXHUyMDIyIEZvY3VzIFx1MjAyMiBDb25uZWN0JyxcbiAgICAgICAgc3RhcnRfdXJsOiAnLycsICAgICAvLyBcdTgyRTVcdTkwRThcdTdGNzJcdTUyMzBcdTVCNTBcdThERUZcdTVGODRcdTg5ODFcdTY1MzlcdTYyMTAgJy9cdTVCNTBcdThERUZcdTVGODQvJ1xuICAgICAgICBzY29wZTogJy8nLCAgICAgICAgIC8vIFx1NTQwQ1x1NEUwQVxuICAgICAgICBkaXNwbGF5OiAnc3RhbmRhbG9uZScsXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjMDcxMDI0JyxcbiAgICAgICAgdGhlbWVfY29sb3I6ICcjMDcxMDI0JyxcbiAgICAgICAgaWNvbnM6IFtcbiAgICAgICAgICB7IHNyYzogJy9pY29ucy9pY29uLTE5Mi5wbmcnLCBzaXplczogJzE5MngxOTInLCB0eXBlOiAnaW1hZ2UvcG5nJyB9LFxuICAgICAgICAgIHsgc3JjOiAnL2ljb25zL2ljb24tNTEyLnBuZycsIHNpemVzOiAnNTEyeDUxMicsIHR5cGU6ICdpbWFnZS9wbmcnIH0sXG4gICAgICAgICAgeyBzcmM6ICcvaWNvbnMvbWFza2FibGUtNTEyLnBuZycsIHNpemVzOiAnNTEyeDUxMicsIHR5cGU6ICdpbWFnZS9wbmcnLCBwdXJwb3NlOiAnbWFza2FibGUnIH1cbiAgICAgICAgXVxuICAgICAgfSxcbiAgICAgIHdvcmtib3g6IHtcbiAgICAgICAgLy8gXHU2Nzg0XHU1RUZBXHU2NUY2XHU4OTgxXHU4MEZEXHU1MzM5XHU5MTREXHU1MjMwXHU0RjYwXHU3Njg0XHU5NzU5XHU2MDAxXHU2NTg3XHU0RUY2XG4gICAgICAgIGdsb2JQYXR0ZXJuczogWycqKi8qLntqcyxjc3MsaHRtbCxpY28scG5nLHN2ZyxtcDN9J10sXG5cbiAgICAgICAgLy8gXHU4QkE5IFNQQSBcdTc2ODRcdThERUZcdTc1MzFcdTU3MjhcdTUyMzdcdTY1QjBcdTY1RjZcdTU2REVcdTkwMDBcdTUyMzAgaW5kZXguaHRtbFx1RkYwOFx1NEVFM1x1NjZGRlx1NEY2MFx1NTM5Rlx1Njc2NVx1NUJGOSBuYXZpZ2F0ZSBcdTc2ODRcdTUxRkRcdTY1NzBcdTUyMjRcdTY1QURcdUZGMDlcbiAgICAgICAgbmF2aWdhdGVGYWxsYmFjazogJ2luZGV4Lmh0bWwnLFxuXG4gICAgICAgIC8vIFx1NzUyOFx1NkI2M1x1NTIxOVx1ODAwQ1x1NEUwRFx1NjYyRlx1NTFGRFx1NjU3MFx1Njc2NVx1NTMzOVx1OTE0RFx1OEQ0NFx1NkU5MFxuICAgICAgICBydW50aW1lQ2FjaGluZzogW1xuICAgICAgICAgIC8vIFx1OTc1OVx1NjAwMVx1OEQ0NFx1NkU5MFx1RkYwOFx1ODExQVx1NjcyQy9cdTY4MzdcdTVGMEYvXHU1NkZFXHU3MjQ3L1x1NUI1N1x1NEY1M1x1RkYwOVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC8uKlxcLig/OmpzfGNzc3xwbmd8anBnfGpwZWd8c3ZnfGdpZnx3ZWJwfGljb3x3b2ZmMj8pJC9pLFxuICAgICAgICAgICAgaGFuZGxlcjogJ1N0YWxlV2hpbGVSZXZhbGlkYXRlJyxcbiAgICAgICAgICAgIG9wdGlvbnM6IHsgY2FjaGVOYW1lOiAnYXNzZXRzJyB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICAvLyBcdTRGNjBcdTc2ODQgQkdNIG1wM1x1RkYwOFx1N0NCRVx1Nzg2RVx1NjU4N1x1NEVGNlx1NTQwRFx1RkYwOVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9zZWEtdmVpdy0zNjEzOTJcXC5tcDMkL2ksXG4gICAgICAgICAgICBoYW5kbGVyOiAnQ2FjaGVGaXJzdCcsXG4gICAgICAgICAgICBvcHRpb25zOiB7IGNhY2hlTmFtZTogJ21lZGlhJyB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICAvLyBcdThDMzdcdTZCNENcdTVCNTdcdTRGNTNcdUZGMDhcdTU5ODJcdTY3OUNcdTc1MjhcdTUyMzBcdUZGMDlcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL2ZvbnRzXFwuKD86Z3N0YXRpY3xnb29nbGVhcGlzKVxcLmNvbVxcLy4qL2ksXG4gICAgICAgICAgICBoYW5kbGVyOiAnQ2FjaGVGaXJzdCcsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogJ2dvb2dsZS1mb250cycsXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHsgbWF4RW50cmllczogMzAsIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDM2NSB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9LFxuXG4gICAgICAvLyBcdTVGMDBcdTUzRDFcdTczQUZcdTU4ODNcdTUzRUZcdTg4QzVQV0FcdUZGMDhcdTRFMERcdTVGNzFcdTU0Q0RcdTc1MUZcdTRFQTdcdUZGMDlcbiAgICAgIGRldk9wdGlvbnM6IHsgZW5hYmxlZDogdHJ1ZSB9XG4gICAgfSlcbiAgXVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBRXhCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLGNBQWM7QUFBQTtBQUFBLE1BRWQsVUFBVTtBQUFBLFFBQ1IsTUFBTTtBQUFBLFFBQ04sWUFBWTtBQUFBLFFBQ1osYUFBYTtBQUFBLFFBQ2IsV0FBVztBQUFBO0FBQUEsUUFDWCxPQUFPO0FBQUE7QUFBQSxRQUNQLFNBQVM7QUFBQSxRQUNULGtCQUFrQjtBQUFBLFFBQ2xCLGFBQWE7QUFBQSxRQUNiLE9BQU87QUFBQSxVQUNMLEVBQUUsS0FBSyx1QkFBdUIsT0FBTyxXQUFXLE1BQU0sWUFBWTtBQUFBLFVBQ2xFLEVBQUUsS0FBSyx1QkFBdUIsT0FBTyxXQUFXLE1BQU0sWUFBWTtBQUFBLFVBQ2xFLEVBQUUsS0FBSywyQkFBMkIsT0FBTyxXQUFXLE1BQU0sYUFBYSxTQUFTLFdBQVc7QUFBQSxRQUM3RjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFNBQVM7QUFBQTtBQUFBLFFBRVAsY0FBYyxDQUFDLG9DQUFvQztBQUFBO0FBQUEsUUFHbkQsa0JBQWtCO0FBQUE7QUFBQSxRQUdsQixnQkFBZ0I7QUFBQTtBQUFBLFVBRWQ7QUFBQSxZQUNFLFlBQVk7QUFBQSxZQUNaLFNBQVM7QUFBQSxZQUNULFNBQVMsRUFBRSxXQUFXLFNBQVM7QUFBQSxVQUNqQztBQUFBO0FBQUEsVUFFQTtBQUFBLFlBQ0UsWUFBWTtBQUFBLFlBQ1osU0FBUztBQUFBLFlBQ1QsU0FBUyxFQUFFLFdBQVcsUUFBUTtBQUFBLFVBQ2hDO0FBQUE7QUFBQSxVQUVBO0FBQUEsWUFDRSxZQUFZO0FBQUEsWUFDWixTQUFTO0FBQUEsWUFDVCxTQUFTO0FBQUEsY0FDUCxXQUFXO0FBQUEsY0FDWCxZQUFZLEVBQUUsWUFBWSxJQUFJLGVBQWUsS0FBSyxLQUFLLEtBQUssSUFBSTtBQUFBLFlBQ2xFO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUE7QUFBQSxNQUdBLFlBQVksRUFBRSxTQUFTLEtBQUs7QUFBQSxJQUM5QixDQUFDO0FBQUEsRUFDSDtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
