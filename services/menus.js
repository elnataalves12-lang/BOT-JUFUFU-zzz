// ============================================================
//  JUFUFU BOT • CONEXÃO COM O APP DE MENUS
//  Arquivo: services/menus.js
//
//  Config da API no config.js → menuApp
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

// 🔥 LINK DO APP (fixo, sempre o mesmo)
const APP_LINK = 'https://quick-menu-bot.lovable.app/inicio';

const MENUS = ['menu', 'menus', 'menuadm', 'menubrincadeira', 'menudono'];

// ============================================================
// MENSAGEM DE ERRO PADRONIZADA
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
//  DADOS DO BOT
// ============================================================

function primeiro(...valores) {
    for (const v of valores) {
        if (v === undefined || v === null) continue;
        const s = Array.isArray(v) ? String(v[0] ?? '') : String(v);
        if (s.trim()) return s.trim();
    }
    return '';
}

function dadosDoBot() {
    return {
        bot: primeiro(CONFIG.botNome, CONFIG.nomeBot, CONFIG.botName, CONFIG.nome),
        dono: primeiro(CONFIG.donos?.[0], CONFIG.numerodono, CONFIG.dono),
        prefix: primeiro(CONFIG.prefix, CONFIG.prefixo),
        versao: primeiro(CONFIG.versao, CONFIG.version),
        contato: primeiro(CONFIG.contato, CONFIG.suporte)
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
    // 🔥 VALIDAÇÃO
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

            // 🔥 ERRO 500 → APP OFFLINE
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
// ENVIA BOTÃO DO MENU (só a lista + canal)
// ============================================================

async function enviarBotaoMenu(chave, chat, sock, msg, dados) {
    const texto = dados.inicial || `📋 *${chave.toUpperCase()}*\n\nAbra a lista abaixo para escolher um menu:`;
    const botNome = dadosDoBot().bot || 'JUFUFU Bot';

    // 🔥 LINK DO CANAL (vem do config.js)
    const canalLink = CONFIG.canalLink || '';

    // 🔥 BOTÕES
    const botoes = [];

    // 🔥 LISTA DE MENUS (organizada em 3 seções)
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

    // 🔥 BOTÃO DO CANAL (link do config.js)
    if (canalLink && canalLink.startsWith('http')) {
        botoes.push({
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: '📢 Canal do Bot',
                url: canalLink
            })
        });
    }

    // 🔥 MONTA A MENSAGEM INTERATIVA
    const interactiveMessage = {
        body: { text: texto },
        footer: { text: botNome },
        nativeFlowMessage: {
            buttons: botoes
        }
    };

    const msgContent = generateWAMessageFromContent(chat, {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                },
                interactiveMessage: interactiveMessage
            }
        }
    }, { userJid: sock.user.id });

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
        // 🔥 TOKEN NÃO CONFIGURADO
        if (e.tipo === 'TOKEN_VAZIO' || e.tipo === 'URL_VAZIA') {
            try {
                await sock.sendMessage(chat, {
                    text: mensagemAppNaoConfigurado(botNome)
                }, { quoted: msg });
            } catch (_) {}
            return;
        }

        // 🔥 APP OFFLINE
        if (e.tipo === 'APP_OFFLINE') {
            try {
                await sock.sendMessage(chat, {
                    text: mensagemAppOffline(botNome)
                }, { quoted: msg });
            } catch (_) {}
            return;
        }

        // 🔥 OUTROS ERROS
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
    const cmd = String(comando || '')
        .trim()
        .toLowerCase()
        .replace(/^[°!\/.#$%&*]+/, '');

    if (cmd === 'setmenuimage') { await cmdSetMidia('image', sock, chat, sender, msg, enviarResposta, downloadMediaMessage, P, isDono); return true; }
    if (cmd === 'setmenuview' || cmd === 'setmenuvideo') { await cmdSetMidia('video', sock, chat, sender, msg, enviarResposta, downloadMediaMessage, P, isDono); return true; }
    if (cmd === 'setmenuaudio' || cmd === 'setmenuaudiodono') { await cmdSetMidia('audio', sock, chat, sender, msg, enviarResposta, downloadMediaMessage, P, isDono); return true; }
    if (cmd === 'resetmenu') { await cmdResetMenu(sock, chat, sender, msg, enviarResposta, isDono); return true; }

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

    // 🔥 SE NÃO TEM TOKEN, NÃO TENTA
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
            // 🔥 SILENCIADO
        }
    };

    _notifTimer = setInterval(checar, intervaloMs);

    setTimeout(checar, 5000);
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