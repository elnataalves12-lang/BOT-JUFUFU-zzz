// ==================== TRANSFORMAR FIGURINHA EM FOTO/GIF ====================
// services/stickerToMedia.js - VERSÃO DEFINITIVA PARA ANDROID

// ==================== VERIFICAR SE É WEBP ANIMADO ====================
function isAnimatedSticker(buffer) {
    try {
        const hex = buffer.toString('hex');
        return hex.includes('414e494d') || hex.includes('414e4d46');
    } catch (e) {
        return false;
    }
}

// ==================== FUNÇÃO PRINCIPAL ====================
async function cmdStickerToMedia(sock, chat, sender, msg, args, enviarResposta, reagir, downloadMediaMessage, P, CONFIG) {
    if (CONFIG.comandos?.stickerToMedia === false) {
        await enviarResposta(chat, sock, '⛔ O comando °sticker2img está desativado!', msg);
        return;
    }

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted || !quoted.stickerMessage) {
        await enviarResposta(chat, sock, `📌 Responda a uma figurinha com ${CONFIG.prefix}sticker2img`, msg);
        return;
    }

    await reagir(sock, chat, msg.key.id, '🔄');

    try {
        const target = { message: quoted, key: msg.key };
        const buffer = await downloadMediaMessage(target, 'buffer', {}, { logger: P({ level: 'silent' }) });
        
        if (!buffer || buffer.length < 100) {
            throw new Error('Figurinha inválida ou muito pequena');
        }

        const isAnimated = isAnimatedSticker(buffer);
        const botNome = CONFIG?.botNome || 'JUFUFU Bot';
        
        // 🔥 MÉTODO 1: TENTA ENVIAR COMO IMAGEM DIRETO
        // O WhatsApp aceita WebP como imagem, então funciona!
        try {
            await sock.sendMessage(chat, {
                image: buffer,
                caption: `🖼️ Figurinha convertida para imagem!\n📌 ${isAnimated ? 'Animada' : 'Estática'}\n『 ${botNome} 』`
            }, { quoted: msg });

            await reagir(sock, chat, msg.key.id, '✅');
            return;
        } catch (sendError) {
            console.log('⚠️ Erro ao enviar como imagem:', sendError.message);
        }

        // 🔥 MÉTODO 2: TENTA CONVERTER USANDO O PRÓPRIO BAILEYS
        try {
            // Baileys tem suporte nativo para converter stickers
            const { downloadMediaMessage } = require('@whiskeysockets/baileys');
            
            // Baixa como imagem (o Baileys já converte)
            const imageBuffer = await downloadMediaMessage(
                { message: quoted, key: msg.key },
                'image',
                {},
                { logger: P({ level: 'silent' }) }
            );
            
            if (imageBuffer && imageBuffer.length > 100) {
                await sock.sendMessage(chat, {
                    image: imageBuffer,
                    caption: `🖼️ Figurinha convertida (via Baileys)!\n『 ${botNome} 』`
                }, { quoted: msg });
                
                await reagir(sock, chat, msg.key.id, '✅');
                return;
            }
        } catch (baileysError) {
            console.log('⚠️ Erro no método Baileys:', baileysError.message);
        }

        // 🔥 MÉTODO 3: FALLBACK - AVISA QUE NÃO FOI POSSÍVEL
        await enviarResposta(chat, sock, 
            `⚠️ Não foi possível converter a figurinha.\n` +
            `📌 Tente enviar a figurinha como imagem manualmente.\n` +
            `📌 Ou tente com outra figurinha.`,
            msg
        );
        await reagir(sock, chat, msg.key.id, '⚠️');

    } catch (error) {
        console.error('❌ Erro ao converter figurinha:', error.message);
        await enviarResposta(chat, sock, `❌ Erro ao converter figurinha: ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdStickerToMedia,
    isAnimatedSticker
};