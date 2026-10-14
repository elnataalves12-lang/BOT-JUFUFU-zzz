// ==================== SISTEMA DE DONO ====================
// services/dono.js
// ============================================================
// - isDono() resolve LID → PN automaticamente
// - Comando °verdono
// ============================================================

const path = require('path');
const fs = require('fs');

// ==================== VARIÁVEIS ====================
let db = null;
let CONFIG = null;
let sockGlobal = null;

// ==================== INICIALIZAR ====================
function initModule(dbInstance, configInstance) {
    db = dbInstance;
    CONFIG = configInstance;
}

// ==================== SETAR SOCK ====================
function setSock(sockInstance) {
    sockGlobal = sockInstance;
}

// ==================== LIMPAR ID (só números) ====================
function limparId(str) {
    if (!str) return '';
    return String(str).replace(/\D/g, '');
}

// ==================== COMPARAR 2 NÚMEROS ====================
function mesmoNumero(a, b) {
    if (!a || !b) return false;
    const aNum = limparId(a);
    const bNum = limparId(b);
    if (!aNum || !bNum) return false;
    if (aNum === bNum) return true;
    if (aNum.length >= 10 && bNum.length >= 10) {
        if (aNum.slice(-10) === bNum.slice(-10)) return true;
    }
    if (aNum.length >= 8 && bNum.length >= 8) {
        if (aNum.slice(-8) === bNum.slice(-8)) return true;
    }
    return false;
}

// ==================== RESOLVER LID → PN ====================
// 🔥 Varre TODOS os grupos que o bot está, procurando o LID
// Quando acha, pega o .jid (número real)
async function resolverLidParaPn(lid) {
    if (!lid) return null;
    const lidStr = String(lid);
    if (!lidStr.includes('@lid')) return limparId(lidStr);

    const lidNum = lidStr.split('@')[0].split(':')[0];

    if (!sockGlobal) return lidNum;

    try {
        // 🔥 Tenta do store primeiro
        let groups = {};

        if (sockGlobal.store?.chats) {
            for (const [jid, chat] of Object.entries(sockGlobal.store.chats)) {
                if (jid.endsWith('@g.us')) groups[jid] = chat;
            }
        }

        // 🔥 Se não achou, busca dos grupos
        if (Object.keys(groups).length === 0) {
            try {
                groups = await sockGlobal.groupFetchAllParticipating();
            } catch (e) {}
        }

        // 🔥 PROCURA O LID EM CADA GRUPO
        for (const group of Object.values(groups)) {
            if (!group?.participants) continue;

            for (const p of group.participants) {
                const pId = String(p.id || '');
                const pLid = String(p.lid || '');
                const pJid = String(p.jid || p.phoneNumber || '');

                const pIdNum = pId.split('@')[0].split(':')[0];
                const pLidNum = pLid.split('@')[0].split(':')[0];

                // 🔥 ACHOU O LID
                if (pIdNum === lidNum || pLidNum === lidNum) {
                    if (pJid && pJid.includes('@s.whatsapp.net')) {
                        return limparId(pJid);
                    }
                    if (pId.includes('@s.whatsapp.net')) {
                        return limparId(pId);
                    }
                }
            }
        }

    } catch (e) {
        console.log('⚠️ Erro ao resolver LID:', e.message);
    }

    return lidNum;
}

// ==================== VERIFICAR SE É DONO ====================
async function isDono(sender) {
    try {
        if (!sender) return false;
        if (!db) return false;

        if (!Array.isArray(db.donos)) db.donos = [];
        if (!CONFIG?.donos) return false;
        if (!Array.isArray(CONFIG.donos)) CONFIG.donos = [];

        const todosDonos = [...CONFIG.donos, ...db.donos];

        // 🔥 PEGA NÚMERO DO SENDER (resolvendo LID)
        let senderNum = limparId(sender);

        if (String(sender).includes('@lid')) {
            const pn = await resolverLidParaPn(sender);
            if (pn) senderNum = pn;
        }

        // 🔥 COMPARA COM CADA DONO
        for (const dono of todosDonos) {
            if (!dono) continue;
            if (mesmoNumero(dono, senderNum)) {
                return true;
            }
        }

        return false;

    } catch (error) {
        console.error('❌ Erro em isDono:', error.message);
        return false;
    }
}

// ==================== ADICIONAR DONO ====================
async function adicionarDono(sender) {
    if (!db) return false;
    if (!Array.isArray(db.donos)) db.donos = [];

    let senderNum = limparId(sender);

    // 🔥 Se for LID, resolve
    if (String(sender).includes('@lid')) {
        const pn = await resolverLidParaPn(sender);
        if (pn) senderNum = pn;
    }

    if (!senderNum) return false;

    // 🔥 Verifica se já tem (comparando certo)
    const jaTem = db.donos.some(d => mesmoNumero(d, senderNum));

    if (!jaTem) {
        db.donos.push(senderNum);
        if (typeof global !== 'undefined' && global.salvarDB) global.salvarDB();
        return true;
    }

    return false;
}

// ==================== REMOVER DONO ====================
async function removerDono(sender) {
    if (!db) return false;
    if (!Array.isArray(db.donos)) db.donos = [];

    let senderNum = limparId(sender);

    if (String(sender).includes('@lid')) {
        const pn = await resolverLidParaPn(sender);
        if (pn) senderNum = pn;
    }

    const antes = db.donos.length;
    db.donos = db.donos.filter(d => !mesmoNumero(d, senderNum));

    if (db.donos.length !== antes) {
        if (typeof global !== 'undefined' && global.salvarDB) global.salvarDB();
        return true;
    }

    return false;
}

// ==================== SINCRONIZAR DONOS ====================
async function sincronizarDonos() {
    if (!db || !CONFIG) return;
    if (!Array.isArray(CONFIG.donos)) CONFIG.donos = [];
    if (!Array.isArray(db.donos)) db.donos = [];

    const donosConfig = CONFIG.donos.map(d => limparId(d));

    db.donos = db.donos.filter(d => {
        const dLimpo = limparId(d);
        return donosConfig.includes(dLimpo);
    });

    for (const dono of CONFIG.donos) {
        const donoLimpo = limparId(dono);
        if (donoLimpo && !db.donos.includes(donoLimpo)) {
            db.donos.push(donoLimpo);
        }
    }

    if (typeof global !== 'undefined' && global.salvarDB) global.salvarDB();
}

// ==================== COMANDO °VERDONO ====================
async function cmdVerDono(chat, sock, sender, msg, enviarResposta, reagir, CONFIG_) {
    const cfg = CONFIG_ || CONFIG;

    try {
        const donos = Array.isArray(cfg.donos) ? cfg.donos : [];

        if (donos.length === 0) {
            await enviarResposta(chat, sock, '📌 Nenhum dono configurado.', msg);
            return;
        }

        const donoPrincipal = donos[0];
        const numeroDono = limparId(donoPrincipal);

        if (!numeroDono) {
            await enviarResposta(chat, sock, '📌 Dono inválido.', msg);
            return;
        }

        let jidDono = numeroDono + '@s.whatsapp.net';
        let fotoUrl = null;
        try {
            fotoUrl = await sock.profilePictureUrl(jidDono, 'image');
        } catch (e) {}

        let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 👑 *DONO DO BOT*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 👤 @${numeroDono}
┃ 🤖 Bot: *${cfg.botNome || 'JUFUFU Bot'}*
┃ 📌 Prefixo: *${cfg.prefix || '°'}*`;

        if (donos.length > 1) {
            texto += `\n\n┃ 👥 *Outros donos:*\n`;
            for (let i = 1; i < donos.length; i++) {
                const outro = limparId(donos[i]);
                if (outro) texto += `┃ • @${outro}\n`;
            }
        }

        texto += `\n╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${cfg.botNome || 'JUFUFU Bot'} 』`;

        const mentions = donos.map(d => limparId(d) + '@s.whatsapp.net').filter(Boolean);

        if (fotoUrl) {
            await sock.sendMessage(chat, {
                image: { url: fotoUrl },
                caption: texto,
                mentions
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chat, {
                text: texto,
                mentions
            }, { quoted: msg });
        }

        if (reagir) await reagir(sock, chat, msg.key.id, '👑');

    } catch (error) {
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    initModule,
    setSock,
    isDono,
    adicionarDono,
    removerDono,
    sincronizarDonos,
    cmdVerDono,
    limparId,
    mesmoNumero,
    resolverLidParaPn
};