// ==================== bot.js - JUFUFU THEME (AMARELO ZZZ) ====================
const path = require('path');
const fs = require('fs');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const P = require('pino');
const { Boom } = require('@hapi/boom');
const readline = require('readline');
const dns = require('dns').promises;
const CONFIG = require('./config.js');

// --- THEME JUFUFU ---
const C = {
  reset: "\x1b[0m",
  yellow: "\x1b[38;2;255;210;0m",
  orange: "\x1b[38;2;255;159;10m",
  black: "\x1b[38;2;30;30;30m",
  white: "\x1b[97m",
  green: "\x1b[38;2;0;255;136m",
  pink: "\x1b[38;2;255;105;180m",
  dim: "\x1b[2m",
  bold: "\x1b[1m"
};
const Y = C.yellow, O = C.orange, B = C.bold, D = C.dim, R = C.reset;

let botStarted = false, pairingRequested = false, connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let reconnectTimeout = null, isReconnecting = false, sockInstance = null, healthCheckFailures = 0, healthInterval = null;

const PASTAS = { session: path.join(process.cwd(), 'session') };
if (!fs.existsSync(PASTAS.session)) fs.mkdirSync(PASTAS.session, { recursive: true });

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
async function esperarInternet() {
    while (true) {
        try { await dns.lookup('google.com'); console.log(`${Y}  [ JUFUFU ]${R} ${C.green}Cauda abanando! Internet voltou! 🐯${R}`); return true; }
        catch { console.log(`${Y}  [ JUFUFU ]${R} ${D}cochilando sem Wi-Fi... zzz... 5s${R}`); await delay(5000); }
    }
}
function pergunta(t) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(res => rl.question(`${Y}  > ${t}${R}`, a => { rl.close(); res(a); }));
}

process.on('uncaughtException', (err) => { console.error(`${O}  [ OW ] Erro:${R}`, err.message); botStarted = false; isReconnecting = false; setTimeout(() => startBot().catch(()=>{}), 3000); });
process.on('unhandledRejection', (r) => { console.error(`${O}  [ OW ] Promise:${R}`, r?.message || r); botStarted = false; isReconnecting = false; setTimeout(() => startBot().catch(()=>{}), 3000); });

function setupHealthCheck() {
    if (healthInterval) clearInterval(healthInterval);
    healthInterval = setInterval(() => {
        if (!sockInstance?.ws) return;
        if (sockInstance.ws.readyState === 1) { healthCheckFailures = 0; return; }
        if (sockInstance.ws.readyState === 3) {
            healthCheckFailures++;
            if (healthCheckFailures >= 3) { console.log(`${Y}  [ JUFUFU ]${R} Link caiu, vou pular de volta!`); healthCheckFailures = 0; botStarted = false; startBot().catch(()=>{}); }
        }
    }, 15000);
}

async function startBot() {
    if (botStarted) return sockInstance;
    botStarted = true;
    try {
        console.log(`\n${Y}${B}  ▓▓ JUFUFU SYSTEM BOOTING...${R}`);
        console.log(`${D}  ── Yunkui Summit // Tiger Thiren ──${R}\n`);
        console.log(`${Y}  [ SYS ]${R} Carregando garrinhas [ session ]...`);
        const { state, saveCreds } = await useMultiFileAuthState(PASTAS.session);
        const { version } = await fetchLatestBaileysVersion();
        console.log(`${Y}  [ SYS ]${R} Farejando o Hollow...`);

        const sock = makeWASocket({
            auth: state, version, logger: P({ level: "silent" }),
            browser: Browsers.macOS("Chrome"), syncFullHistory: false,
            generateHighQualityLinkPreview: false, defaultQueryTimeoutMs: 60000, printQRInTerminal: false
        });
        sockInstance = sock;
        sock.ev.on("creds.update", saveCreds);
        
        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === "open") {
                console.log(`\n${Y}  ╔═══════════════════════════════════╗${R}`);
                console.log(`${Y}  ║  🐯 ${B}${CONFIG.botNome} ACORDOU!${R}${Y}  ║${R}`);
                console.log(`${Y}  ║  ${D}Mestre, tô pronta pra missão!${R}${Y}      ║${R}`);
                console.log(`${Y}  ╚═══════════════════════════════════╝${R}\n`);
                connectionAttempts = 0; isReconnecting = false; botStarted = true; healthCheckFailures = 0;
                if (reconnectTimeout) { clearTimeout(reconnectTimeout); reconnectTimeout = null; }
                if (typeof onBotOnline === 'function') await onBotOnline(sock);
                return;
            }
            if (connection === "close") {
                const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
                const errorMsg = lastDisconnect?.error?.message || '';
                console.log(`${O}  [ LINK LOST ] ${statusCode} :: ${errorMsg}${R}`);
                botStarted = false; isReconnecting = false;
                if (statusCode === DisconnectReason.loggedOut) { console.log(`${C.pink}  [ JUFUFU ] Fui deslogada! Apaga a session: rm -rf session${R}`); pairingRequested = false; return; }
                const isNetError = [440, 428, 408, 515, 516].includes(statusCode) || /ECONN|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|Timeout|Network/i.test(errorMsg);
                if (isNetError) {
                    console.log(`${Y}  [ JUFUFU ] Ops, sem internet! Vou ficar aqui esperando... 🐾${R}`);
                    await esperarInternet();
                    connectionAttempts = 0;
                    setTimeout(() => startBot().catch(()=>{}), 2000);
                    return;
                }
                if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
                    connectionAttempts++;
                    const waitTime = Math.min(3000 * connectionAttempts, 15000);
                    console.log(`${Y}  [ JUFUFU ] Tentando de novo em ${waitTime/1000}s... (${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS}) ${R}`);
                    reconnectTimeout = setTimeout(() => startBot().catch(()=>{}), waitTime);
                } else {
                    console.log(`${O}  [ JUFUFU ] Muitas quedas, vou tirar um cochilo de 30s...${R}`);
                    connectionAttempts = 0;
                    setTimeout(() => startBot().catch(()=>{}), 30000);
                }
            }
        });

        if (!pairingRequested && !sock.authState.creds.registered) {
            pairingRequested = true;
            await delay(1000);
            const numero = await pergunta('Digite seu número (ex: 5599999999999): ');
            if (numero?.trim()) {
                try {
                    const code = await sock.requestPairingCode(numero.trim());
                    const fmt = code.match(/.{1,4}/g)?.join('-') || code;
                    console.log(`\n${Y}  ┌─ JUFUFU PAIR CODE ───────────┐${R}`);
                    console.log(`${Y}  │  ${B}${C.white}${fmt}${R}${Y}  │${R}`);
                    console.log(`${Y}  └─────────────────────────────┘${R}`);
                    console.log(`${D}  > WhatsApp > Dispositivos > Vincular com número${R}\n`);
                } catch (err) { console.log(`${O}  Erro no código:${R}`, err.message); pairingRequested = false; botStarted = false; setTimeout(startBot, 3000); }
            }
        }
        setupHealthCheck();
        return sock;
    } catch (err) { console.error(`${O}  Erro ao iniciar:${R}`, err.message); botStarted = false; isReconnecting = false; setTimeout(() => startBot().catch(()=>{}), 5000); }
}

function getSocket() { return sockInstance; }
function isConnected() { return sockInstance?.ws?.readyState === 1; }
let onBotOnline = null;
module.exports = { startBot, getSocket, isConnected, PASTAS, setOnBotOnline: (cb) => { onBotOnline = cb; console.log(`${Y}  [ JUFUFU ] Callback registrado! Pronta! 🐯${R}`); } };