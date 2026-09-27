// ==================== REVELAR ====================
// services/revelar.js
//
// Revela mídias de "visualização única" (foto, vídeo, áudio)
// Reenvia como mídia normal
// Apenas administradores
// ============================================================

const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const P = require('pino');

// ==================== COMANDO ====================
async function cmdRevelar(chat, sock, sender, msg, args, enviarResposta, reagir, verificarAdmin, isDono, CONFIG) {
    // 🔥 SÓ ADM OU DONO
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores podem usar este comando!', msg);
        return;
    }

    // 🔥 PEGA A MENSAGEM RESPONDIDA
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;

    if (!quoted) {
        await enviarResposta(chat, sock, `📌 Responda uma mídia de visualização única com ${CONFIG.prefix}revelar`, msg);
        return;
    }

    // ============================================================
    // 🔥 DETECTA A MÍDIA (COM SUPORTE A VISUALIZAÇÃO ÚNICA)
    // ============================================================
    // O Baileys coloca as mídias "viewOnce" dentro de uma chave
    // chamada "viewOnceMessage" ou "viewOnceMessageV2"
    // ============================================================

    let midia = null;
    let tipo = null;

    // 🔥 TENTA PEGAR DE VIEWONCE (V1 ou V2)
    const viewOnceContent = 
        quoted.viewOnceMessage?.message ||
        quoted.viewOnceMessageV2?.message ||
        quoted.viewOnceMessageV2Extension?.message;

    // 🔥 SE FOR VIEWONCE, USA O CONTEÚDO INTERNO
    if (viewOnceContent) {
        if (viewOnceContent.imageMessage) {
            midia = viewOnceContent.imageMessage;
            tipo = 'imagem';
        } else if (viewOnceContent.videoMessage) {
            midia = viewOnceContent.videoMessage;
            tipo = 'video';
        } else if (viewOnceContent.audioMessage) {
            midia = viewOnceContent.audioMessage;
            tipo = 'audio';
        }
    }

    // 🔥 SE NÃO FOR VIEWONCE, TENTA DIRETO
    if (!midia) {
        if (quoted.imageMessage) {
            midia = quoted.imageMessage;
            tipo = 'imagem';
        } else if (quoted.videoMessage) {
            midia = quoted.videoMessage;
            tipo = 'video';
        } else if (quoted.audioMessage) {
            midia = quoted.audioMessage;
            tipo = 'audio';
        }
    }

    // 🔥 SE NÃO ACHOU MÍDIA
    if (!midia || !tipo) {
        await enviarResposta(chat, sock,
            '❌ Não encontrei uma mídia válida!\n\n' +
            '📌 Suportado: foto, vídeo e áudio',
            msg
        );
        await reagir(sock, chat, msg.key.id, '❌');
        return;
    }

    await reagir(sock, chat, msg.key.id, '🔄');

    try {
        // 🔥 MONTA A MENSAGEM PRA DOWNLOAD
        const target = {
            message: quoted,
            key: {
                remoteJid: chat,
                id: quotedInfo?.stanzaId,
                participant: quotedInfo?.participant
            }
        };

        // 🔥 BAIXA A MÍDIA
        const buffer = await downloadMediaMessage(
            target,
            'buffer',
            {},
            { logger: P({ level: 'silent' }) }
        );

        if (!buffer || buffer.length < 100) {
            throw new Error('Mídia vazia ou inválida');
        }

        // ============================================================
        // 🔥 REENVIA COMO MÍDIA NORMAL
        // ============================================================

        const caption = `👁️ *REVELADO*\n📌 Tipo: ${tipo}\n『 ${CONFIG.botNome} 』`;

        if (tipo === 'imagem') {
            await sock.sendMessage(chat, {
                image: buffer,
                caption: caption,
                mimetype: midia.mimetype || 'image/jpeg'
            }, { quoted: msg });

        } else if (tipo === 'video') {
            await sock.sendMessage(chat, {
                video: buffer,
                caption: caption,
                mimetype: midia.mimetype || 'video/mp4'
            }, { quoted: msg });

        } else if (tipo === 'audio') {
            // 🔥 ÁUDIO PTT (ondinha)
            await sock.sendMessage(chat, {
                audio: buffer,
                mimetype: midia.mimetype || 'audio/ogg; codecs=opus',
                ptt: true
            }, { quoted: msg });

            // 🔥 AVISA QUE FOI REVELADO
            await enviarResposta(chat, sock, `👁️ *REVELADO* — ${tipo}`, msg);
        }

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        await enviarResposta(chat, sock, `❌ Erro ao revelar: ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdRevelar
};