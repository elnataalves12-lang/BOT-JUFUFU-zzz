// ==================== SISTEMA DE LISTA NEGRA ====================
// services/blacklist.js

const fs = require('fs');
const path = require('path');

// ==================== INICIALIZAR ====================
function initBlacklist(db) {
    if (!db.blacklist) db.blacklist = {};
    if (!db.blacklistCount) db.blacklistCount = {};
    return db;
}

// ==================== SALVAR DB ====================
function salvarDB(db, DB_PATH) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    } catch (e) {
    }
}

// ==================== VERIFICAR SE ESTÁ NA LISTA ====================
function isInBlacklist(db, chat, user) {
    if (!db.blacklist) return false;
    if (!db.blacklist[chat]) return false;
    return !!db.blacklist[chat][user];
}

// ==================== ADICIONAR À LISTA NEGRA ====================
function addToBlacklist(db, chat, user, motivo = 'Sem motivo', admin) {
    initBlacklist(db);
    
    // Inicializa contador
    if (!db.blacklistCount) db.blacklistCount = {};
    if (!db.blacklistCount[chat]) db.blacklistCount[chat] = {};
    if (!db.blacklistCount[chat][user]) db.blacklistCount[chat][user] = 0;
    
    // Incrementa
    db.blacklistCount[chat][user]++;
    const count = db.blacklistCount[chat][user];
    
    // Se atingiu 3, BAN
    if (count >= 3) {
        return { banir: true, count: count };
    }
    
    // Adiciona à lista
    if (!db.blacklist[chat]) db.blacklist[chat] = {};
    db.blacklist[chat][user] = {
        motivo: motivo,
        admin: admin,
        data: new Date().toISOString(),
        count: count
    };
    
    return { banir: false, count: count };
}

// ==================== REMOVER DA LISTA NEGRA ====================
function removeFromBlacklist(db, chat, user) {
    if (!db.blacklist) return false;
    if (!db.blacklist[chat]) return false;
    if (!db.blacklist[chat][user]) return false;
    
    delete db.blacklist[chat][user];
    
    if (Object.keys(db.blacklist[chat]).length === 0) {
        delete db.blacklist[chat];
    }
    
    if (db.blacklistCount?.[chat]?.[user]) {
        delete db.blacklistCount[chat][user];
    }
    
    return true;
}

// ==================== FORMATAR LISTA ====================
function formatarBlacklist(db, chat, CONFIG) {
    if (!db.blacklist) return null;
    if (!db.blacklist[chat]) return null;
    
    const lista = db.blacklist[chat];
    const usuarios = Object.keys(lista);
    
    if (usuarios.length === 0) return null;
    
    let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ⬛ **LISTA NEGRA**
╰━━━━━━━━━━━━━━━━━━━━━⬢

📌 Total: ${usuarios.length} usuários\n\n`;

    for (const [user, data] of Object.entries(lista)) {
        const nome = user.split('@')[0];
        const admin = data.admin?.split('@')[0] || 'Desconhecido';
        const motivo = data.motivo || 'Sem motivo';
        const dataAdd = data.data ? new Date(data.data).toLocaleDateString('pt-BR') : 'N/A';
        const count = data.count || 0;
        
        texto += `👤 @${nome}
┃ 📝 Motivo: ${motivo}
┃ 👑 ADM: @${admin}
┃ 📅 ${dataAdd}
┃ ⚠️ ${count}/3
┃ ──────────────────────────\n`;
    }

    texto += `╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG?.botNome || 'JUFUFU Bot'} 』`;

    return texto;
}

// ==================== COMANDO: ADICIONAR ====================
async function cmdBlacklistAdd(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, CONFIG) {
    // Verifica se é ADM
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);
    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    // Pega o usuário mencionado
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const alvo = mentioned[0];

    if (!alvo) {
        await enviarResposta(chat, sock, `📌 Marque a pessoa: ${CONFIG.prefix}addblacklist @user <motivo>`, msg);
        return;
    }

    if (alvo === sender) {
        await enviarResposta(chat, sock, '❌ Você não pode se adicionar!', msg);
        return;
    }

    // Pega o motivo
    const motivo = args.slice(1).join(' ') || 'Sem motivo';

    // Adiciona à lista negra
    const result = addToBlacklist(db, chat, alvo, motivo, sender);
    salvarDB(db, DB_PATH);

    // Se for banir
    if (result.banir) {
        try {
            await sock.groupParticipantsUpdate(chat, [alvo], 'remove');
            await enviarResposta(chat, sock, `🔨 @${alvo.split('@')[0]} foi **BANIDO**!\n📊 3/3 adições à lista negra!`, msg, [alvo]);
            await reagir(sock, chat, msg.key.id, '🔨');
            
            // Remove da lista após o ban
            removeFromBlacklist(db, chat, alvo);
            salvarDB(db, DB_PATH);
            return;
        } catch (e) {
            await enviarResposta(chat, sock, `❌ Erro ao banir: ${e.message}`, msg);
            return;
        }
    }

    await enviarResposta(chat, sock, `⬛ @${alvo.split('@')[0]} adicionado à **LISTA NEGRA** (${result.count}/3)!\n📝 Motivo: ${motivo}`, msg, [alvo]);
    await reagir(sock, chat, msg.key.id, '⬛');
}

// ==================== COMANDO: REMOVER ====================
async function cmdBlacklistRemove(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, CONFIG) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);
    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const alvo = mentioned[0];

    if (!alvo) {
        await enviarResposta(chat, sock, `📌 Marque a pessoa: ${CONFIG.prefix}removeblacklist @user`, msg);
        return;
    }

    if (!isInBlacklist(db, chat, alvo)) {
        await enviarResposta(chat, sock, `⚠️ @${alvo.split('@')[0]} não está na lista negra!`, msg, [alvo]);
        return;
    }

    removeFromBlacklist(db, chat, alvo);
    salvarDB(db, DB_PATH);

    await enviarResposta(chat, sock, `⬜ @${alvo.split('@')[0]} removido da **LISTA NEGRA**!`, msg, [alvo]);
    await reagir(sock, chat, msg.key.id, '⬜');
}

// ==================== COMANDO: VER LISTA ====================
async function cmdBlacklistView(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, CONFIG) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);
    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    const texto = formatarBlacklist(db, chat, CONFIG);
    
    if (!texto) {
        await enviarResposta(chat, sock, '📋 Nenhum usuário na lista negra!', msg);
        return;
    }

    const lista = db.blacklist?.[chat] || {};
    const mentions = Object.keys(lista);
    
    await sock.sendMessage(chat, {
        text: texto,
        mentions: mentions
    }, { quoted: msg });

    await reagir(sock, chat, msg.key.id, '📋');
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdBlacklistAdd,
    cmdBlacklistRemove,
    cmdBlacklistView,
    initBlacklist,
    isInBlacklist,
    addToBlacklist,
    removeFromBlacklist
};