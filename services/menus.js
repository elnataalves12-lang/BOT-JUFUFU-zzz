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
// CONFIGURAÇÃO (vem do config.js)
// ============================================================

const APP_URL = CONFIG.menuApp?.baseUrl || '';
const APP_TOKEN = CONFIG.menuApp?.token || '';
const APP_TIMEOUT = CONFIG.menuApp?.timeout || 15000;

const MENUS = ['menu', 'menus', 'menuadm', 'menubrincadeira', 'menudono'];

// ============================================================
//  DADOS DO BOT VINDOS DO config.js
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

const TENTATIVAS = 4;
const ESPERA_BASE = 800;

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
        throw new Error('URL do app de menus não configurada no config.js (menuApp.baseUrl)');
    }
    if (!APP_TOKEN || APP_TOKEN.includes('COLE_O_TOKEN')) {
        throw new Error('Token do app de menus não configurado no config.js (menuApp.token)');
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
            try { dados = JSON.parse(texto); } catch (_) {
                throw new Error(`API retornou resposta inválida (${res.status})`);
            }
            if (!res.ok) throw new Error(dados.error || `API retornou erro ${res.status}`);
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
// ENVIA BOTÃO DO MENU
// ============================================================

async function enviarBotaoMenu(chave, chat, sock, msg, dados) {
    const texto = dados.inicial || `📋 *${chave.toUpperCase()}*\n\nClique em uma opção abaixo:`;
    const botNome = dadosDoBot().bot || 'JUFUFU Bot';

    const interactiveMessage = {
        body: { text: texto },
        footer: { text: botNome },
        nativeFlowMessage: {
            buttons: [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📋 Ver Menu',
                        id: `menu_${chave}`
                    })
                },
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '📂 Outros Menus',
                        sections: [
                            {
                                title: 'Escolha um menu',
                                rows: [
                                    {
                                        title: '📋 Menu Principal',
                                        description: 'Menu com todos os comandos',
                                        id: 'menu_menu'
                                    },
                                    {
                                        title: '👑 Menu ADM',
                                        description: 'Menu para administradores',
                                        id: 'menu_menuadm'
                                    },
                                    {
                                        title: '🎮 Menu Brincadeira',
                                        description: 'Menu de brincadeiras',
                                        id: 'menu_menubrincadeira'
                                    },
                                    {
                                        title: '🔒 Menu Dono',
                                        description: 'Menu do dono do bot',
                                        id: 'menu_menudono'
                                    },
                                    {
                                        title: '📚 Lista de Menus',
                                        description: 'Ver todos os menus',
                                        id: 'menu_menus'
                                    }
                                ]
                            }
                        ]
                    })
                }
            ]
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
            } catch (e) {
                console.log('⚠️ Erro ao baixar mídia:', e.message);
            }
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
        console.error(`❌ Erro no menu ${chave}:`, error.message);
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

    } catch (error) {
        console.error('❌ Erro no menu direto:', error.message);
    }
}

// ============================================================
// ENVIA QUALQUER MENU
// ============================================================

async function enviarMenuApp(chave, chat, sock, msg) {
    const sender = msg.key.participant || msg.key.remoteJid;
    const numero = sender.split('@')[0];

    let dados;
    try {
        dados = await api(`/api/public/bot/menu?menu=${chave}&user=${numero}${paramsDoBot()}`);
    } catch (e) {
        console.error('❌ App de menus offline:', e.message);
        try {
            await sock.sendMessage(chat, {
                text: `❌ Não consegui buscar o menu no aplicativo: ${e.message}`
            }, { quoted: msg });
        } catch (_) {}
        return;
    }

    if (!dados || !dados.ok) {
        try {
            await sock.sendMessage(chat, {
                text: `❌ Erro ao carregar o menu: ${(dados && dados.error) || 'resposta inválida'}`
            }, { quoted: msg });
        } catch (_) {}
        return;
    }

    try {
        await enviarBotaoMenu(chave, chat, sock, msg, dados);
    } catch (e) {
        console.error('❌ Erro ao enviar botão:', e.message);
        await enviarMenuDireto(sock, chat, msg, dados, chave);
    }
}

// ============================================================
// RESPONDER BOTÃO DE MENU
// ============================================================

async function responderBotaoMenu(sock, chat, sender, msg, buttonId) {
    try {
        if (buttonId.startsWith('menu_')) {
            const chave = buttonId.replace('menu_', '');
            const numero = sender.split('@')[0];

            let dados;
            try {
                dados = await api(`/api/public/bot/menu?menu=${chave}&user=${numero}${paramsDoBot()}`);
            } catch (apiError) {
                console.error(`❌ [MENU] Erro na API:`, apiError.message);
                await sock.sendMessage(chat, {
                    text: `❌ Erro ao buscar o menu: ${apiError.message}`
                }, { quoted: msg });
                return true;
            }

            if (!dados || !dados.ok) {
                console.error(`❌ [MENU] Dados inválidos:`, dados);
                await sock.sendMessage(chat, {
                    text: `❌ Erro ao carregar o menu. Tente novamente.`
                }, { quoted: msg });
                return true;
            }

            const enviado = await enviarMenuCompleto(sock, chat, msg, dados, chave);

            if (!enviado) {
                console.log(`⚠️ [MENU] Falhou, tentando menu direto...`);
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

        console.log(`⚠️ [MENU] Botão desconhecido: ${buttonId}`);
        return false;

    } catch (error) {
        console.error('❌ [MENU] Erro ao responder botão:', error);
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
        await enviarResposta(chat, sock, `❌ Erro: ${e.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

async function cmdResetMenu(sock, chat, sender, msg, enviarResposta, isDono) {
    if (!(await isDono(sender))) {
        await enviarResposta(chat, sock, '🔒 Apenas o dono!', msg);
        return;
    }
    const resp = await api('/api/public/bot/media', { method: 'DELETE' });
    await enviarResposta(chat, sock, resp.ok ? '🗑️ Menu resetado!' : `❌ ${resp.error}`, msg);
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

async function iniciarAvisosDoPainel(sock, intervaloMs = 30000) {
    if (_notifTimer) clearInterval(_notifTimer);
    const checar = async () => {
        try {
            const j = await api('/api/public/bot/notifications');
            if (!j.ok || !j.notificacoes?.length) return;
            const jid = String(j.dono).replace(/\D/g, '') + '@s.whatsapp.net';
            for (const n of j.notificacoes) {
                await sock.sendMessage(jid, { text: n.mensagem });
            }
        } catch (e) {
            console.error('[menus] aviso falhou:', e.message);
        }
    };
    _notifTimer = setInterval(checar, intervaloMs);
    checar();
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