// ==================== WAIFU E NEKO ====================
// services/waifu.js
// ============================================================
// WAIFU → Ju API (/waifu)
// NEKO  → Ju API (/neko)
//
// Envio em carrossel com 1 card (header de imagem)
// ============================================================

const fetch = require('node-fetch');
const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const { verificarApiConfigurada } = require('./apiError.js');

// ============================================================
// 🔥 FUNÇÃO AUXILIAR: BUSCAR IMAGEM NA JU API
// ============================================================

async function buscarImagemJuApi(endpoint, CONFIG) {
    const { baseUrl, apiKey, timeout } = CONFIG.jufufuAPI;
    const url = `${baseUrl}/${endpoint}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout || 30000);

    let response;
    try {
        response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) {
        throw new Error(`API erro: ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok || !data.url) {
        throw new Error(data.error || 'API não retornou uma URL');
    }

    return {
        url: data.url,
        width: data.width || null,
        height: data.height || null
    };
}

// ============================================================
// 🔥 FUNÇÃO AUXILIAR: BAIXAR IMAGEM DA URL
// ============================================================

async function baixarImagem(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Erro ao baixar imagem: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer || buffer.length < 1000) {
        throw new Error('Imagem retornada está vazia ou inválida');
    }
    return buffer;
}

// ============================================================
// 🔥 FUNÇÃO AUXILIAR: ENVIAR CARROSSEL DE 1 CARD
// ============================================================

async function enviarCarrosselUmCard(sock, chat, msg, imageBuffer, titulo, texto, link, CONFIG) {
    // 🔥 GERA O CONTEÚDO DA IMAGEM (upload pro WhatsApp)
    const media = await generateWAMessageContent(
        { image: imageBuffer },
        { upload: sock.waUploadToServer }
    );

    // 🔥 MONTA OS BOTÕES
    const botoes = [];
    if (link && link.startsWith('http')) {
        botoes.push({
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: '🔗 Abrir imagem',
                url: link
            })
        });
    }

    // 🔥 CRIA O CARD
    const card = {
        body: proto.Message.InteractiveMessage.Body.create({ text: texto }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: titulo }),
        header: proto.Message.InteractiveMessage.Header.create({
            hasMediaAttachment: true,
            ...media
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: botoes
        })
    };

    // 🔥 MONTA O CARROSSEL COM 1 CARD
    const msgContent = generateWAMessageFromContent(chat, {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                },
                interactiveMessage: proto.Message.InteractiveMessage.create({
                    body: { text: `✨ *${titulo}*` },
                    footer: { text: CONFIG.botNome },
                    carouselMessage: {
                        cards: [card],
                        messageVersion: 1
                    }
                })
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
}

// ============================================================
// 1. WAIFU
// ============================================================

async function cmdWaifu(sock, chat, msg, enviarResposta, reagir, CONFIG) {
    // 🔥 VERIFICA A JU API
    if (!(await verificarApiConfigurada(CONFIG, chat, sock, msg, enviarResposta, reagir))) return;

    try {
        await reagir(sock, chat, msg.key.id, '⏳');

        // 🔥 BUSCA NA JU API
        const { url, width, height } = await buscarImagemJuApi('waifu', CONFIG);

        // 🔥 BAIXA A IMAGEM
        const imageBuffer = await baixarImagem(url);

        const texto = `🎀 To, sua Waifu.\n📐 ${width || '?'}x${height || '?'}`;
        const titulo = `✨ WAIFU`;

        // 🔥 ENVIA EM CARROSSEL
        await enviarCarrosselUmCard(
            sock,
            chat,
            msg,
            imageBuffer,
            titulo,
            texto,
            url,
            CONFIG
        );

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        try {
            await enviarResposta(
                chat,
                sock,
                `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ❌ *XIUU, DEU ERRO NA WAIFU*
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
                msg
            );
        } catch (_) {}

        try {
            await reagir(sock, chat, msg.key.id, '❌');
        } catch (_) {}
    }
}

// ============================================================
// 2. NEKO
// ============================================================

async function cmdNeko(sock, chat, msg, enviarResposta, reagir, CONFIG) {
    // 🔥 VERIFICA A JU API
    if (!(await verificarApiConfigurada(CONFIG, chat, sock, msg, enviarResposta, reagir))) return;

    try {
        await reagir(sock, chat, msg.key.id, '⏳');

        // 🔥 BUSCA NA JU API
        const { url, width, height } = await buscarImagemJuApi('neko', CONFIG);

        // 🔥 BAIXA A IMAGEM
        const imageBuffer = await baixarImagem(url);

        const texto = `🌸 Aqui está sua neko.\n📐 ${width || '?'}x${height || '?'}`;
        const titulo = `🐱 NEKO`;

        // 🔥 ENVIA EM CARROSSEL
        await enviarCarrosselUmCard(
            sock,
            chat,
            msg,
            imageBuffer,
            titulo,
            texto,
            url,
            CONFIG
        );

        await reagir(sock, chat, msg.key.id, '🐱');

    } catch (error) {
        try {
            await enviarResposta(
                chat,
                sock,
                `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ❌ *ACHO QUE DEU ERRO NA NEKO*
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
                msg
            );
        } catch (_) {}

        try {
            await reagir(sock, chat, msg.key.id, '❌');
        } catch (_) {}
    }
}

// ============================================================
// EXPORTAR
// ============================================================

module.exports = {
    cmdWaifu,
    cmdNeko
};