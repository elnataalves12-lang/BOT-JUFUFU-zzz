// ==================== BAN POR FIGURINHA ====================
// services/banSticker.js
//
// Fluxo:
//   1. ADM responde a figurinha de ban em alguém → bane o alvo
//   2. ADM usa °setbansticker (respondendo figurinha) → define qual figurinha é a de ban
//   3. ADM usa °delbansticker → remove a figurinha de ban
//   4. Qualquer um usa °verbansticker → vê qual é a figurinha
// ============================================================

// ==================== VARIÁVEIS GLOBAIS ====================
let db = null;
let salvarDB = null;
let verificarAdmin = null;
let isDono = null;

// ==================== INICIALIZAR ====================
function initModule(dbInstance, salvarDBFn, verificarAdminFn, isDonoFn) {
    db = dbInstance;
    salvarDB = salvarDBFn;
    verificarAdmin = verificarAdminFn;
    isDono = isDonoFn;
    console.log('✅ Módulo BanSticker inicializado!');
}

// ==================== PEGAR HASH DA FIGURINHA ====================
function getStickerHash(msg) {
    try {
        const sticker =
            msg.message?.stickerMessage ||
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;

        if (!sticker) return null;

        // fileSha256 é o ID único da figurinha
        if (sticker.fileSha256) {
            return Buffer.from(sticker.fileSha256).toString('base64');
        }

        // Fallback: fileEncSha256
        if (sticker.fileEncSha256) {
            return Buffer.from(sticker.fileEncSha256).toString('base64');
        }

        return null;
    } catch (e) {
        return null;
    }
}

// ==================== VERIFICAR SE É A FIGURINHA DE BAN ====================
function isStickerDeBan(chat, hash) {
    if (!db.banSticker) return false;
    if (!db.banSticker[chat]) return false;
    return db.banSticker[chat].hash === hash;
}

// ==================== PROCESSAR BAN POR FIGURINHA ====================
async function processarBanSticker(sock, chat, sender, msg) {
    try {
        // 🔥 SÓ EM GRUPOS
        if (!chat.endsWith('@g.us')) return false;

        // 🔥 PEGA O HASH DA FIGURINHA
        const hash = getStickerHash(msg);
        if (!hash) return false;

        // 🔥 VERIFICA SE É A FIGURINHA DE BAN
        if (!isStickerDeBan(chat, hash)) return false;

        // 🔥 VERIFICA SE QUEM MANDOU É ADM OU DONO
        const isAdmin = await verificarAdmin(sock, chat, sender);
        const isDonoBot = await isDono(sender);

        if (!isAdmin && !isDonoBot) {
            return false; // Membro comum mandando a figurinha → ignora
        }

        // 🔥 PEGA O ALVO (quem foi respondido)
        const contextInfo =
            msg.message?.stickerMessage?.contextInfo ||
            msg.message?.extendedTextMessage?.contextInfo;

        const alvo = contextInfo?.participant;

        if (!alvo) {
            await sock.sendMessage(chat, {
                text: '❌ Responda a mensagem de quem você quer banir com a figurinha de ban.'
            }, { quoted: msg });
            return true;
        }

        // 🔥 NÃO PODE BANIR O BOT
        if (alvo === sock.user.id) {
            await sock.sendMessage(chat, {
                text: '❌ Não posso me banir!'
            }, { quoted: msg });
            return true;
        }

        // 🔥 NÃO PODE BANIR OUTRO ADM
        const alvoAdmin = await verificarAdmin(sock, chat, alvo);
        if (alvoAdmin) {
            await sock.sendMessage(chat, {
                text: '🛡️ Não é possível banir um administrador!'
            }, { quoted: msg });
            return true;
        }

        // 🔥 NÃO PODE BANIR O DONO
        const alvoEhDono = await isDono(alvo);
        if (alvoEhDono) {
            await sock.sendMessage(chat, {
                text: '🔒 Não pode banir o dono do bot!'
            }, { quoted: msg });
            return true;
        }

        // 🔥 BANE
        await sock.groupParticipantsUpdate(chat, [alvo], 'remove');

        // 🔥 AVISA
        await sock.sendMessage(chat, {
            text: `👢 @${alvo.split('@')[0]} foi banido pela figurinha!`,
            mentions: [alvo]
        });

        return true;

    } catch (e) {
        console.error('❌ Erro no bansticker:', e.message);
        return false;
    }
}

// ==================== COMANDO: SETAR FIGURINHA DE BAN ====================
async function cmdSetBanSticker(chat, sock, sender, msg, enviarResposta, reagir, CONFIG) {
    // 🔥 SÓ ADM OU DONO
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores ou dono!', msg);
        return;
    }

    // 🔥 PEGA A FIGURINHA RESPONDIDA
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted || !quoted.stickerMessage) {
        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📌 *COMO USAR*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ Responda a uma figurinha com:
┃ ${CONFIG.prefix}setbansticker

┃ 💡 Essa figurinha vai virar
┃ a "figurinha de ban"!

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
            msg
        );
        return;
    }

    // 🔥 PEGA O HASH
    const hash = getStickerHash({ message: { stickerMessage: quoted.stickerMessage } });

    if (!hash) {
        await enviarResposta(chat, sock, '❌ Não consegui pegar o hash da figurinha!', msg);
        await reagir(sock, chat, msg.key.id, '❌');
        return;
    }

    // 🔥 SALVA NO DB
    if (!db.banSticker) db.banSticker = {};
    db.banSticker[chat] = {
        hash: hash,
        definidoPor: sender,
        definidoEm: new Date().toISOString()
    };
    salvarDB();

    await enviarResposta(chat, sock,
        `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ✅ *FIGURINHA DE BAN DEFINIDA*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 🔑 Hash: \`${hash.slice(0, 20)}...\`
┃ 👤 Por: @${sender.split('@')[0]}

┃ 📌 *Como usar:*
┃ Responda alguém com essa
┃ figurinha para banir!

┃ ⚠️ Só ADMs podem usar.

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
        msg,
        [sender]
    );
    await reagir(sock, chat, msg.key.id, '✅');
}

// ==================== COMANDO: DELETAR FIGURINHA DE BAN ====================
async function cmdDelBanSticker(chat, sock, sender, msg, enviarResposta, reagir, CONFIG) {
    // 🔥 SÓ ADM OU DONO
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores ou dono!', msg);
        return;
    }

    if (!db.banSticker?.[chat]) {
        await enviarResposta(chat, sock, '📌 Nenhuma figurinha de ban definida neste grupo!', msg);
        return;
    }

    delete db.banSticker[chat];
    salvarDB();

    await enviarResposta(chat, sock,
        `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🗑️ *FIGURINHA DE BAN REMOVIDA*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ ✅ Não tem mais figurinha
┃ de ban neste grupo.

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
        msg
    );
    await reagir(sock, chat, msg.key.id, '🗑️');
}

// ==================== COMANDO: VER FIGURINHA DE BAN ====================
async function cmdVerBanSticker(chat, sock, sender, msg, enviarResposta, reagir, CONFIG) {
    if (!db.banSticker?.[chat]) {
        await enviarResposta(chat, sock, '📌 Nenhuma figurinha de ban definida neste grupo!', msg);
        return;
    }

    const info = db.banSticker[chat];
    const quem = info.definidoPor?.split('@')[0] || 'Desconhecido';
    const quando = info.definidoEm ? new Date(info.definidoEm).toLocaleDateString('pt-BR') : 'N/A';

    await enviarResposta(chat, sock,
        `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 👢 *FIGURINHA DE BAN*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 🔑 Hash: \`${info.hash.slice(0, 20)}...\`
┃ 👤 Definido por: @${quem}
┃ 📅 Em: ${quando}

┃ 💡 Responda alguém com essa
┃ figurinha para banir!

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
        msg,
        [info.definidoPor]
    );
    await reagir(sock, chat, msg.key.id, '👢');
}

// ==================== EXPORTAR ====================
module.exports = {
    initModule,
    getStickerHash,
    isStickerDeBan,
    processarBanSticker,
    cmdSetBanSticker,
    cmdDelBanSticker,
    cmdVerBanSticker
};