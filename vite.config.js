import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
    plugins: [vue()],
    root: 'web',
    base: '/qqfarmbot/',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'web/src'),
        },
    },
    build: {
        outDir: path.resolve(__dirname, 'dist'),
        emptyOutDir: true,
    },
    server: {
        host: '127.0.0.1',
        port: 5173,
        proxy: {
            '/qqfarmbot/ws': {
                target: 'http://localhost:18084',
                ws: true,
                changeOrigin: true,
                rewrite: () => '/ws',
            },
        },
    },
})
