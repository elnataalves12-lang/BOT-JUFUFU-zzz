// ==================== ANTI-LINK SUPREMO ====================
// services/antiLinkSupremo.js
//
// Apaga + Bane + Avisa (sem responder)
// Compatível com @s.whatsapp.net, @lid, jid e phoneNumber
// ============================================================

// ==================== DETECTAR LINK ====================
function temLink(text) {
    if (!text) return false;
    
    // 🔥 LIMPA CARACTERES INVISÍVEIS
    const limpo = text
        .replace(/[\u200B-\u200D\uFEFF\u00A0\u2060-\u2063\u2800]/g, '')
        .toLowerCase();
    
    // 🔥 PADRÕES DE LINK
    return /(chat\.whatsapp\.com|wa\.me|discord\.gg|t\.me|https?:\/\/|www\.)/i.test(limpo);
}

// ==================== VERIFICAR ADMIN (SUPORTE LID) ====================
async function verificarAdminLocal(sock, chat, jid) {
    try {
        const metadata = await sock.groupMetadata(chat);
        
        // 🔥 PEGA O NÚMERO LIMPO
        const jidNumber = jid.split(':')[0].split('@')[0];
        const jidLid = jid.includes('@lid') ? jid : null;
        
        for (const p of metadata.participants) {
            const pId = p.id || '';
            const pLid = p.lid || '';
            const pJid = p.jid || p.phoneNumber || '';
            
            const ehJid =
                pId === jid ||
                pId === jidLid ||
                pLid === jid ||
                pLid === jidLid ||
                pJid === jid ||
                (pId && pId.includes(jidNumber)) ||
                (pLid && pLid.includes(jidNumber)) ||
                (pJid && pJid.includes(jidNumber));
            
            if (ehJid) {
                return p.admin === 'admin' || p.admin === 'superadmin';
            }
        }
        
        return false;
    } catch (e) {
        return false;
    }
}

// ==================== PROCESSAR ANTI-LINK ====================
async function processarAntiLinkSupremo(sock, chat, sender, msg, db, salvarDB, enviarResposta, reagir, verificarAdmin, isDono, podeBanir, CONFIG) {
   
    // 🔥 SÓ FUNCIONA EM GRUPOS
    if (!chat.endsWith('@g.us')) return false;

    // 🔥 VERIFICA QUAL MODO ESTÁ ATIVO
    const modoApaga = db.antilink && db.antilink[chat] === true;
    const modoBan = db.antilinkBan && db.antilinkBan[chat] === true;

    if (!modoApaga && !modoBan) return false;
   
    // 🔥 PEGA O TEXTO DE QUALQUER LUGAR
    const conteudo = 
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        '';

    // 🔥 VERIFICA SE TEM LINK
    if (!temLink(conteudo)) return false;
   
    // ============================================================
    // 🔥 VERIFICA SE O BOT É ADMIN (SUPORTE LID + PN + JID)
    // ============================================================
    let isBotAdmin = false;
    try {
        const metadata = await sock.groupMetadata(chat);
        const botNumber = sock.user.id.split(':')[0].split('@')[0];
        const botIdPN = botNumber + '@s.whatsapp.net';
        const botLid = sock.user.lid ? sock.user.lid.split(':')[0] + '@lid' : null;

        for (const p of metadata.participants) {
            const pId = p.id || '';
            const pLid = p.lid || '';
            const pJid = p.jid || p.phoneNumber || '';

            const ehBot =
                pId === botIdPN ||
                pId === sock.user.id ||
                pId === botLid ||
                pLid === botLid ||
                pJid === botIdPN ||
                (pId && pId.includes(botNumber)) ||
                (pLid && pLid.includes(botNumber)) ||
                (pJid && pJid.includes(botNumber));

            if (ehBot) {
                isBotAdmin = p.admin === 'admin' || p.admin === 'superadmin';
                break;
            }
        }
    } catch (e) {
        return false;
    }

    if (!isBotAdmin) {
        return false;
    }
   
    // ============================================================
    // 🔥 VERIFICA SE O REMETENTE É ADM/DONO (SUPORTE LID)
    // ============================================================
    const isAdmin = await verificarAdminLocal(sock, chat, sender);
    const isDonoBot = await isDono(sender);
    
    if (isAdmin || isDonoBot) {
        return false;
    }
    
    // ============================================================
    // 🔥 VERIFICA SE PODE BANIR (SUPORTE LID)
    // ============================================================
    // 🔥 VERIFICA SE O ALVO É ADMIN
    const alvoAdmin = await verificarAdminLocal(sock, chat, sender);
    if (alvoAdmin) {
        return false;
    }

    // 🔥 VERIFICA SE O ALVO É O BOT
    if (sender === sock.user.id || sender.includes(sock.user.id.split(':')[0])) {
        return false;
    }

    try {
        // 🔥 1. APAGA PRA TODOS (SÓ NO MODO APAGA)
        if (modoApaga) {
            try {
                await sock.sendMessage(chat, {
                    delete: {
                        remoteJid: chat,
                        fromMe: false,
                        id: msg.key.id,
                        participant: msg.key.participant || msg.key.remoteJid
                    }
                });
            } catch (e) {
            }
        }

        // 🔥 2. BANE
        await sock.groupParticipantsUpdate(chat, [sender], 'remove');
      
        // 🔥 3. AVISA SEM RESPONDER
        await sock.sendMessage(chat, {
            text: `🚫 *ANTILINK SUPREMO*\n\n@${sender.split('@')[0]} foi removido por enviar link!`,
            mentions: [sender]
        });

        // 🔥 LOG NO APP
        try {
            await fetch(`${CONFIG.apis.pinterest}/api/public/bot/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo: 'antilink',
                    usuario: sender.split('@')[0],
                    ok: true,
                    mensagem: `Usuário banido por enviar link: ${conteudo.slice(0, 100)}`
                })
            });
        } catch (e) {}

        return true;

    } catch (error) {
        return false;
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    temLink,
    processarAntiLinkSupremo,
    verificarAdminLocal
};