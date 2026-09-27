// ==================== SISTEMA DE LISTA NEGRA ====================
// services/blacklist.js
// ============================================================
// Aceita @menção, número, LID, JID completo
// Motivo opcional
// Confirmação com foto de perfil
// ============================================================

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

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
    } catch (e) {}
}

// ==================== LIMPAR NÚMERO ====================
function limparNumero(str) {
    if (!str) return '';
    return String(str).replace(/\D/g, '');
}

// ==================== 🔥 RECONHECER USUÁRIO ====================
// Retorna { jid, numero } ou null
// jid = JID real pra mencionar
// numero = número pra exibir no texto

async function reconhecerUsuario(sock, chat, args, msg) {
    // 🔥 1. TENTA POR MENÇÃO
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentioned.length > 0) {
        const jid = mentioned[0];
        const numero = jid.split('@')[0].split(':')[0];
        return { jid, numero };
    }

    // 🔥 2. TENTA POR RESPOSTA
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (quoted) {
        const numero = quoted.split('@')[0].split(':')[0];
        return { jid: quoted, numero };
    }

    // 🔥 3. TENTA POR TEXTO
    if (!args || args.length === 0) return null;

    // Pega o primeiro argumento que pareça um número ou JID
    let alvoRaw = null;
    for (const arg of args) {
        const limpo = String(arg).replace(/[^0-9@.\-a-z]/gi, '');
        if (limpo && limpo.length >= 5) {
            alvoRaw = limpo;
            break;
        }
    }

    if (!alvoRaw) return null;

    // 🔥 SE JÁ TEM @, USA DIRETO
    if (alvoRaw.includes('@')) {
        const numero = alvoRaw.split('@')[0].split(':')[0];
        return { jid: alvoRaw, numero };
    }

    // 🔥 SÓ NÚMEROS
    const numero = limparNumero(alvoRaw);
    if (!numero || numero.length < 8) return null;

    // 🔥 TENTA ACHAR NO GRUPO PRIMEIRO (PROCURA O JID/LID REAL)
    try {
        const metadata = await sock.groupMetadata(chat);

        for (const p of metadata.participants) {
            const pId = String(p.id || '');
            const pLid = String(p.lid || '');
            const pJid = String(p.jid || p.phoneNumber || '');

            const pIdNum = pId.split('@')[0].split(':')[0];
            const pLidNum = pLid.split('@')[0].split(':')[0];
            const pJidNum = pJid.split('@')[0].split(':')[0];

            // 🔥 SE ENCONTRAR, RETORNA O JID REAL (O QUE VAI MENCIONAR)
            if (pIdNum === numero || pLidNum === numero || pJidNum === numero) {
                // Prefere o JID (@s.whatsapp.net) se existir
                const jidFinal = pId.includes('@s.whatsapp.net') ? pId
                    : pJid.includes('@s.whatsapp.net') ? pJid
                    : pLid.includes('@lid') ? pLid
                    : pId;

                return { jid: jidFinal, numero };
            }
        }
    } catch (e) {}

    // 🔥 SE NÃO ACHOU NO GRUPO, MONTA O JID PADRÃO
    return {
        jid: numero + '@s.whatsapp.net',
        numero: numero
    };
}

// ==================== VERIFICAR SE ESTÁ NA LISTA ====================
function isInBlacklist(db, chat, user) {
    if (!db.blacklist) return false;
    if (!db.blacklist[chat]) return false;

    const userId = String(user).split('@')[0].split(':')[0];

    for (const chave of Object.keys(db.blacklist[chat])) {
        const chaveLimpa = String(chave).split('@')[0].split(':')[0];
        if (chaveLimpa === userId) return true;
    }

    return false;
}

// ==================== ADICIONAR À LISTA NEGRA ====================
function addToBlacklist(db, chat, user, motivo = 'Sem motivo', admin) {
    initBlacklist(db);

    const userId = String(user).split('@')[0].split(':')[0];
    const userKey = userId;

    if (!db.blacklistCount) db.blacklistCount = {};
    if (!db.blacklistCount[chat]) db.blacklistCount[chat] = {};
    if (!db.blacklistCount[chat][userKey]) db.blacklistCount[chat][userKey] = 0;

    db.blacklistCount[chat][userKey]++;
    const count = db.blacklistCount[chat][userKey];

    if (!db.blacklist[chat]) db.blacklist[chat] = {};
    db.blacklist[chat][userKey] = {
        motivo: motivo,
        admin: admin,
        data: new Date().toISOString(),
        count: count,
        original: user
    };

    return { banir: false, count: count };
}

// ==================== REMOVER DA LISTA NEGRA ====================
function removeFromBlacklist(db, chat, user) {
    if (!db.blacklist) return false;
    if (!db.blacklist[chat]) return false;

    const userId = String(user).split('@')[0].split(':')[0];

    for (const chave of Object.keys(db.blacklist[chat])) {
        const chaveLimpa = String(chave).split('@')[0].split(':')[0];
        if (chaveLimpa === userId) {
            delete db.blacklist[chat][chave];

            if (db.blacklistCount?.[chat]?.[chave]) {
                delete db.blacklistCount[chat][chave];
            }

            if (Object.keys(db.blacklist[chat]).length === 0) {
                delete db.blacklist[chat];
            }

            return true;
        }
    }

    return false;
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

        texto += `👤 @${nome}
┃ 📝 Motivo: ${motivo}
┃ 👑 ADM: @${admin}
┃ 📅 ${dataAdd}
┃ ──────────────────────────\n`;
    }

    texto += `╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG?.botNome || 'JUFUFU Bot'} 』`;

    return texto;
}

// ==================== 🔥 ENVIAR CONFIRMAÇÃO COM FOTO ====================
async function enviarConfirmacao(sock, chat, alvo, motivo, CONFIG) {
    // alvo agora é { jid, numero }
    const { jid, numero } = alvo;

    // 🔥 TENTA PEGAR A FOTO
    let fotoUrl = null;
    try {
        fotoUrl = await sock.profilePictureUrl(jid, 'image');
    } catch (e) {
        fotoUrl = null;
    }

    const texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ⬛ **USUÁRIO ADICIONADO**
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 👤 @${numero}
┃ 📝 Motivo: ${motivo}
┃ ⚠️ Se voltar, será banido automaticamente!

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

    try {
        if (fotoUrl) {
            await sock.sendMessage(chat, {
                image: { url: fotoUrl },
                caption: texto,
                mentions: [jid]
            });
        } else {
            await sock.sendMessage(chat, {
                text: texto,
                mentions: [jid]
            });
        }
    } catch (e) {
        try {
            await sock.sendMessage(chat, {
                text: texto,
                mentions: [jid]
            });
        } catch (e2) {}
    }
}

// ==================== COMANDO: ADICIONAR ====================
async function cmdBlacklistAdd(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, CONFIG) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);
    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    // 🔥 RECONHECE O USUÁRIO
    const alvo = await reconhecerUsuario(sock, chat, args, msg);

    if (!alvo) {
        await enviarResposta(chat, sock,
            `📌 *Como usar:*\n\n` +
            `▸ ${CONFIG.prefix}addblacklist @user motivo\n` +
            `▸ ${CONFIG.prefix}addblacklist 5599999999999 motivo\n` +
            `▸ ${CONFIG.prefix}addblacklist 5599999999999\n` +
            `▸ Responda uma mensagem com ${CONFIG.prefix}addblacklist motivo`,
            msg
        );
        return;
    }

    // 🔥 VERIFICA SE É A SI MESMO
    const senderNum = String(sender).split('@')[0].split(':')[0];
    if (senderNum === alvo.numero) {
        await enviarResposta(chat, sock, '❌ Você não pode se adicionar!', msg);
        return;
    }

    // 🔥 PEGA O MOTIVO (OPCIONAL)
    let motivo = 'Sem motivo';

    if (args.length > 0) {
        const argsSemAlvo = args.filter(a => {
            const aLimpo = limparNumero(a);
            return aLimpo !== alvo.numero && !a.includes('@');
        });

        if (argsSemAlvo.length > 0) {
            motivo = argsSemAlvo.join(' ').trim();
        }
    }

    // 🔥 ADICIONA À LISTA (salva o número limpo)
    const result = addToBlacklist(db, chat, alvo.numero, motivo, sender);
    salvarDB(db, DB_PATH);

    // 🔥 ENVIA CONFIRMAÇÃO COM FOTO
    await enviarConfirmacao(sock, chat, alvo, motivo, CONFIG);

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

    const alvo = await reconhecerUsuario(sock, chat, args, msg);

    if (!alvo) {
        await enviarResposta(chat, sock,
            `📌 Marque a pessoa ou digite o número:\n` +
            `▸ ${CONFIG.prefix}removeblacklist @user\n` +
            `▸ ${CONFIG.prefix}removeblacklist 5599999999999`,
            msg
        );
        return;
    }

    if (!isInBlacklist(db, chat, alvo.numero)) {
        await enviarResposta(chat, sock, `⚠️ @${alvo.numero} não está na lista negra!`, msg, [alvo.jid]);
        return;
    }

    removeFromBlacklist(db, chat, alvo.numero);
    salvarDB(db, DB_PATH);

    await enviarResposta(chat, sock, `⬜ @${alvo.numero} removido da **LISTA NEGRA**!`, msg, [alvo.jid]);
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
    const mentions = Object.keys(lista).map(u => u.includes('@') ? u : u + '@s.whatsapp.net');

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
    removeFromBlacklist,
    reconhecerUsuario,
    enviarConfirmacao,
    limparNumero
};