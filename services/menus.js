// ============================================================
//  JUFUFU BOT • CONEXÃO COM O APP DE MENUS
//  Arquivo: services/menus.js
// ============================================================

const fetch = require('node-fetch');
const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const CONFIG = require('../config.js');

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const APP_URL = CONFIG.menuApp?.baseUrl || '';
const APP_TOKEN = CONFIG.menuApp?.token || '';
const APP_TIMEOUT = CONFIG.menuApp?.timeout || 15000;

const APP_LINK = 'https://quick-menu-bot.lovable.app/inicio';

// ============================================================
// PREFIXO DINÂMICO
// ============================================================

const PREFIXO_DO_CONFIG = String(CONFIG.prefix || CONFIG.prefixo || '°').trim();
let PREFIXO_ATUAL = PREFIXO_DO_CONFIG;

function aplicarPrefixoNoBot(novo) {
    const px = String(novo || '').trim() || PREFIXO_DO_CONFIG;
    PREFIXO_ATUAL = px;

    for (const k of ['prefix', 'prefixo', 'PREFIX']) {
        if (k in CONFIG || k === 'prefix') {
            try { CONFIG[k] = px; } catch (_) {}
        }
    }

    try {
        global.prefix = px;
        global.prefixo = px;
    } catch (_) {}

    return px;
}

function prefixoAtual() {
    return PREFIXO_ATUAL;
}

// ============================================================
// DADOS DO BOT
// ============================================================

function primeiro(...valores) {
    for (const v of valores) {
        if (v === undefined || v === null) continue;
        const s = Array.isArray(v) ? String(v[0] ?? '') : String(v);
        if (s.trim()) return s.trim();
    }
    return '';
}

function primeiroNumero(v) {
    if (v === undefined || v === null) return '';
    const s = Array.isArray(v) ? String(v[0] ?? '') : String(v);
    const parte = s.split(/[,;|\n\/]+/).map((x) => x.trim()).find(Boolean) || '';
    return parte.replace(/@.*$/, '').replace(/\D/g, '');
}

function dadosDoBot() {
    return {
        bot: primeiro(CONFIG.botNome, CONFIG.nomeBot, CONFIG.botName, CONFIG.nome),
        dono: primeiroNumero(primeiro(CONFIG.donos?.[0], CONFIG.numerodono, CONFIG.dono)),
        prefix: PREFIXO_DO_CONFIG,
        versao: primeiro(CONFIG.versao, CONFIG.version),
        contato: primeiroNumero(primeiro(CONFIG.contato, CONFIG.suporte))
    };
}

function paramsDoBot() {
    const d = dadosDoBot();
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(d)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? '&' + s : '';
}

// ============================================================
// HELPERS
// ============================================================

const TENTATIVAS = 2;
const ESPERA_BASE = 1000;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function comRetry(nome, fn, tentativas = TENTATIVAS) {
    let ultimoErro;
    for (let i = 1; i <= tentativas; i++) {
        try {
            return await fn(i);
        } catch (e) {
            ultimoErro = e;
            if (i < tentativas) await dormir(ESPERA_BASE * i);
        }
    }
    throw ultimoErro;
}

async function api(caminho, opcoes = {}, tentativas = TENTATIVAS) {
    if (!APP_URL || APP_URL.includes('COLE_A_URL')) {
        const err = new Error('URL do app de menus não configurada');
        err.tipo = 'URL_VAZIA';
        throw err;
    }
    if (!APP_TOKEN || APP_TOKEN.includes('COLE_O_TOKEN') || !APP_TOKEN.trim()) {
        const err = new Error('Token do app de menus não configurado');
        err.tipo = 'TOKEN_VAZIO';
        throw err;
    }

    const base = APP_URL.replace(/\/$/, '');
    const url = `${base}${caminho}${caminho.includes('?') ? '&' : '?'}token=${encodeURIComponent(APP_TOKEN)}`;

    return comRetry(`API ${caminho}`, async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), APP_TIMEOUT);
        try {
            const res = await fetch(url, { ...opcoes, signal: controller.signal });
            const texto = await res.text();

            let dados;
            try {
                dados = JSON.parse(texto);
            } catch (_) {
                const err = new Error(`API retornou resposta inválida (${res.status})`);
                err.tipo = 'APP_OFFLINE';
                throw err;
            }

            if (res.status >= 500) {
                const err = new Error(`App de menus offline (${res.status})`);
                err.tipo = 'APP_OFFLINE';
                throw err;
            }

            if (!res.ok) {
                const err = new Error(dados.error || `API retornou erro ${res.status}`);
                err.tipo = 'API_ERRO';
                throw err;
            }

            return dados;

        } finally {
            clearTimeout(timer);
        }
    }, tentativas);
}

async function registrarLog(dados) {
    try {
        await api('/api/public/bot/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: APP_TOKEN, ...dados })
        }, 1);
    } catch (_) {}
}

async function baixar(url) {
    return comRetry('download de mídia', async () => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`falha ao baixar mídia (${res.status})`);
        return Buffer.from(await res.arrayBuffer());
    });
}

async function reagir(sock, chat, id, emoji) {
    try {
        await sock.sendMessage(chat, { react: { text: emoji, key: { remoteJid: chat, id } } });
    } catch (e) {}
}

// ============================================================
// CACHE DE MÍDIA
// ============================================================

const CACHE_MS = 60000;
const _cacheMidia = new Map();

async function baixarCache(url) {
    const hit = _cacheMidia.get(url);
    if (hit && Date.now() - hit.t < CACHE_MS) return hit.buffer;
    const buffer = await baixar(url);
    _cacheMidia.set(url, { t: Date.now(), buffer });
    return buffer;
}

// ============================================================
// MENSAGEM DE ERRO
// ============================================================

function mensagemAppNaoConfigurado(botNome) {
    return `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ⚠️ *APP DE MENUS*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 🔑 O app de menus não está
┃ configurado neste bot!

┃ 📌 *Para ativar, é grátis:*

┃ 1️⃣ Acesse o site
┃    🌐 ${APP_LINK}

┃ 2️⃣ Crie sua conta grátis

┃ 3️⃣ Copie o *token* no painel

┃ 4️⃣ Cole no *config.js*:
┃
┃    menuApp: {
┃      token: 'SEU_TOKEN_AQUI'
┃    }

┃ 5️⃣ Reinicie o bot

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🎁 *100% GRATUITO*
┃ 🌐 ${APP_LINK}
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${botNome} 』`;
}

function mensagemAppOffline(botNome) {
    return `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ⚠️ *APP DE MENUS OFFLINE*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 📡 Não foi possível conectar
┃ ao app de menus agora.

┃ 📌 Tente novamente em
┃ alguns minutos.

┃ 🔗 *Site do app:*
┃ 🌐 ${APP_LINK}

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${botNome} 』`;
}

// ============================================================
// ENVIA BOTÃO DO MENU (com lista + canal)
// ============================================================

async function enviarBotaoMenu(chave, chat, sock, msg, dados) {
    const texto = dados.inicial || `📋 *${chave.toUpperCase()}*\n\nAbra a lista abaixo para escolher um menu:`;
    const botNome = dadosDoBot().bot || 'JUFUFU Bot';

    const canalLink = CONFIG.canalLink || '';

    const botoes = [];

    botoes.push({
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
            title: '📂 Escolher um Menu',
            sections: [
                {
                    title: '📋 MENU PRINCIPAL',
                    rows: [
                        {
                            title: '📋 Menu Principal',
                            description: 'Todos os comandos do bot',
                            id: 'menu_menu'
                        },
                        {
                            title: '📚 Lista de Menus',
                            description: 'Ver todos os menus disponíveis',
                            id: 'menu_menus'
                        }
                    ]
                },
                {
                    title: '👑 MENUS ESPECIAIS',
                    rows: [
                        {
                            title: '👑 Menu ADM',
                            description: 'Comandos para administradores',
                            id: 'menu_menuadm'
                        },
                        {
                            title: '🔒 Menu Dono',
                            description: 'Comandos do dono do bot',
                            id: 'menu_menudono'
                        },
                        {
                            title: '🎮 Menu Brincadeira',
                            description: 'Comandos de diversão e brincadeiras',
                            id: 'menu_menubrincadeira'
                        }
                    ]
                }
            ]
        })
    });

    if (canalLink && canalLink.startsWith('http')) {
        botoes.push({
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: '📢 Canal do Bot',
                url: canalLink
            })
        });
    }

    const interactiveMessage = {
        body: { text: texto },
        footer: { text: botNome },
        nativeFlowMessage: { buttons: botoes }
    };

    const msgContent = generateWAMessageFromContent(chat, {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                },
                interactiveMessage
            }
        }
    }, { userJid: sock.user.id });

    try {
        await sock.relayMessage(chat, msgContent.message, {
            messageId: msgContent.key.id,
            additionalNodes: [
                {
                    tag: 'biz',
                    attrs: {},
                    content: [
                        {
                            tag: 'interactive',
                            attrs: { type: 'native_flow', v: '1' },
                            content: [
                                { tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }
                            ]
                        }
                    ]
                }
            ]
        });
    } catch (e) {
        // 🔥 FALLBACK: sem additionalNodes
        try {
            await sock.relayMessage(chat, msgContent.message, {
                messageId: msgContent.key.id
            });
        } catch (e2) {
            throw e2;
        }
    }

    return msgContent;
}

// ============================================================
// ENVIA MENU COMPLETO
// ============================================================

async function enviarMenuCompleto(sock, chat, msg, dados, chave) {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;

        let mediaBuffer = null;
        let mediaType = null;

        if (dados.media && dados.media.url) {
            try {
                mediaBuffer = await baixarCache(dados.media.url);
                mediaType = dados.media.gif ? 'video' : 'image';
            } catch (e) {}
        }

        if (mediaBuffer && mediaType === 'video') {
            await sock.sendMessage(chat, {
                video: mediaBuffer,
                caption: dados.completo,
                gifPlayback: true,
                mentions: [sender]
            }, { quoted: msg });
        } else if (mediaBuffer) {
            await sock.sendMessage(chat, {
                image: mediaBuffer,
                caption: dados.completo,
                mentions: [sender]
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chat, {
                text: dados.completo,
                mentions: [sender]
            }, { quoted: msg });
        }

        if (dados.audio) {
            try {
                const audioBuffer = await baixarCache(dados.audio);
                await sock.sendMessage(chat, {
                    audio: audioBuffer,
                    mimetype: 'audio/mp4',
                    ptt: true
                }, { quoted: msg });
            } catch (e) {}
        }

        registrarLog({
            tipo: 'envio',
            menu: chave,
            ok: true,
            mensagem: 'Menu enviado com sucesso.'
        });

        return true;

    } catch (error) {
        return false;
    }
}

// ============================================================
// ENVIA MENU DIRETO (FALLBACK)
// ============================================================

async function enviarMenuDireto(sock, chat, msg, dados, chave) {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;

        let mediaBuffer = null;
        let mediaType = null;

        if (dados.media && dados.media.url) {
            try {
                mediaBuffer = await baixarCache(dados.media.url);
                mediaType = dados.media.gif ? 'video' : 'image';
            } catch (e) {}
        }

        if (mediaBuffer && mediaType === 'video') {
            await sock.sendMessage(chat, {
                video: mediaBuffer,
                caption: dados.completo,
                gifPlayback: true,
                mentions: [sender]
            }, { quoted: msg });
        } else if (mediaBuffer) {
            await sock.sendMessage(chat, {
                image: mediaBuffer,
                caption: dados.completo,
                mentions: [sender]
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chat, {
                text: dados.completo,
                mentions: [sender]
            }, { quoted: msg });
        }

        if (dados.audio) {
            try {
                const audioBuffer = await baixarCache(dados.audio);
                await sock.sendMessage(chat, {
                    audio: audioBuffer,
                    mimetype: 'audio/mp4',
                    ptt: true
                }, { quoted: msg });
            } catch (e) {}
        }

    } catch (error) {}
}

// ============================================================
// ENVIA QUALQUER MENU
// ============================================================

async function enviarMenuApp(chave, chat, sock, msg) {
    const sender = msg.key.participant || msg.key.remoteJid;
    const numero = sender.split('@')[0];
    const botNome = dadosDoBot().bot || 'JUFUFU Bot';

    let dados;
    try {
        dados = await api(`/api/public/bot/menu?menu=${chave}&user=${numero}${paramsDoBot()}`);
    } catch (e) {
        if (e.tipo === 'TOKEN_VAZIO' || e.tipo === 'URL_VAZIA') {
            try {
                await sock.sendMessage(chat, {
                    text: mensagemAppNaoConfigurado(botNome)
                }, { quoted: msg });
            } catch (_) {}
            return;
        }

        if (e.tipo === 'APP_OFFLINE') {
            try {
                await sock.sendMessage(chat, {
                    text: mensagemAppOffline(botNome)
                }, { quoted: msg });
            } catch (_) {}
            return;
        }

        try {
            await sock.sendMessage(chat, {
                text: `❌ Não foi possível carregar o menu.\n\n🌐 ${APP_LINK}`
            }, { quoted: msg });
        } catch (_) {}
        return;
    }

    if (!dados || !dados.ok) {
        try {
            await sock.sendMessage(chat, {
                text: `❌ Erro ao carregar o menu. Tente novamente.`
            }, { quoted: msg });
        } catch (_) {}
        return;
    }

    try {
        await enviarBotaoMenu(chave, chat, sock, msg, dados);
    } catch (e) {
        await enviarMenuDireto(sock, chat, msg, dados, chave);
    }
}

// ============================================================
// RESPONDER BOTÃO DE MENU
// ============================================================

async function responderBotaoMenu(sock, chat, sender, msg, buttonId) {
    const botNome = dadosDoBot().bot || 'JUFUFU Bot';

    try {
        if (buttonId.startsWith('menu_')) {
            const chave = buttonId.replace('menu_', '');
            const numero = sender.split('@')[0];

            let dados;
            try {
                dados = await api(`/api/public/bot/menu?menu=${chave}&user=${numero}${paramsDoBot()}`);
            } catch (apiError) {
                if (apiError.tipo === 'TOKEN_VAZIO' || apiError.tipo === 'URL_VAZIA') {
                    await sock.sendMessage(chat, {
                        text: mensagemAppNaoConfigurado(botNome)
                    }, { quoted: msg });
                    return true;
                }

                if (apiError.tipo === 'APP_OFFLINE') {
                    await sock.sendMessage(chat, {
                        text: mensagemAppOffline(botNome)
                    }, { quoted: msg });
                    return true;
                }

                await sock.sendMessage(chat, {
                    text: `❌ Erro ao carregar o menu.\n\n🌐 ${APP_LINK}`
                }, { quoted: msg });
                return true;
            }

            if (!dados || !dados.ok) {
                await sock.sendMessage(chat, {
                    text: `❌ Erro ao carregar o menu. Tente novamente.`
                }, { quoted: msg });
                return true;
            }

            const enviado = await enviarMenuCompleto(sock, chat, msg, dados, chave);

            if (!enviado) {
                await enviarMenuDireto(sock, chat, msg, dados, chave);
            }

            return true;
        }

        if (buttonId.startsWith('fechar_')) {
            try {
                await sock.sendMessage(chat, { delete: msg.key });
            } catch (e) {}
            return true;
        }

        return false;

    } catch (error) {
        return false;
    }
}

// ============================================================
// COMANDOS DE MÍDIA (SOMENTE DONO)
// ============================================================

async function salvarMidiaDoApp(tipo, buffer, mime, duracao) {
    return api('/api/public/bot/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: APP_TOKEN,
            tipo,
            mime,
            duracao,
            base64: buffer.toString('base64')
        })
    });
}

async function cmdSetMidia(tipo, sock, chat, sender, msg, enviarResposta, downloadMediaMessage, P, isDono) {
    const botNome = dadosDoBot().bot || 'JUFUFU Bot';

    if (!(await isDono(sender))) {
        await enviarResposta(chat, sock, '🔒 Apenas o dono!', msg);
        return;
    }

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const alvoMsg = tipo === 'image' ? quoted?.imageMessage
        : tipo === 'video' ? quoted?.videoMessage
        : (quoted?.audioMessage || quoted?.videoMessage);

    if (!quoted || !alvoMsg) {
        const dica = tipo === 'image' ? '🖼️ Responda uma FOTO'
            : tipo === 'video' ? '📹 Responda um VÍDEO (até 20s)'
            : '🎵 Responda um ÁUDIO';
        await enviarResposta(chat, sock, dica, msg);
        return;
    }

    if (tipo === 'video' && alvoMsg.seconds && alvoMsg.seconds > 20) {
        await enviarResposta(chat, sock, '⏱️ Máximo 20 segundos!', msg);
        return;
    }

    await reagir(sock, chat, msg.key.id, '⏳');
    try {
        const buffer = await downloadMediaMessage({ message: quoted, key: msg.key }, 'buffer', {}, { logger: P({ level: 'silent' }) });
        const resp = await salvarMidiaDoApp(tipo, buffer, alvoMsg.mimetype, alvoMsg.seconds);
        if (!resp.ok) throw new Error(resp.error || 'erro no app');

        const nome = tipo === 'image' ? 'Foto' : tipo === 'video' ? 'Vídeo' : 'Áudio';
        await enviarResposta(chat, sock, `✅ ${nome} do menu atualizada!`, msg);
        await reagir(sock, chat, msg.key.id, '✅');
    } catch (e) {
        if (e.tipo === 'TOKEN_VAZIO' || e.tipo === 'URL_VAZIA') {
            await enviarResposta(chat, sock, mensagemAppNaoConfigurado(botNome), msg);
        } else if (e.tipo === 'APP_OFFLINE') {
            await enviarResposta(chat, sock, mensagemAppOffline(botNome), msg);
        } else {
            await enviarResposta(chat, sock, `❌ Erro: ${e.message}`, msg);
        }
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

async function cmdResetMenu(sock, chat, sender, msg, enviarResposta, isDono) {
    const botNome = dadosDoBot().bot || 'JUFUFU Bot';

    if (!(await isDono(sender))) {
        await enviarResposta(chat, sock, '🔒 Apenas o dono!', msg);
        return;
    }

    try {
        const resp = await api('/api/public/bot/media', { method: 'DELETE' });
        await enviarResposta(chat, sock, resp.ok ? '🗑️ Menu resetado!' : `❌ ${resp.error}`, msg);
    } catch (e) {
        if (e.tipo === 'TOKEN_VAZIO' || e.tipo === 'URL_VAZIA') {
            await enviarResposta(chat, sock, mensagemAppNaoConfigurado(botNome), msg);
        } else if (e.tipo === 'APP_OFFLINE') {
            await enviarResposta(chat, sock, mensagemAppOffline(botNome), msg);
        } else {
            await enviarResposta(chat, sock, `❌ Erro: ${e.message}`, msg);
        }
    }
}

// ============================================================
// ROTEADOR ÚNICO
// ============================================================

async function tratarComandoMenu(ctx) {
    const { comando, chat, sock, msg, sender, enviarResposta, verificarAdmin, isDono, downloadMediaMessage, P } = ctx;

    let bruto = String(comando || '').trim();
    if (PREFIXO_ATUAL && bruto.startsWith(PREFIXO_ATUAL)) bruto = bruto.slice(PREFIXO_ATUAL.length);

    const cmd = bruto
        .trim()
        .toLowerCase()
        .replace(/^[°!\/.#$%&*]+/, '');

    // ---- SETPREFIX ----
    if (['setprefix', 'setprefixo', 'resetprefix', 'resetprefixo'].includes(cmd)) {
        if (!(await isDono(sender))) {
            await enviarResposta(chat, sock, '🔒 Apenas o dono!', msg);
            return true;
        }

        const m = msg?.message || {};
        const texto = m.conversation || m.extendedTextMessage?.text || '';
        const reset = cmd.startsWith('reset');
        let valor = reset ? 'reset' : texto.trim().split(/\s+/).slice(1).join(' ').replace(/^<\s*|\s*>$/g, '').trim();

        if (!valor) {
            await enviarResposta(chat, sock,
                `ℹ️ Use: ${PREFIXO_ATUAL}setprefix <novo prefixo>\nEx: ${PREFIXO_ATUAL}setprefix !\nPara voltar: ${PREFIXO_ATUAL}resetprefix`,
                msg
            );
            return true;
        }

        if (!reset && (valor.length > 5 || /\s/.test(valor))) {
            await enviarResposta(chat, sock, '❌ O prefixo deve ter até 5 caracteres e sem espaços.', msg);
            return true;
        }

        try {
            const j = await api('/api/public/bot/set', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ token: APP_TOKEN, acao: 'prefixo', valor })
            }, 2);

            const novo = aplicarPrefixoNoBot(j.prefix);
            await enviarResposta(chat, sock, `✅ Prefixo alterado para *${novo}*`, msg);
        } catch (e) {
            await enviarResposta(chat, sock, `❌ Não consegui trocar o prefixo: ${e.message}`, msg);
        }
        return true;
    }

    // ---- MÍDIA ----
    if (cmd === 'setmenuimage') { await cmdSetMidia('image', sock, chat, sender, msg, enviarResposta, downloadMediaMessage, P, isDono); return true; }
    if (cmd === 'setmenuview' || cmd === 'setmenuvideo') { await cmdSetMidia('video', sock, chat, sender, msg, enviarResposta, downloadMediaMessage, P, isDono); return true; }
    if (cmd === 'setmenuaudio' || cmd === 'setmenuaudiodono') { await cmdSetMidia('audio', sock, chat, sender, msg, enviarResposta, downloadMediaMessage, P, isDono); return true; }
    if (cmd === 'resetmenu') { await cmdResetMenu(sock, chat, sender, msg, enviarResposta, isDono); return true; }

    // ---- COMANDOS POR LINK ----
    const acoesLink = { setfoto: 'imagem', setvideo: 'vídeo', setaudio: 'áudio', delmidia: 'delmidia' };

    if (acoesLink[cmd]) {
        if (!(await isDono(sender))) {
            await enviarResposta(chat, sock, '🔒 Apenas o dono!', msg);
            return true;
        }

        const m = msg?.message || {};
        const texto = m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || m.videoMessage?.caption || '';
        const valor = texto.trim().split(/\s+/).slice(1).join(' ');

        if (!valor && cmd !== 'delmidia') {
            await enviarResposta(chat, sock, `ℹ️ Use: ${PREFIXO_ATUAL}${cmd} <link>`, msg);
            return true;
        }

        try {
            const r = await fetch(APP_URL.replace(/\/$/, '') + '/api/public/bot/set', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ token: APP_TOKEN, acao: acoesLink[cmd], valor })
            });
            const j = await r.json().catch(() => ({}));
            _cacheMidia.clear();
            await enviarResposta(chat, sock, j.ok ? '✅ Pronto! Já vale no próximo menu.' : `❌ ${j.error || 'falhou'}`, msg);
        } catch (e) {
            await enviarResposta(chat, sock, `❌ Não consegui falar com o app: ${e.message}`, msg);
        }
        return true;
    }

    // ---- MENUS ----
    const MENUS = ['menu', 'menus', 'menuadm', 'menubrincadeira', 'menudono'];
    if (!MENUS.includes(cmd)) return false;

    if (cmd === 'menudono' && !(await isDono(sender))) {
        await enviarResposta(chat, sock, '🔒 SOMENTE O DONO!', msg);
        return true;
    }

    if (cmd === 'menuadm') {
        const admin = await verificarAdmin(sock, chat, sender);
        const dono = await isDono(sender);
        if (!admin && !dono) {
            await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
            return true;
        }
    }

    await enviarMenuApp(cmd, chat, sock, msg);
    return true;
}

// ============================================================
// AVISOS DO PAINEL
// ============================================================

let _notifTimer = null;

async function iniciarAvisosDoPainel(sock, intervaloMs = 60000) {
    if (_notifTimer) clearInterval(_notifTimer);

    if (!APP_TOKEN || !APP_TOKEN.trim()) return;

    const checar = async () => {
        try {
            const j = await api('/api/public/bot/notifications', {}, 1);
            if (!j.ok || !j.notificacoes?.length) return;
            const jid = String(j.dono).replace(/\D/g, '') + '@s.whatsapp.net';
            for (const n of j.notificacoes) {
                await sock.sendMessage(jid, { text: n.mensagem });
            }
        } catch (e) {
            // silenciado
        }
    };

    _notifTimer = setInterval(checar, intervaloMs);
    setTimeout(checar, 5000);
}

// ============================================================
// SINCRONIZAR PREFIXO
// ============================================================

async function sincronizarPrefixo() {
    try {
        const j = await api('/api/public/bot/prefix?' + paramsDoBot().slice(1), {}, 2);
        if (j && j.ok) aplicarPrefixoNoBot(j.prefix);
    } catch (_) {}
    return PREFIXO_ATUAL;
}

// ============================================================
// COMPATIBILIDADE
// ============================================================

const enviarMenu = (chat, sock, msg) => enviarMenuApp('menu', chat, sock, msg);
const enviarMenus = (chat, sock, msg) => enviarMenuApp('menus', chat, sock, msg);
const enviarMenuAdm = (chat, sock, msg) => enviarMenuApp('menuadm', chat, sock, msg);
const enviarMenuBrincadeira = (chat, sock, msg) => enviarMenuApp('menubrincadeira', chat, sock, msg);
const enviarMenuDono = (chat, sock, msg) => enviarMenuApp('menudono', chat, sock, msg);

// ============================================================
// EXPORTAR
// ============================================================

module.exports = {
    tratarComandoMenu,
    responderBotaoMenu,
    dadosDoBot,
    prefixoAtual,
    sincronizarPrefixo,
    iniciarAvisosDoPainel,
    enviarMenuApp,
    enviarMenu,
    enviarMenus,
    enviarMenuAdm,
    enviarMenuBrincadeira,
    enviarMenuDono,
    cmdSetMidia,
    cmdResetMenu
};