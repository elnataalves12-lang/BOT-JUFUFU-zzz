// ==================== BANIR NA ENTRADA ====================
// services/blacklistJoin.js
// ============================================================
// Quando alguém entra no grupo:
//   - Se estiver na blacklist E NÃO foi um ADM que adicionou → bane
//   - Se foi um ADM que adicionou → deixa passar (respeita)
// ============================================================

// ==================== VERIFICAR E BANIR ====================
async function verificarBlacklistNaEntrada(sock, chat, participant, author = null) {
    try {
        const db = global.db || {};
        if (!db.blacklist || !db.blacklist[chat]) return;

        const participantId = typeof participant === 'string' ? participant : participant.id;
        if (!participantId) return;

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

        // ============================================================
        // 🔥 VERIFICA SE FOI UM ADM QUE ADICIONOU
        // ============================================================
        if (author) {
            try {
                const metadata = await sock.groupMetadata(chat);

                for (const p of metadata.participants) {
                    const pId = String(p.id || '').split('@')[0].split(':')[0];
                    const pLid = String(p.lid || '').split('@')[0].split(':')[0];
                    const pJid = String(p.jid || p.phoneNumber || '').split('@')[0].split(':')[0];

                    const authorLimpo = String(author).split('@')[0].split(':')[0];

                    if (pId === authorLimpo || pLid === authorLimpo || pJid === authorLimpo) {
                        // 🔥 É ADM OU CRIADOR?
                        if (p.admin === 'admin' || p.admin === 'superadmin') {
                            // 🔥 FOI UM ADM QUE ADICIONOU → DEIXA PASSAR
                            console.log(`✅ ADM ${authorLimpo} adicionou ${userId}, respeitando`);

                            // 🔥 REMOVE DA BLACKLIST (foi "perdoado" pelo ADM)
                            delete db.blacklist[chat][userId];
                            if (global.salvarDB) global.salvarDB();

                            return;
                        }
                    }
                }
            } catch (e) {}
        }

        // ============================================================
        // 🔥 SE NÃO FOI ADM → BANE
        // ============================================================
        try {
            await sock.groupParticipantsUpdate(chat, [participantId], 'remove');

            const motivo = dadosBlacklist?.motivo || 'Sem motivo';

            await sock.sendMessage(chat, {
                text: `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🚫 *BANIDO AUTOMATICAMENTE*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 👤 @${userId}
┃ 📝 Motivo: ${motivo}
┃ ⚠️ Estava na lista negra!

╰━━━━━━━━━━━━━━━━━━━━━⬢`,
                mentions: [participantId]
            });

            // 🔥 REMOVE DA LISTA (já foi banido)
            delete db.blacklist[chat][userId];
            if (global.salvarDB) global.salvarDB();

        } catch (e) {
            console.error('❌ Erro ao banir na entrada:', e.message);
        }

    } catch (e) {
        console.error('❌ Erro no blacklistJoin:', e.message);
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    verificarBlacklistNaEntrada
};