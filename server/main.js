const http = require('http');
const fs = require('fs');
const path = require('path');
const bot = require('./bot');
const {registerIPC, deployIPC} = require('./ipc');

// 静态服务器（/ws 由 WebSocket 处理）
const server = http.createServer((req, res) => {
    if (req.url === '/ws' || req.url?.startsWith('/ws?')) return;
    let filePath = path.join(__dirname, '../dist', req.url === '/' ? 'index.html' : req.url);
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('File Not Found');
            return;
        }
        const ext = path.extname(filePath);
        const contentType = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css'
        }[ext] || 'text/plain';

        res.writeHead(200, {'Content-Type': contentType});
        res.end(content);
    });
});

async function main() {
    registerIPC(server);
    await bot.init();

    server.listen(18084, () => {
        console.log('🚀 服务运行在 http://localhost:18084');
    });
}

async function gracefulShutdown(signal) {
    console.log(`🚀 退出信号: ${signal}`)
    // 执行机器人的断开逻辑
    bot.botDisconnect();
    // 关闭 IPC 通道
    await deployIPC();
    // 关闭 HTTP 服务器
    await new Promise(resolve => server.close(resolve));
    console.log('🌐 HTTP 服务器已关闭');
    process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
main().catch(console.error);
