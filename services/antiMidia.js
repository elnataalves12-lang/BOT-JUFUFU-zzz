// ==================== ANTI-MÍDIA ====================
// services/antiMidia.js

// ==================== FUNÇÃO PARA VERIFICAR SE ESTÁ ATIVO ====================
function isActiveGroupRestriction(db, chat, tipo) {
    if (!db.antiMidia) return false;
    if (!db.antiMidia[chat]) return false;
    return db.antiMidia[chat][tipo] === true;
}

// ==================== FUNÇÃO PARA ATUALIZAR ====================
function updateIsActiveGroupRestriction(db, chat, tipo, valor) {
    if (!db.antiMidia) db.antiMidia = {};
    if (!db.antiMidia[chat]) db.antiMidia[chat] = {};
    db.antiMidia[chat][tipo] = valor;
    return true;
}

// ==================== COMANDO: ANTI-ÁUDIO ====================
async function cmdAntiAudio(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, salvarDB) {
    // Verifica se é ADM
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);
    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    if (!args || args.length === 0) {
        await enviarResposta(chat, sock, `📌 Use: ${CONFIG.prefix}anti-audio 1 (ativar) ou ${CONFIG.prefix}anti-audio 0 (desativar)`, msg);
        return;
    }

    const valor = args[0];
    const ativar = valor === '1';
    const desativar = valor === '0';

    if (!ativar && !desativar) {
        await enviarResposta(chat, sock, '📌 Digite 1 para ativar ou 0 para desativar!', msg);
        return;
    }

    const jaAtivo = ativar && isActiveGroupRestriction(db, chat, 'audio');
    const jaInativo = desativar && !isActiveGroupRestriction(db, chat, 'audio');

    if (jaAtivo || jaInativo) {
        await enviarResposta(chat, sock, `⚠️ Anti-áudio já está ${ativar ? 'ativado' : 'desativado'}!`, msg);
        return;
    }

    updateIsActiveGroupRestriction(db, chat, 'audio', ativar);
    salvarDB(db, DB_PATH);

    await enviarResposta(chat, sock, `✅ Anti-áudio ${ativar ? 'ativado' : 'desativado'} com sucesso!`, msg);
    await reagir(sock, chat, msg.key.id, '✅');
}

// ==================== COMANDO: ANTI-IMAGEM ====================
async function cmdAntiImage(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, salvarDB) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);
    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    if (!args || args.length === 0) {
        await enviarResposta(chat, sock, `📌 Use: ${CONFIG.prefix}anti-image 1 (ativar) ou ${CONFIG.prefix}anti-image 0 (desativar)`, msg);
        return;
    }

    const valor = args[0];
    const ativar = valor === '1';
    const desativar = valor === '0';

    if (!ativar && !desativar) {
        await enviarResposta(chat, sock, '📌 Digite 1 para ativar ou 0 para desativar!', msg);
        return;
    }

    const jaAtivo = ativar && isActiveGroupRestriction(db, chat, 'image');
    const jaInativo = desativar && !isActiveGroupRestriction(db, chat, 'image');

    if (jaAtivo || jaInativo) {
        await enviarResposta(chat, sock, `⚠️ Anti-imagem já está ${ativar ? 'ativado' : 'desativado'}!`, msg);
        return;
    }

    updateIsActiveGroupRestriction(db, chat, 'image', ativar);
    salvarDB(db, DB_PATH);

    await enviarResposta(chat, sock, `✅ Anti-imagem ${ativar ? 'ativado' : 'desativado'} com sucesso!`, msg);
    await reagir(sock, chat, msg.key.id, '✅');
}

// ==================== COMANDO: ANTI-VÍDEO ====================
async function cmdAntiVideo(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, salvarDB) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);
    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    if (!args || args.length === 0) {
        await enviarResposta(chat, sock, `📌 Use: ${CONFIG.prefix}anti-video 1 (ativar) ou ${CONFIG.prefix}anti-video 0 (desativar)`, msg);
        return;
    }

    const valor = args[0];
    const ativar = valor === '1';
    const desativar = valor === '0';

    if (!ativar && !desativar) {
        await enviarResposta(chat, sock, '📌 Digite 1 para ativar ou 0 para desativar!', msg);
        return;
    }

    const jaAtivo = ativar && isActiveGroupRestriction(db, chat, 'video');
    const jaInativo = desativar && !isActiveGroupRestriction(db, chat, 'video');

    if (jaAtivo || jaInativo) {
        await enviarResposta(chat, sock, `⚠️ Anti-vídeo já está ${ativar ? 'ativado' : 'desativado'}!`, msg);
        return;
    }

    updateIsActiveGroupRestriction(db, chat, 'video', ativar);
    salvarDB(db, DB_PATH);

    await enviarResposta(chat, sock, `✅ Anti-vídeo ${ativar ? 'ativado' : 'desativado'} com sucesso!`, msg);
    await reagir(sock, chat, msg.key.id, '✅');
}

// ==================== COMANDO: ANTI-STICKER ====================
async function cmdAntiSticker(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, salvarDB) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);
    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    if (!args || args.length === 0) {
        await enviarResposta(chat, sock, `📌 Use: ${CONFIG.prefix}anti-sticker 1 (ativar) ou ${CONFIG.prefix}anti-sticker 0 (desativar)`, msg);
        return;
    }

    const valor = args[0];
    const ativar = valor === '1';
    const desativar = valor === '0';

    if (!ativar && !desativar) {
        await enviarResposta(chat, sock, '📌 Digite 1 para ativar ou 0 para desativar!', msg);
        return;
    }

    const jaAtivo = ativar && isActiveGroupRestriction(db, chat, 'sticker');
    const jaInativo = desativar && !isActiveGroupRestriction(db, chat, 'sticker');

    if (jaAtivo || jaInativo) {
        await enviarResposta(chat, sock, `⚠️ Anti-sticker já está ${ativar ? 'ativado' : 'desativado'}!`, msg);
        return;
    }

    updateIsActiveGroupRestriction(db, chat, 'sticker', ativar);
    salvarDB(db, DB_PATH);

    await enviarResposta(chat, sock, `✅ Anti-sticker ${ativar ? 'ativado' : 'desativado'} com sucesso!`, msg);
    await reagir(sock, chat, msg.key.id, '✅');
}

// ==================== COMANDO: ANTI-DOCUMENTO ====================
async function cmdAntiDocument(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, salvarDB) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);
    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    if (!args || args.length === 0) {
        await enviarResposta(chat, sock, `📌 Use: ${CONFIG.prefix}anti-document 1 (ativar) ou ${CONFIG.prefix}anti-document 0 (desativar)`, msg);
        return;
    }

    const valor = args[0];
    const ativar = valor === '1';
    const desativar = valor === '0';

    if (!ativar && !desativar) {
        await enviarResposta(chat, sock, '📌 Digite 1 para ativar ou 0 para desativar!', msg);
        return;
    }

    const jaAtivo = ativar && isActiveGroupRestriction(db, chat, 'document');
    const jaInativo = desativar && !isActiveGroupRestriction(db, chat, 'document');

    if (jaAtivo || jaInativo) {
        await enviarResposta(chat, sock, `⚠️ Anti-documento já está ${ativar ? 'ativado' : 'desativado'}!`, msg);
        return;
    }

    updateIsActiveGroupRestriction(db, chat, 'document', ativar);
    salvarDB(db, DB_PATH);

    await enviarResposta(chat, sock, `✅ Anti-documento ${ativar ? 'ativado' : 'desativado'} com sucesso!`, msg);
    await reagir(sock, chat, msg.key.id, '✅');
}

// ==================== FUNÇÃO PARA PROCESSAR MENSAGENS ====================
async function processarAntiMidia(sock, chat, sender, msg, db, enviarResposta, verificarAdmin, isDono) {
    // Verifica se é grupo
    if (!chat.endsWith('@g.us')) return false;
    
    // Verifica se tem anti-mídia configurado
    if (!db.antiMidia) return false;
    if (!db.antiMidia[chat]) return false;
    
    const config = db.antiMidia[chat];
    
    // 🔥 VERIFICA SE É ADM
    const isAdmin = await verificarAdmin(sock, chat, sender);
    if (isAdmin) return false;
    
    // 🔥 VERIFICA SE É O DONO
    const isDonoBot = await isDono(sender);
    if (isDonoBot) return false;
    
    // Verifica a mensagem
    const quoted = msg.message;
    if (!quoted) return false;
    
    let tipo = null;
    if (quoted.audioMessage && config.audio === true) tipo = 'áudio';
    else if (quoted.imageMessage && config.image === true) tipo = 'imagem';
    else if (quoted.videoMessage && config.video === true) tipo = 'vídeo';
    else if (quoted.stickerMessage && config.sticker === true) tipo = 'figurinha';
    else if (quoted.documentMessage && config.document === true) tipo = 'documento';
    
    if (!tipo) return false;
    
    // Apaga a mensagem
    try {
        await sock.sendMessage(chat, { delete: msg.key });
        await enviarResposta(chat, sock, `🚫 @${sender.split('@')[0]} enviou ${tipo} mas o anti-${tipo} está ativo!`, msg, [sender]);
        return true;
    } catch (e) {
 
        return false;
    }
}
// ==================== EXPORTAR ====================
module.exports = {
    cmdAntiAudio,
    cmdAntiImage,
    cmdAntiVideo,
    cmdAntiSticker,
    cmdAntiDocument,
    processarAntiMidia,
    isActiveGroupRestriction,
    updateIsActiveGroupRestriction
};