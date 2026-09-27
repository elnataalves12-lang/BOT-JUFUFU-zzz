// ==================== BANIR NA ENTRADA ====================
// services/blacklistJoin.js
// ============================================================
// Quando alguém entra no grupo, se estiver na blacklist, é banido
// ============================================================

// ==================== VERIFICAR E BANIR ====================
async function verificarBlacklistNaEntrada(sock, chat, participant) {
    try {
        // 🔥 PEGA O DB GLOBAL
        const db = global.db || {};
        if (!db.blacklist || !db.blacklist[chat]) return;

        const participantId = typeof participant === 'string' ? participant : participant.id;
        if (!participantId) return;

        // 🔥 LIMPA O ID
        const userId = String(participantId).split('@')[0].split(':')[0];

        // 🔥 VERIFICA SE TÁ NA BLACKLIST
        let estaNaLista = false;
        let dadosBlacklist = null;

        for (const chave of Object.keys(db.blacklist[chat])) {
            const chaveLimpa = String(chave).split('@')[0].split(':')[0];
            if (chaveLimpa === userId) {
                estaNaLista = true;
                dadosBlacklist = db.blacklist[chat][chave];
                break;
            }
        }

        if (!estaNaLista) return;

        // 🔥 BANE IMEDIATAMENTE
        try {
            await sock.groupParticipantsUpdate(chat, [participantId], 'remove');

            // 🔥 AVISA NO GRUPO
            const motivo = dadosBlacklist?.motivo || 'Sem motivo';

            await sock.sendMessage(chat, {
                text: `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🚫 **BANIDO AUTOMATICAMENTE**
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 👤 @${userId}
┃ 📝 Motivo: ${motivo}
┃ ⚠️ Estava na lista negra!

╰━━━━━━━━━━━━━━━━━━━━━⬢`,
                mentions: [participantId]
            });

            // 🔥 REMOVE DA LISTA (já foi banido)
            delete db.blacklist[chat][userId];

            // 🔥 SALVA O DB
            if (global.salvarDB) global.salvarDB();

        } catch (e) {
            // Se falhar ao banir, só ignora
        }

    } catch (e) {}
}

// ==================== EXPORTAR ====================
module.exports = {
    verificarBlacklistNaEntrada
};