// ==================== COMANDOS DE GRUPO ====================
// services/group.js

// ===== 1. EDITAR FOTO DO GRUPO =====
async function cmdSetGroupPhoto(chat, sock, sender, msg, enviarResposta, reagir, downloadMediaMessage, P, CONFIG, verificarAdmin, isDono) {
    // Verifica se é ADM
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);
    
    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores podem mudar a foto do grupo!', msg);
        return;
    }

    // Verifica se tem uma mensagem respondida
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) {
        await enviarResposta(chat, sock, '📸 Responda a uma imagem para mudar a foto do grupo!\n📌 Exemplo: responda uma foto com °setfoto', msg);
        return;
    }

    // Verifica se é uma imagem
    const isImage = !!quoted.imageMessage;
    if (!isImage) {
        await enviarResposta(chat, sock, '⚠️ Responda a uma imagem (JPG, PNG, WebP)!', msg);
        return;
    }

    await reagir(sock, chat, msg.key.id, '⏳');

    try {
        // Baixa a imagem
        const target = { message: quoted, key: msg.key };
        const buffer = await downloadMediaMessage(target, 'buffer', {}, { logger: P({ level: 'silent' }) });

        if (!buffer || buffer.length < 100) {
            throw new Error('Imagem inválida ou muito pequena');
        }

        // Atualiza a foto do grupo
        await sock.updateProfilePicture(chat, buffer);

        await enviarResposta(chat, sock, '✅ Foto do grupo atualizada com sucesso! 📸', msg);
        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        
        if (error.message.includes('401')) {
            await enviarResposta(chat, sock, '❌ Erro: Você precisa ser administrador para mudar a foto!', msg);
        } else if (error.message.includes('413')) {
            await enviarResposta(chat, sock, '❌ Imagem muito grande! Envie uma imagem menor.', msg);
        } else {
            await enviarResposta(chat, sock, `❌ Erro ao atualizar foto: ${error.message}`, msg);
        }
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ===== 2. EDITAR DESCRIÇÃO DO GRUPO =====
async function cmdSetGroupDesc(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG, verificarAdmin, isDono) {
    // Verifica se é ADM
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);
    
    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores podem mudar a descrição do grupo!', msg);
        return;
    }

    let descricao = args.join(' ').trim();

    // Se não tiver texto, tenta pegar da mensagem respondida
    if (!descricao) {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
            // Tenta pegar texto da mensagem respondida
            descricao = quoted.conversation || 
                        quoted.extendedTextMessage?.text || 
                        quoted.imageMessage?.caption ||
                        quoted.videoMessage?.caption ||
                        '';
        }
    }

    if (!descricao) {
        await enviarResposta(chat, sock, `📝 Use: ${CONFIG.prefix}setdesc <descrição>\n📌 Ou responda uma mensagem com °setdesc`, msg);
        return;
    }

    if (descricao.length > 500) {
        await enviarResposta(chat, sock, '❌ Descrição muito longa! Máximo 500 caracteres.', msg);
        return;
    }

    await reagir(sock, chat, msg.key.id, '⏳');

    try {
        await sock.groupUpdateDescription(chat, descricao);
        
        await enviarResposta(chat, sock, `✅ Descrição atualizada com sucesso!\n\n📝 ${descricao}`, msg);
        await reagir(sock, chat, msg.key.id, '✅');


    } catch (error) {
        await enviarResposta(chat, sock, `❌ Erro ao atualizar descrição: ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ===== 3. VER INFORMAÇÕES COMPLETAS DO GRUPO =====
async function cmdGroupInfo(chat, sock, msg, db, enviarResposta, reagir, CONFIG) {
    if (!chat.endsWith('@g.us')) {
        await enviarResposta(chat, sock, '📌 Este comando só funciona em grupos!', msg);
        return;
    }

    await reagir(sock, chat, msg.key.id, '📊');

    try {
        // Pega informações do grupo
        const metadata = await sock.groupMetadata(chat);
        const participantes = metadata.participants || [];
        
        // Contagens
        const total = participantes.length;
        const admins = participantes.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
        const totalAdmins = admins.length;
        const membrosNormais = total - totalAdmins;
        
        // Tenta pegar a foto
        let fotoUrl = null;
        try {
            fotoUrl = await sock.profilePictureUrl(chat, 'image');
        } catch (err) {
            fotoUrl = null;
        }

        // Pega descrição
        const descricao = metadata.desc || '📝 Sem descrição definida';
        
        // Pega data de criação
        const criadoEm = metadata.creation ? new Date(metadata.creation * 1000) : null;
        const dataCriacao = criadoEm ? criadoEm.toLocaleDateString('pt-BR') : 'N/A';
        const horaCriacao = criadoEm ? criadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
        
        // Calcula idade do grupo
        let idade = 'N/A';
        if (criadoEm) {
            const agora = new Date();
            const diffMs = agora - criadoEm;
            const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffMeses = Math.floor(diffDias / 30);
            const diffAnos = Math.floor(diffDias / 365);
            
            if (diffAnos > 0) {
                idade = `${diffAnos} ano${diffAnos > 1 ? 's' : ''}`;
                if (diffMeses % 12 > 0) idade += ` e ${diffMeses % 12} mês${diffMeses % 12 > 1 ? 'es' : ''}`;
            } else if (diffMeses > 0) {
                idade = `${diffMeses} mês${diffMeses > 1 ? 'es' : ''}`;
                if (diffDias % 30 > 0) idade += ` e ${diffDias % 30} dia${diffDias % 30 > 1 ? 's' : ''}`;
            } else {
                idade = `${diffDias} dia${diffDias > 1 ? 's' : ''}`;
            }
        }

        // Pega dono do grupo
        let dono = metadata.owner || 'N/A';
        const donoNome = dono !== 'N/A' ? dono.split('@')[0] : 'N/A';

        // Status do grupo
        const status = metadata.announce ? '🔒 FECHADO (apenas ADMs)' : '🔓 ABERTO (todos)';
        const restrito = metadata.restrict ? '🔒 Restrito (apenas ADMs)' : '🔓 Livre (todos)';

        // Verifica se o bot é admin
        const botIsAdmin = participantes.some(p => p.id === sock.user.id && p.admin);
        const botStatus = botIsAdmin ? '✅ Sim' : '❌ Não';

        // Lista os administradores (máximo 10)
        let listaAdmins = '';
        const adminsExibidos = admins.slice(0, 10);
        for (const admin of adminsExibidos) {
            listaAdmins += `┃ 👑 @${admin.id.split('@')[0]}\n`;
        }
        if (admins.length > 10) {
            listaAdmins += `┃ 📌 + ${admins.length - 10} outros ADMs\n`;
        }

        // Tenta pegar as regras do banco de dados
        const regras = db.regras?.[chat] || '📜 Nenhuma regra definida. Use °setregras para definir.';

        // Data atual
        const agora = new Date();
        const dataAtual = agora.toLocaleDateString('pt-BR');
        const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // ===== CONSTRÓI A MENSAGEM =====
        let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📋 **INFORMAÇÕES DO GRUPO**
╰━━━━━━━━━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 📛 **Nome:** ${metadata.subject || 'Sem nome'}
┃ 🆔 **ID:** ${chat.split('@')[0]}
┃ 👑 **Dono:** @${donoNome}
┃ 📅 **Criado em:** ${dataCriacao} às ${horaCriacao}
┃ ⏳ **Idade:** ${idade}
╰━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 👥 **Participantes:** ${total}
┃ 👑 **ADMs:** ${totalAdmins}
┃ 👤 **Membros:** ${membrosNormais}
┃ 🤖 **Bot é ADM:** ${botStatus}
╰━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 🔒 **Status:** ${status}
┃ 🛡️ **Restrição:** ${restrito}
╰━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 📜 **REGRAS:**
┃ ${regras}
╰━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 📝 **DESCRIÇÃO:**
┃ ${descricao}
╰━━━━━━━━━━━━━⬢`;

        if (listaAdmins) {
            texto += `\n╭━━━━━━━━━━━━━⬢
┃ 👑 **ADMINISTRADORES:**
${listaAdmins}╰━━━━━━━━━━━━━⬢`;
        }

        texto += `\n
╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📅 ${dataAtual} | 🕐 ${horaAtual}
┃ 🤖 ${CONFIG.botNome}
┃ 👑 ${CONFIG.donoOriginal}
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

        // Menciona administradores e dono
        const mentions = admins.map(a => a.id);
        if (dono !== 'N/A') mentions.push(dono);

        // Envia com foto do grupo
        if (fotoUrl) {
            await sock.sendMessage(chat, {
                image: { url: fotoUrl },
                caption: texto,
                mentions: mentions
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chat, {
                text: texto,
                mentions: mentions
            }, { quoted: msg });
        }

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        await enviarResposta(chat, sock, `❌ Erro ao buscar informações: ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ===== 4. VER APENAS A DESCRIÇÃO =====
async function cmdGroupDesc(chat, sock, msg, enviarResposta, CONFIG) {
    if (!chat.endsWith('@g.us')) {
        await enviarResposta(chat, sock, '📌 Este comando só funciona em grupos!', msg);
        return;
    }

    try {
        const metadata = await sock.groupMetadata(chat);
        const descricao = metadata.desc || '📝 Sem descrição definida';
        
        let fotoUrl = null;
        try {
            fotoUrl = await sock.profilePictureUrl(chat, 'image');
        } catch (err) {}

        const texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📝 **DESCRIÇÃO DO GRUPO**
╰━━━━━━━━━━━━━━━━━━━━━⬢

🏠 **${metadata.subject || 'Sem nome'}**

${descricao}

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📌 Use °setdesc para editar (ADM)
┃ 🤖 ${CONFIG.botNome}
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

        if (fotoUrl) {
            await sock.sendMessage(chat, {
                image: { url: fotoUrl },
                caption: texto
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chat, { text: texto }, { quoted: msg });
        }

    } catch (error) {
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
    }
}

// ===== 5. VER APENAS OS ADMINS =====
async function cmdGroupAdmins(chat, sock, msg, enviarResposta) {
    if (!chat.endsWith('@g.us')) {
        await enviarResposta(chat, sock, '📌 Este comando só funciona em grupos!', msg);
        return;
    }

    try {
        const metadata = await sock.groupMetadata(chat);
        const participantes = metadata.participants || [];
        const admins = participantes.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
        
        if (admins.length === 0) {
            await enviarResposta(chat, sock, '📊 Nenhum administrador encontrado!', msg);
            return;
        }

        let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 👑 **ADMINISTRADORES**
╰━━━━━━━━━━━━━━━━━━━━━⬢

🏠 **${metadata.subject || 'Sem         nome'}**
┃ 📌 ${admins.length} ADMs\n`;

        for (const admin of admins) {
            const nome = admin.id.split('@')[0];
            const tipo = admin.admin === 'superadmin' ? '👑 Criador' : '🛡️ ADM';
            texto += `┃ ${tipo}: @${nome}\n`;
        }

        texto += `\n╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

        const mentions = admins.map(a => a.id);
        await sock.sendMessage(chat, { text: texto, mentions }, { quoted: msg });

    } catch (error) {
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
    }
}

// ===== 6. VER TOTAL DE MEMBROS =====
async function cmdGroupMembers(chat, sock, msg, enviarResposta) {
    if (!chat.endsWith('@g.us')) {
        await enviarResposta(chat, sock, '📌 Este comando só funciona em grupos!', msg);
        return;
    }

    try {
        const metadata = await sock.groupMetadata(chat);
        const participantes = metadata.participants || [];
        const total = participantes.length;
        const admins = participantes.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
        
        let fotoUrl = null;
        try {
            fotoUrl = await sock.profilePictureUrl(chat, 'image');
        } catch (err) {}

        const texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 👥 **MEMBROS DO GRUPO**
╰━━━━━━━━━━━━━━━━━━━━━⬢

🏠 **${metadata.subject || 'Sem nome'}**

┃ 📌 Total: ${total} membros
┃ 👑 ADMs: ${admins.length}
┃ 👤 Membros: ${total - admins.length}

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

        if (fotoUrl) {
            await sock.sendMessage(chat, {
                image: { url: fotoUrl },
                caption: texto
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chat, { text: texto }, { quoted: msg });
        }

    } catch (error) {
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
    }
}

// ===== 7. VER ID DO GRUPO =====
async function cmdGroupId(chat, sock, msg, enviarResposta, CONFIG) {
    if (!chat.endsWith('@g.us')) {
        await enviarResposta(chat, sock, '📌 Este comando só funciona em grupos!', msg);
        return;
    }

    try {
        const metadata = await sock.groupMetadata(chat);
        
        let fotoUrl = null;
        try {
            fotoUrl = await sock.profilePictureUrl(chat, 'image');
        } catch (err) {}

        const texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🆔 **ID DO GRUPO**
╰━━━━━━━━━━━━━━━━━━━━━⬢

🏠 **${metadata.subject || 'Sem nome'}**

┃ 📌 ID: ${chat}

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

        if (fotoUrl) {
            await sock.sendMessage(chat, {
                image: { url: fotoUrl },
                caption: texto
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chat, { text: texto }, { quoted: msg });
        }

    } catch (error) {
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
    }
}

// ===== 8. VER DATA DE CRIAÇÃO DO GRUPO =====
async function cmdGroupCreated(chat, sock, msg, enviarResposta, CONFIG) {
    if (!chat.endsWith('@g.us')) {
        await enviarResposta(chat, sock, '📌 Este comando só funciona em grupos!', msg);
        return;
    }

    try {
        const metadata = await sock.groupMetadata(chat);
        
        const criadoEm = metadata.creation ? new Date(metadata.creation * 1000) : null;
        const dataCriacao = criadoEm ? criadoEm.toLocaleDateString('pt-BR') : 'N/A';
        const horaCriacao = criadoEm ? criadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
        
        // Calcula idade
        let idade = 'N/A';
        if (criadoEm) {
            const agora = new Date();
            const diffMs = agora - criadoEm;
            const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffMeses = Math.floor(diffDias / 30);
            const diffAnos = Math.floor(diffDias / 365);
            
            if (diffAnos > 0) {
                idade = `${diffAnos} ano${diffAnos > 1 ? 's' : ''}`;
                if (diffMeses % 12 > 0) idade += ` e ${diffMeses % 12} mês${diffMeses % 12 > 1 ? 'es' : ''}`;
            } else if (diffMeses > 0) {
                idade = `${diffMeses} mês${diffMeses > 1 ? 'es' : ''}`;
                if (diffDias % 30 > 0) idade += ` e ${diffDias % 30} dia${diffDias % 30 > 1 ? 's' : ''}`;
            } else {
                idade = `${diffDias} dia${diffDias > 1 ? 's' : ''}`;
            }
        }

        let fotoUrl = null;
        try {
            fotoUrl = await sock.profilePictureUrl(chat, 'image');
        } catch (err) {}

        const texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📅 **DATA DE CRIAÇÃO**
╰━━━━━━━━━━━━━━━━━━━━━⬢

🏠 **${metadata.subject || 'Sem nome'}**

┃ 📅 Criado em: ${dataCriacao}
┃ 🕐 Horário: ${horaCriacao}
┃ ⏳ Idade: ${idade}

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

        if (fotoUrl) {
            await sock.sendMessage(chat, {
                image: { url: fotoUrl },
                caption: texto
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chat, { text: texto }, { quoted: msg });
        }

    } catch (error) {
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
    }
}

// ===== EXPORTAR TODOS =====
module.exports = {
    cmdSetGroupPhoto,
    cmdSetGroupDesc,
    cmdGroupInfo,
    cmdGroupDesc,
    cmdGroupAdmins,
    cmdGroupMembers,
    cmdGroupId,
    cmdGroupCreated
};