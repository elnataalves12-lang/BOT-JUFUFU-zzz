// ==================== SISTEMA DE DONO ====================
// services/dono.js
// ============================================================
// - Função isDono() independente
// - Comando °verdono (todos podem usar)
// - Aceita número, LID, JID
// ============================================================

const path = require('path');
const fs = require('fs');

// ==================== VARIÁVEIS ====================
let db = null;
let CONFIG = null;

// ==================== INICIALIZAR ====================
function initModule(dbInstance, configInstance) {
    db = dbInstance;
    CONFIG = configInstance;
}

// ==================== LIMPAR ID (número, LID, JID) ====================
function limparId(str) {
    if (!str) return '';
    return String(str).split('@')[0].split(':')[0];
}

// ==================== VERIFICAR SE É DONO ====================
async function isDono(sender) {
    try {
        if (!sender) return false;

        // 🔥 LIMPA O SENDER
        const senderId = limparId(sender);

        // 🔥 GARANTE QUE AS LISTAS EXISTEM
        if (!db) return false;
        if (!Array.isArray(db.donos)) db.donos = [];
        if (!CONFIG?.donos) return false;
        if (!Array.isArray(CONFIG.donos)) CONFIG.donos = [];

        // 🔥 JUNTA CONFIG + DB
        const todosDonos = [...CONFIG.donos, ...db.donos];

        // 🔥 CHECA CADA DONO
        for (const dono of todosDonos) {
            if (!dono) continue;

            const donoLimpo = limparId(dono);

            if (donoLimpo === senderId) return true;
        }

        return false;

    } catch (error) {
        return false;
    }
}

// ==================== ADICIONAR DONO ====================
async function adicionarDono(sender) {
    if (!db) return false;
    if (!Array.isArray(db.donos)) db.donos = [];

    const senderId = limparId(sender);

    if (!db.donos.includes(senderId)) {
        db.donos.push(senderId);

        // 🔥 SALVA O DB
        if (typeof global !== 'undefined' && global.salvarDB) {
            global.salvarDB();
        }

        return true;
    }

    return false;
}

// ==================== REMOVER DONO ====================
async function removerDono(sender) {
    if (!db) return false;
    if (!Array.isArray(db.donos)) db.donos = [];

    const senderId = limparId(sender);
    const antes = db.donos.length;

    db.donos = db.donos.filter(d => limparId(d) !== senderId);

    if (db.donos.length !== antes) {
        if (typeof global !== 'undefined' && global.salvarDB) {
            global.salvarDB();
        }

        return true;
    }

    return false;
}

// ==================== SINCRONIZAR DONOS ====================
// Remove do db.donos quem não está mais no config.donos
// E adiciona no db.donos quem está no config.donos
async function sincronizarDonos() {
    if (!db || !CONFIG) return;

    if (!Array.isArray(CONFIG.donos)) CONFIG.donos = [];
    if (!Array.isArray(db.donos)) db.donos = [];

    // 🔥 LIMPA O DB (só mantém quem tá no config)
    const donosConfig = CONFIG.donos.map(d => limparId(d));

    db.donos = db.donos.filter(d => {
        const dLimpo = limparId(d);
        return donosConfig.includes(dLimpo);
    });

    // 🔥 ADICIONA NO DB QUEM TÁ NO CONFIG (pra facilitar buscas)
    for (const dono of CONFIG.donos) {
        const donoLimpo = limparId(dono);
        if (donoLimpo && !db.donos.includes(donoLimpo)) {
            db.donos.push(donoLimpo);
        }
    }

    if (typeof global !== 'undefined' && global.salvarDB) {
        global.salvarDB();
    }
}

// ==================== COMANDO °VERDONO ====================
// Mostra o dono com foto e @
async function cmdVerDono(chat, sock, sender, msg, enviarResposta, reagir, CONFIG_) {
    const cfg = CONFIG_ || CONFIG;

    try {
        // 🔥 PEGA A LISTA DE DONOS
        const donos = Array.isArray(cfg.donos) ? cfg.donos : [];

        if (donos.length === 0) {
            await enviarResposta(chat, sock, '📌 Nenhum dono configurado.', msg);
            return;
        }

        // 🔥 PEGA O PRIMEIRO DONO
        const donoPrincipal = donos[0];
        const numeroDono = limparId(donoPrincipal);

        if (!numeroDono) {
            await enviarResposta(chat, sock, '📌 Dono inválido.', msg);
            return;
        }

        // 🔥 MONTA O JID
        let jidDono = numeroDono.includes('@') ? numeroDono : numeroDono + '@s.whatsapp.net';

        // 🔥 TENTA PEGAR A FOTO
        let fotoUrl = null;
        try {
            fotoUrl = await sock.profilePictureUrl(jidDono, 'image');
        } catch (e) {
            fotoUrl = null;
        }

        // 🔥 MONTA A MENSAGEM
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

        // 🔥 MENÇÕES (TODOS OS DONOS)
        const mentions = donos.map(d => {
            const n = limparId(d);
            return n.includes('@') ? n : n + '@s.whatsapp.net';
        }).filter(Boolean);

        // 🔥 ENVIA
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

        if (reagir) {
            await reagir(sock, chat, msg.key.id, '👑');
        }

    } catch (error) {
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    initModule,
    isDono,
    adicionarDono,
    removerDono,
    sincronizarDonos,
    cmdVerDono,
    limparId
};