/**
 * WebSocket 客户端 - 替代 Socket.IO，路径简单无坑
 */
let _ws = null;
let _reqId = 0;
const _pending = new Map();
const _listeners = new Map();

function connect() {
  if (_ws && _ws.readyState === WebSocket.OPEN) return _ws;
  const ws = new WebSocket('/qqfarmbot/ws');
  _ws = ws;

  ws.onopen = () => { socket.connected = true; };
  ws.onclose = () => {
    socket.connected = false;
    _pending.forEach((cb) => cb({ success: false, error: '连接已关闭' }));
    _pending.clear();
    setTimeout(connect, 2000);
  };
  ws.onerror = () => {};
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.t === 'res') {
        const cb = _pending.get(msg.id);
        if (cb) {
          _pending.delete(msg.id);
          cb(msg.ok ? msg.d : { success: false, error: msg.err || '未知错误' });
        }
      } else if (msg.t === 'ev') {
        const fns = _listeners.get(msg.ch);
        if (fns) fns.forEach((fn) => fn(msg.d));
      }
    } catch {}
  };
  return ws;
}

const socket = {
  connected: false,
  on(channel, callback) {
    if (!_listeners.has(channel)) _listeners.set(channel, []);
    _listeners.get(channel).push(callback);
  },
  emit(channel, data, callback) {
    const id = ++_reqId;
    _pending.set(id, (res) => callback(res));
    if (_ws && _ws.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify({ t: 'req', id, ch: channel, d: data }));
    } else {
      waitForConnection().then(() => {
        if (_ws) _ws.send(JSON.stringify({ t: 'req', id, ch: channel, d: data }));
      });
    }
  },
};

connect();

export { socket };
export function waitForConnection() {
  return new Promise((resolve) => {
    if (socket.connected) {
      resolve();
    } else {
      const check = () => {
        if (socket.connected) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      _ws.addEventListener('open', () => resolve(), { once: true });
      setTimeout(() => check(), 100);
    }
  });
}
