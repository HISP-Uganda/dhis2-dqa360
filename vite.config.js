import { defineConfig } from 'vite'
import { createProxyMiddleware } from 'http-proxy-middleware'

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://play.im.dhis2.org/stable-2-41-4-1',
        changeOrigin: true,
        secure: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Add basic auth for demo instance
            const auth = Buffer.from('admin:district').toString('base64')
            proxyReq.setHeader('Authorization', `Basic ${auth}`)
            console.log(`🔗 Proxying ${req.method} ${req.url} to ${options.target}`)
          })
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(`✅ Response ${proxyRes.statusCode} for ${req.url}`)
          })
          
          proxy.on('error', (err, req, res) => {
            console.error(`❌ Proxy error for ${req.url}:`, err.message)
          })
        }
      }
    }
  }
})