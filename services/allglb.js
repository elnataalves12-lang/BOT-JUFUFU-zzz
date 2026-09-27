// ==================== ALLGLB ====================
// services/allglb.js
//
// Envia uma mensagem para TODOS os grupos onde o bot está
// Suporta: texto, foto, vídeo
// NÃO suporta: áudio, figurinha
// Apenas o dono pode usar
// ============================================================

const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const P = require('pino');

// ==================== TEMPO ENTRE ENVIOS (ms) ====================
const DELAY_ENTRE_GRUPOS = 30000; // 30 segundos

// ==================== COMANDO PRINCIPAL ====================
async function cmdAllGlb(chat, sock, sender, msg, args, enviarResposta, reagir, isDono, CONFIG) {
    // 🔥 SÓ O DONO PODE
    const isDonoBot = await isDono(sender);
    if (!isDonoBot) {
        await enviarResposta(chat, sock, '🔒 Apenas o dono pode usar este comando!', msg);
        await reagir(sock, chat, msg.key.id, '❌');
        return;
    }

    await reagir(sock, chat, msg.key.id, '📢');

    try {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;

        let texto = args.join(' ').trim();
        let tipo = null;
        let midiaBuffer = null;

        // ============================================================
        // 🔥 DETECTA O TIPO DE MENSAGEM
        // ============================================================
        if (quoted) {
            const isImage = !!quoted.imageMessage;
            const isVideo = !!quoted.videoMessage;
            const isAudio = !!quoted.audioMessage;
            const isSticker = !!quoted.stickerMessage;

            // 🔥 BLOQUEIA ÁUDIO
            if (isAudio) {
                await enviarResposta(chat, sock,
                    '❌ *Áudios não são suportados!*\n\n' +
                    '📌 Suportado: texto, foto e vídeo',
                    msg
                );
                await reagir(sock, chat, msg.key.id, '❌');
                return;
            }

            // 🔥 BLOQUEIA FIGURINHA
            if (isSticker) {
                await enviarResposta(chat, sock,
                    '❌ *Figurinhas não são suportadas!*\n\n' +
                    '📌 Suportado: texto, foto e vídeo',
                    msg
                );
                await reagir(sock, chat, msg.key.id, '❌');
                return;
            }

            // 🔥 MONTA A MENSAGEM RESPONDIDA (pra download)
            const quotedMsg = {
                message: quoted,
                key: {
                    remoteJid: chat,
                    id: quotedInfo?.stanzaId,
                    participant: quotedInfo?.participant
                }
            };

            // 🔥 IMAGEM
            if (isImage) {
                tipo = 'imagem';
                midiaBuffer = await downloadMediaMessage(
                    quotedMsg,
                    'buffer',
                    {},
                    { logger: P({ level: 'silent' }) }
                );

                if (!texto) {
                    texto = quoted.imageMessage?.caption || '';
                }
            }

            // 🔥 VÍDEO
            else if (isVideo) {
                tipo = 'video';
                midiaBuffer = await downloadMediaMessage(
                    quotedMsg,
                    'buffer',
                    {},
                    { logger: P({ level: 'silent' }) }
                );

                if (!texto) {
                    texto = quoted.videoMessage?.caption || '';
                }
            }

            // 🔥 TEXTO PURO
            else {
                tipo = 'texto';
                if (!texto) {
                    texto = quoted.conversation ||
                            quoted.extendedTextMessage?.text ||
                            '';
                }
            }
        } else {
            // 🔥 SEM RESPOSTA — só texto digitado
            if (!texto) {
                await enviarResposta(chat, sock,
                    `📌 *Como usar o ${CONFIG.prefix}allglb:*\n\n` +
                    `▸ ${CONFIG.prefix}allglb <mensagem>\n` +
                    `▸ Responda uma *foto* com ${CONFIG.prefix}allglb\n` +
                    `▸ Responda um *vídeo* com ${CONFIG.prefix}allglb\n` +
                    `▸ Responda um *texto* com ${CONFIG.prefix}allglb\n\n` +
                    `⚠️ Áudios e figurinhas *não* são suportados.`,
                    msg
                );
                await reagir(sock, chat, msg.key.id, '❌');
                return;
            }
            tipo = 'texto';
        }

        // 🔥 BUSCA TODOS OS GRUPOS
        const groups = await sock.groupFetchAllParticipating();
        const groupIds = Object.keys(groups);

        if (groupIds.length === 0) {
            await enviarResposta(chat, sock, '❌ O bot não está em nenhum grupo!', msg);
            await reagir(sock, chat, msg.key.id, '❌');
            return;
        }

        // 🔥 RESUMO DO TIPO
        const emojiTipo = tipo === 'imagem' ? '🖼️' : tipo === 'video' ? '🎥' : '📝';
        const nomeTipo = tipo === 'imagem' ? 'Foto' : tipo === 'video' ? 'Vídeo' : 'Texto';

        // 🔥 MENSAGEM DE CONFIRMAÇÃO (usando sendMessage direto pra poder editar)
        const msgConfirm = await sock.sendMessage(chat, {
            text: `📢 *ENVIANDO PARA TODOS OS GRUPOS*\n\n` +
                `${emojiTipo} Tipo: *${nomeTipo}*\n` +
                `📊 Total: *${groupIds.length}* grupos\n` +
                `⏱️ Intervalo: *${DELAY_ENTRE_GRUPOS / 1000}s*\n\n` +
                (texto ? `📝 "${texto.slice(0, 100)}"` : '')
        }, { quoted: msg });

        let enviados = 0;
        let falhas = 0;
        const gruposFalha = [];

        // ============================================================
        // 🔥 LOOP DE ENVIO
        // ============================================================
        for (let i = 0; i < groupIds.length; i++) {
            const groupId = groupIds[i];

            try {
                if (tipo === 'imagem') {
                    await sock.sendMessage(groupId, {
                        image: midiaBuffer,
                        caption: texto || ''
                    });
                } else if (tipo === 'video') {
                    await sock.sendMessage(groupId, {
                        video: midiaBuffer,
                        caption: texto || '',
                        mimetype: 'video/mp4'
                    });
                } else {
                    await sock.sendMessage(groupId, {
                        text: texto
                    });
                }

                enviados++;

            } catch (err) {
                falhas++;
                gruposFalha.push(groupId);
            }

            // 🔥 INTERVALO ENTRE GRUPOS
            if (i < groupIds.length - 1) {
                if ((i + 1) % 5 === 0) {
                    try {
                        await sock.sendMessage(chat, {
                            text: `⏳ *Progresso:* ${i + 1}/${groupIds.length} grupos enviados...`,
                            edit: msgConfirm.key
                        });
                    } catch (e) {}
                }

                await new Promise(resolve => setTimeout(resolve, DELAY_ENTRE_GRUPOS));
            }
        }

        // ============================================================
        // 🔥 RELATÓRIO FINAL
        // ============================================================
        let resposta = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📢 *MENSAGEM ENVIADA*
╰━━━━━━━━━━━━━━━━━━━━━⬢

${emojiTipo} *Tipo:* ${nomeTipo}
✅ *Enviado:* ${enviados} grupos
❌ *Falhas:* ${falhas}
📊 *Total:* ${groupIds.length} grupos`;

        if (texto) {
            resposta += `\n\n📝 *Mensagem:*\n"${texto.slice(0, 200)}${texto.length > 200 ? '...' : ''}"`;
        }

        if (falhas > 0) {
            resposta += `\n\n⚠️ *Grupos com falha:*\n`;
            for (const id of gruposFalha.slice(0, 5)) {
                resposta += `┃ • ${id.split('@')[0]}\n`;
            }
            if (gruposFalha.length > 5) {
                resposta += `┃ • + ${gruposFalha.length - 5} outros\n`;
            }
        }

        resposta += `\n╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

        await sock.sendMessage(chat, {
            text: resposta,
            edit: msgConfirm.key
        });
        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdAllGlb,
    DELAY_ENTRE_GRUPOS
};