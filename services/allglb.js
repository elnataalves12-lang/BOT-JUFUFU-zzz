// ==================== ALLGLB - COM 2 BOTÕES ====================
// services/allglb.js
// ============================================================

const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const P = require('pino');

const DELAY_ENTRE_GRUPOS = 30000;

function pegarPrimeiroDono(CONFIG) {
    try {
        const donos = CONFIG.donos || CONFIG.numeroDono || [];
        const lista = Array.isArray(donos)? donos : [donos];
        const primeiro = lista[0] || '';
        // limpa tudo que não é número
        return String(primeiro).replace(/\D/g, '');
    } catch {
        return '';
    }
}

async function cmdAllGlb(chat, sock, sender, msg, args, enviarResposta, reagir, isDono, CONFIG) {

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

        if (!texto &&!midiaBuffer) {
            await enviarResposta(chat, sock, '❌ Nada para enviar!', msg);
            return;
        }

        // ==================== PEGA INFOS DO CONFIG ====================
        const numeroDono = pegarPrimeiroDono(CONFIG);
        const linkDono = numeroDono? `https://wa.me/${numeroDono}` : null;
        const canalLink = CONFIG.canalLink || CONFIG.linkCanal || null;

        const grupos = await sock.groupFetchAllParticipating();
        const groupIds = Object.keys(grupos);

        if (groupIds.length === 0) {
            await enviarResposta(chat, sock, '❌ Bot não está em nenhum grupo!', msg);
            return;
        }

        const emojiTipo = tipo === 'imagem'? '🖼️' : tipo === 'video'? '🎥' : '📝';

        await sock.sendMessage(chat, {
            text: `📢 *INICIANDO DISPARO*\n\n${emojiTipo} Tipo: *${tipo}*\n📊 Total: *${groupIds.length}* grupos\n⏱️ Intervalo: ${DELAY_ENTRE_GRUPOS/1000}s\n\n📝 "${texto.slice(0,100)}"`
        }, { quoted: msg });

        let enviados = 0;
        let falhas = 0;

        // ==================== LOOP ====================
        for (let i = 0; i < groupIds.length; i++) {
            const groupId = groupIds[i];

            try {
                // Monta botões dinamicamente do config.js
                const botoes = [];

                if (linkDono) {
                    botoes.push({
                        buttonId: 'dono',
                        buttonText: { displayText: '👑 Falar com Dono' },
                        type: 1
                    });
                }

                if (canalLink) {
                    botoes.push({
                        buttonId: 'canal',
                        buttonText: { displayText: '📢 Canal Oficial' },
                        type: 1
                    });
                }

                // Fallback se não tiver nada no config
                if (botoes.length === 0) {
                    botoes.push({
                        buttonId: `${CONFIG.prefix}menu`,
                        buttonText: { displayText: `💛 ${CONFIG.botNome}` },
                        type: 1
                    });
                }

                // Envio com botão
                const templateButtons = [
                   ...(linkDono? [{ index: 1, urlButton: { displayText: '👑 Falar com Dono', url: linkDono } }] : []),
                   ...(canalLink? [{ index: botoes.length, urlButton: { displayText: '📢 Canal Oficial', url: canalLink } }] : [])
                ];

                if (tipo === 'imagem') {
                    await sock.sendMessage(groupId, {
                        image: midiaBuffer,
                        caption: texto || '',
                        footer: `💛 ${CONFIG.botNome}`,
                        templateButtons: templateButtons.length > 0? templateButtons : undefined
                    });
                } else if (tipo === 'video') {
                    await sock.sendMessage(groupId, {
                        video: midiaBuffer,
                        caption: texto || '',
                        mimetype: mimetype || 'video/mp4',
                        footer: `💛 ${CONFIG.botNome}`,
                        templateButtons: templateButtons.length > 0? templateButtons : undefined
                    });
                } else {
                    await sock.sendMessage(groupId, {
                        text: texto,
                        footer: `💛 ${CONFIG.botNome}`,
                        templateButtons: templateButtons.length > 0? templateButtons : undefined
                    });
                }

                enviados++;

            } catch (err) {
                // Fallback SEM botão (alguns grupos não aceitam)
                try {
                    if (tipo === 'imagem') await sock.sendMessage(groupId, { image: midiaBuffer, caption: texto || '' });
                    else if (tipo === 'video') await sock.sendMessage(groupId, { video: midiaBuffer, caption: texto || '', mimetype: 'video/mp4' });
                    else await sock.sendMessage(groupId, { text: texto });
                    enviados++;
                } catch (e2) {
                    falhas++;
                }
            }

            if (i < groupIds.length - 1) {
                if ((i + 1) % 5 === 0) {
                    await sock.sendMessage(chat, { text: `⏳ ${i + 1}/${groupIds.length} enviados...` }).catch(() => {});
                }
                await new Promise(r => setTimeout(r, DELAY_ENTRE_GRUPOS));
            }
        }

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