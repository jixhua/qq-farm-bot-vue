/**
 * WebSocket 通道 - 替代 Socket.IO，更简单的路径配置
 */
const { WebSocketServer } = require('ws');
const bot = require('./bot');

let wss = null;
const WS_PATH = '/ws';

// 命令映射
const HANDLERS = {
    'bot:connect': async (d) => await bot.botConnect(d.code, d.platform),
    'bot:disconnect': () => bot.botDisconnect(),
    'bot:status': () => bot.getStatus(),
    'bot:feature-toggle': (d) => bot.setFeatureEnabled(d.feature, d.enabled),
    'bot:get-config': () => bot.getConfig(),
    'bot:save-config': (d) => bot.saveConfig(d),
    'bot:get-plant-plan': () => bot.getPlantPlan(),
    'bot:get-logs': () => bot.getLogs(),
    'bot:clear-logs': () => { bot.clearLogs(); return { success: true }; },
};

function broadcast(msg) {
    if (!wss) return;
    const data = JSON.stringify(msg);
    wss.clients.forEach((client) => {
        if (client.readyState === 1) client.send(data);
    });
}

function registerIPC(server) {
    wss = new WebSocketServer({ server, path: WS_PATH });

    wss.on('connection', (ws, req) => {
        console.log('👤 WebSocket 连接:', req.socket.remoteAddress);

        ws.on('message', async (raw) => {
            try {
                const msg = JSON.parse(raw.toString());
                if (msg.t !== 'req' || !msg.id || !msg.ch) return;

                const fn = HANDLERS[msg.ch];
                if (!fn) {
                    ws.send(JSON.stringify({ t: 'res', id: msg.id, ok: false, err: 'unknown channel' }));
                    return;
                }

                const result = await fn(msg.d || {});
                ws.send(JSON.stringify({ t: 'res', id: msg.id, ok: true, d: result }));
            } catch (e) {
                const id = (() => { try { const m = JSON.parse(raw.toString()); return m?.id; } catch { return null; } })();
                if (id != null) {
                    ws.send(JSON.stringify({ t: 'res', id, ok: false, err: e.message }));
                }
            }
        });
    });

    bot.botEvents.on('log', (entry) => broadcast({ t: 'ev', ch: 'bot:log', d: entry }));
    bot.botEvents.on('status-update', (status) => broadcast({ t: 'ev', ch: 'bot:status-update', d: status }));
}

async function deployIPC() {
    if (!wss) return;
    const s = wss;
    wss = null;
    await new Promise((resolve) => s.close(resolve));
}

module.exports = { registerIPC, deployIPC };
