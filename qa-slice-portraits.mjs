import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const port = 4200;
const debugPort = 14600 + Math.floor(Math.random() * 400);
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const userDataDir = path.join(process.env.TEMP || root, `citizenship-slice-${Date.now()}`);
const srcDir = 'assets/characters/portraits-src';
const outDir = path.join(root, 'assets/characters/portraits');

// Mapping is by ON-CARD CAPTION order (the number badges on the art are unreliable).
// NPC-1 has 26 cards in rows of 9/9/8 — Community Elder Grace (elderGrace) is NOT present.
const SOURCES = [
    {
        file: 'NPC-1.png',
        rows: [9, 9, 8],
        ids: [
            'mayor', 'priya', 'sam', 'rowan', 'noor', 'editorVale', 'historianIona', 'aidMina', 'dataOmar',
            'advocateFarah', 'sergeantBlake', 'mediatorChen', 'youthEllis', 'speakerLark', 'mpRivers', 'managerSol', 'officerJune', 'heraldEwan',
            'unionMorgan', 'charityAmina', 'lobbyistPax', 'moderatorRae', 'surveyorTess', 'statJules', 'organiserKai', 'examinerMira'
        ]
    },
    {
        file: 'NPC-2.png',
        rows: [4],
        ids: ['timeAsh', 'sourceNia', 'coachLeon', 'scribePip']
    }
];

function contentType(file) {
    if (file.endsWith('.png')) return 'image/png';
    if (file.endsWith('.html')) return 'text/html; charset=utf-8';
    return 'application/octet-stream';
}
const server = http.createServer((req, res) => {
    const parsed = new URL(req.url, `http://127.0.0.1:${port}`);
    const requested = parsed.pathname === '/' ? '/index.html' : parsed.pathname;
    const safePath = path.normalize(decodeURIComponent(requested)).replace(/^([/\\])+/, '');
    const filePath = path.join(root, safePath);
    if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': contentType(filePath), 'Cache-Control': 'no-store' });
    fs.createReadStream(filePath).pipe(res);
});
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const pending = new Map();
let socket;
async function cdp(method, params = {}) { const id = ++cdp.id; socket.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject, method })); }
cdp.id = 0;
async function evalJs(expression, awaitPromise = true) { const result = await cdp('Runtime.evaluate', { expression, awaitPromise, returnByValue: true, userGesture: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || JSON.stringify(result.exceptionDetails)); return result.result.value; }
async function waitFor(fn, label, timeout = 15000) { const s = Date.now(); let last; while (Date.now() - s < timeout) { try { last = await fn(); if (last) return last; } catch (e) { last = e; } await delay(120); } throw new Error(`Timed out: ${label}: ${last?.message || last}`); }

const SLICER = (rowsJson) => `(async () => {
  const rows = ${rowsJson};
  const img = document.getElementById('src');
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, W, H).data;
  const isWhite = (x, y) => { const i = (y * W + x) * 4; return data[i] > 248 && data[i+1] > 247 && data[i+2] > 244; };
  const rowWhite = (y) => { let w = 0, n = 0; for (let x = 0; x < W; x += 2) { n++; if (isWhite(x, y)) w++; } return w / n; };
  const colWhite = (x, y0, y1) => { let w = 0, n = 0; for (let y = y0; y < y1; y += 2) { n++; if (isWhite(x, y)) w++; } return w / n; };
  const bands = [];
  let inBand = false, bandStart = 0;
  for (let y = 0; y < H; y++) {
    const content = rowWhite(y) < 0.9;
    if (content && !inBand) { inBand = true; bandStart = y; }
    else if (!content && inBand) { inBand = false; if (y - bandStart > H * 0.08) bands.push([bandStart, y]); }
  }
  if (inBand && H - bandStart > H * 0.08) bands.push([bandStart, H]);
  const cards = [];
  for (let r = 0; r < rows.length; r++) {
    const band = bands[r]; if (!band) continue;
    const [y0, y1] = band;
    const cols = [];
    let inCol = false, colStart = 0;
    for (let x = 0; x < W; x++) {
      const content = colWhite(x, y0, y1) < 0.9;
      if (content && !inCol) { inCol = true; colStart = x; }
      else if (!content && inCol) { inCol = false; if (x - colStart > W * 0.02) cols.push([colStart, x]); }
    }
    if (inCol && W - colStart > W * 0.02) cols.push([colStart, W]);
    for (const [x0, x1] of cols) cards.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }
  const results = [];
  for (const card of cards) {
    const inset = Math.round(card.w * 0.025);
    const side = Math.min(card.w - inset * 2, Math.round(card.h * 0.6));
    const sx = card.x + Math.round((card.w - side) / 2);
    const sy = card.y + inset;
    const oc = document.createElement('canvas'); oc.width = 256; oc.height = 256;
    const octx = oc.getContext('2d');
    octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = 'high';
    octx.drawImage(c, sx, sy, side, side, 0, 0, 256, 256);
    // pick the lightest (cream background) sample from the top of the card, avoiding hair
    let best = [246, 241, 233], bestLum = -1;
    for (const fx of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const px = card.x + Math.round(card.w * fx), py = card.y + Math.round(card.h * 0.04);
      const pi = (py * W + px) * 4;
      const lum = Math.min(data[pi], data[pi+1], data[pi+2]);
      if (lum > bestLum) { bestLum = lum; best = [data[pi], data[pi+1], data[pi+2]]; }
    }
    octx.fillStyle = 'rgb(' + best[0] + ',' + best[1] + ',' + best[2] + ')';
    const scale = 256 / side;
    const fillW = Math.round((card.x + card.w * 0.26 - sx) * scale);
    const fillH = Math.round(card.h * 0.16 * scale);
    if (fillW > 0) octx.fillRect(0, 0, fillW, fillH);
    results.push(oc.toDataURL('image/png').split(',')[1]);
  }
  return JSON.stringify({ count: results.length, pngs: results });
})()`;

let chrome;
async function run() {
    fs.mkdirSync(outDir, { recursive: true });
    await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
    fs.writeFileSync(path.join(root, '__slice.html'), '<!doctype html><meta charset=utf-8><body style="margin:0"><img id=src></body>');
    chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-allow-origins=*', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${userDataDir}`, 'about:blank'], { stdio: ['ignore', 'pipe', 'pipe'] });
    await waitFor(async () => { const r = await fetch(`http://127.0.0.1:${debugPort}/json/version`).catch(() => null); return r?.ok ? r.json() : null; }, 'devtools');
    const pageInfo = await waitFor(async () => { const cr = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' }).catch(() => null); if (cr?.ok) return cr.json(); return null; }, 'page');
    socket = new WebSocket(pageInfo.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    socket.addEventListener('message', (event) => { const m = JSON.parse(event.data); if (m.id && pending.has(m.id)) { const { resolve, reject, method } = pending.get(m.id); pending.delete(m.id); if (m.error) reject(new Error(method + ': ' + m.error.message)); else resolve(m.result || {}); } });
    await cdp('Runtime.enable');
    await cdp('Page.enable');
    await cdp('Page.navigate', { url: `http://127.0.0.1:${port}/__slice.html` });
    await waitFor(async () => evalJs('document.readyState === "complete"'), 'page load');

    const saved = [];
    for (const src of SOURCES) {
        await evalJs(`new Promise((res, rej) => { const im = document.getElementById('src'); im.onload = () => res(true); im.onerror = rej; im.src = '/${srcDir}/${src.file}?cb=' + Date.now(); })`);
        await delay(150);
        const parsed = JSON.parse(await evalJs(SLICER(JSON.stringify(src.rows))));
        if (parsed.count !== src.ids.length) {
            console.error(`WARNING ${src.file}: detected ${parsed.count} cards but mapped ${src.ids.length} ids`);
        }
        parsed.pngs.forEach((b64, i) => {
            const id = src.ids[i];
            if (!id) return;
            fs.writeFileSync(path.join(outDir, id + '.png'), Buffer.from(b64, 'base64'));
            saved.push(id);
        });
    }
    console.log(JSON.stringify({ savedCount: saved.length, saved }, null, 2));
}
run().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(async () => {
    try { fs.unlinkSync(path.join(root, '__slice.html')); } catch { }
    try { socket?.close(); } catch { }
    try { chrome?.kill(); } catch { }
    server.close();
});
