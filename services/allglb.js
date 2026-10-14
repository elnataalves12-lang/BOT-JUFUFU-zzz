// ==================== ALLGLB - COM BOTÕES ====================
// services/allglb.js
//
// Envia uma mensagem (texto ou mídia) para TODOS os grupos do bot.
//
// - 5 segundos de intervalo entre grupos (evita ban)
// - 2 botões em cada mensagem: 👑 Falar com Dono + 📢 Canal Oficial
// - Retry automático em caso de falha
// - Fallback sem botão se o grupo recusar
//
// ============================================================

const { downloadMediaMessage, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const P = require('pino');

// ⏱️ Intervalo entre grupos (agora 5s)
const DELAY_ENTRE_GRUPOS = 5000;

// 🔁 Tentativas por grupo (retry)
const MAX_TENTATIVAS = 2;

// ==================== PEGA PRIMEIRO DONO ====================
function pegarPrimeiroDono(CONFIG) {
    try {
        const donos = CONFIG.donos || CONFIG.numeroDono || [];
        const lista = Array.isArray(donos) ? donos : [donos];
        const primeiro = lista[0] || '';
        return String(primeiro).replace(/\D/g, '');
    } catch {
        return '';
    }
}

// ==================== ENVIA COM BOTÕES (INTERATIVO) ====================
// Usa a mesma técnica da função enviarResposta do index.js
// pra mostrar botões nativos do WhatsApp.
async function enviarComBotoes(sock, groupId, conteudo, texto, botoes, imagem = false) {
    const msgContent = generateWAMessageFromContent(groupId, {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                },
                interactiveMessage: {
                    body: { text: texto },
                    footer: { text: `💛 JUFUFU BOT` },
                    nativeFlowMessage: {
                        buttons: botoes
                    }
                }
            }
        }
    }, { userJid: sock.user.id });

    await sock.relayMessage(groupId, msgContent.message, {
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

// ==================== ENVIA MÍDIA COM BOTÕES ====================
async function enviarMidiaComBotoes(sock, groupId, buffer, mimetype, tipo, texto, botoes) {
    // Se não tem imagem/vídeo (texto puro), usa o interativo normal
    if (!buffer) {
        return await enviarComBotoes(sock, groupId, null, texto, botoes);
    }

    // 🔥 PRIMEIRO: tenta enviar com botão usando templateButtons
    // (alguns clientes aceitam, outros não)
    try {
        if (tipo === 'imagem') {
            await sock.sendMessage(groupId, {
                image: buffer,
                caption: texto,
                mimetype: mimetype || 'image/jpeg',
                footer: `💛 JUFUFU BOT`,
                templateButtons: botoes.map((b, i) => ({
                    index: i + 1,
                    urlButton: {
                        displayText: b.text,
                        url: b.url
                    }
                })).filter(b => b.urlButton.url)
            });
            return true;
        }

        if (tipo === 'video') {
            await sock.sendMessage(groupId, {
                video: buffer,
                caption: texto,
                mimetype: mimetype || 'video/mp4',
                footer: `💛 JUFUFU BOT`,
                templateButtons: botoes.map((b, i) => ({
                    index: i + 1,
                    urlButton: {
                        displayText: b.text,
                        url: b.url
                    }
                })).filter(b => b.urlButton.url)
            });
            return true;
        }
    } catch (e) {
        // Cai no fallback
    }

    // 🔥 FALLBACK: envia mídia normal SEM botões
    if (tipo === 'imagem') {
        await sock.sendMessage(groupId, {
            image: buffer,
            caption: texto,
            mimetype: mimetype || 'image/jpeg'
        });
    } else if (tipo === 'video') {
        await sock.sendMessage(groupId, {
            video: buffer,
            caption: texto,
            mimetype: mimetype || 'video/mp4'
        });
    }
    return false;
}

// ==================== COMANDO ====================
async function cmdAllGlb(chat, sock, sender, msg, args, enviarResposta, reagir, isDono, CONFIG) {
    // 🔒 SÓ DONO
    if (!(await isDono(sender))) {
        await enviarResposta(chat, sock, '🔒 Apenas o dono pode usar este comando!', msg);
        await reagir(sock, chat, msg.key.id, '❌');
        return;
    }

    await reagir(sock, chat, msg.key.id, '📢');

    try {
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        const quoted = contextInfo?.quotedMessage;
        const quotedStanzaId = contextInfo?.stanzaId;
        const quotedParticipant = contextInfo?.participant;

        let texto = args.join(' ').trim();
        let tipo = null;
        let midiaBuffer = null;
        let mimetype = null;

        // ==================== DETECTA TIPO ====================
        if (quoted) {
            const quotedFull = {
                message: quoted,
                key: { remoteJid: chat, id: quotedStanzaId, participant: quotedParticipant }
            };

            const image = quoted.imageMessage;
            const video = quoted.videoMessage;
            const audio = quoted.audioMessage;
            const sticker = quoted.stickerMessage;
            const extended = quoted.extendedTextMessage;

            if (audio || sticker) {
                await enviarResposta(chat, sock, '❌ Áudios e figurinhas não são suportados!', msg);
                return;
            }

            if (image) {
                tipo = 'imagem';
                mimetype = image.mimetype;
                texto = texto || image.caption || '';
                midiaBuffer = await downloadMediaMessage(quotedFull, 'buffer', {}, { logger: P({ level: 'silent' }) });
            } else if (video) {
                tipo = 'video';
                mimetype = video.mimetype;
                texto = texto || video.caption || '';
                midiaBuffer = await downloadMediaMessage(quotedFull, 'buffer', {}, { logger: P({ level: 'silent' }) });
            } else {
                tipo = 'texto';
                texto = texto || extended?.text || quoted.conversation || '';
            }
        } else {
            if (!texto) {
                await enviarResposta(chat, sock,
                    `📌 *Como usar:*\n\n` +
                    `▸ ${CONFIG.prefix}allglb sua mensagem\n` +
                    `▸ Responda uma foto/vídeo/texto com ${CONFIG.prefix}allglb`,
                    msg
                );
                return;
            }
            tipo = 'texto';
        }

        if (!texto && !midiaBuffer) {
            await enviarResposta(chat, sock, '❌ Nada para enviar!', msg);
            return;
        }

        // ==================== PEGA INFOS ====================
        const numeroDono = pegarPrimeiroDono(CONFIG);
        const linkDono = numeroDono ? `https://wa.me/${numeroDono}` : null;
        const canalLink = CONFIG.canalLink || CONFIG.linkCanal || null;

        const grupos = await sock.groupFetchAllParticipating();
        const groupIds = Object.keys(grupos);

        if (groupIds.length === 0) {
            await enviarResposta(chat, sock, '❌ Bot não está em nenhum grupo!', msg);
            return;
        }

        // ==================== MONTA BOTÕES ====================
        const botoes = [];

        if (linkDono) {
            botoes.push({
                text: '👑 Falar com Dono',
                url: linkDono,
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '👑 Falar com Dono',
                    url: linkDono
                })
            });
        }

        if (canalLink) {
            botoes.push({
                text: '📢 Canal Oficial',
                url: canalLink,
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '📢 Canal Oficial',
                    url: canalLink
                })
            });
        }

        const emojiTipo = tipo === 'imagem' ? '🖼️' : tipo === 'video' ? '🎥' : '📝';

        // ==================== MENSAGEM INICIAL ====================
        await sock.sendMessage(chat, {
            text: `📢 *INICIANDO DISPARO*\n\n${emojiTipo} Tipo: *${tipo}*\n📊 Total: *${groupIds.length}* grupos\n⏱️ Intervalo: ${DELAY_ENTRE_GRUPOS / 1000}s\n\n📝 "${texto.slice(0, 100)}"`
        }, { quoted: msg });

        let enviados = 0;
        let falhas = 0;

        // ==================== LOOP ====================
        for (let i = 0; i < groupIds.length; i++) {
            const groupId = groupIds[i];
            let sucesso = false;

            // 🔁 TENTATIVAS
            for (let tentativa = 1; tentativa <= MAX_TENTATIVAS && !sucesso; tentativa++) {
                try {
                    if (tipo === 'texto') {
                        // 🔥 TEXTO: usa o interativo com botões
                        await enviarComBotoes(sock, groupId, null, texto, botoes);
                        sucesso = true;
                    } else {
                        // 🔥 MÍDIA: tenta com botões, senão fallback sem botão
                        const ok = await enviarMidiaComBotoes(
                            sock, groupId, midiaBuffer, mimetype, tipo, texto, botoes
                        );
                        sucesso = true;
                    }
                } catch (err) {
                    // Espera um pouco antes de tentar de novo
                    if (tentativa < MAX_TENTATIVAS) {
                        await new Promise(r => setTimeout(r, 1500));
                    }
                }
            }

            if (sucesso) {
                enviados++;
            } else {
                // 🔥 FALLBACK FINAL: só texto/mídia sem botão
                try {
                    if (tipo === 'imagem') {
                        await sock.sendMessage(groupId, { image: midiaBuffer, caption: texto || '' });
                    } else if (tipo === 'video') {
                        await sock.sendMessage(groupId, { video: midiaBuffer, caption: texto || '', mimetype: 'video/mp4' });
                    } else {
                        await sock.sendMessage(groupId, { text: texto });
                    }
                    enviados++;
                } catch (e2) {
                    falhas++;
                }
            }

            // ⏱️ Delay entre grupos (5s)
            if (i < groupIds.length - 1) {
                if ((i + 1) % 5 === 0) {
                    await sock.sendMessage(chat, {
                        text: `⏳ ${i + 1}/${groupIds.length} enviados...`
                    }).catch(() => {});
                }
                await new Promise(r => setTimeout(r, DELAY_ENTRE_GRUPOS));
            }
        }

        // ==================== MENSAGEM FINAL ====================
        await sock.sendMessage(chat, {
            text: `╭━━━ 📢 *DISPARO FINALIZADO* ━━━⬣\n┃ ✅ Enviado: ${enviados}\n┃ ❌ Falhas: ${falhas}\n┃ 📊 Total: ${groupIds.length}\n╰━━━━━━━━━━━━━━━━━━━━⬣\n『 ${CONFIG.botNome} 』`
        });

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

module.exports = { cmdAllGlb, DELAY_ENTRE_GRUPOS };