// ==================== COMANDOS DE GRUPO ====================
// services/group.js
//
// Comandos completos pra gerenciar grupo:
//   • °setfoto       → muda foto do grupo
//   • °setnome       → muda nome do grupo
//   • °setdesc       → muda descrição
//   • °setlink       → reseta link do grupo
//   • °setregras     → define regras
//   • °grupoinfo     → info completa
//   • °descricao     → só descrição
//   • °admins        → lista ADMs
//   • °membros       → total membros
//   • °groupid       → ID do grupo
//   • °criado        → data de criação
//
// Todos exigem ADM/dono (exceto os de "ver").
// Sem dependência de sharp.
// ============================================================

const CONFIG = require('../config.js');

// ==================== 1. MUDAR FOTO DO GRUPO ====================
async function cmdSetGroupPhoto(chat, sock, sender, msg, enviarResposta, reagir, downloadMediaMessage, P, CONFIG, verificarAdmin, isDono) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores ou dono!', msg);
        return;
    }

    if (!chat.endsWith('@g.us')) {
        await enviarResposta(chat, sock, '📌 Este comando só funciona em grupos!', msg);
        return;
    }

    // 🔥 VERIFICA SE O BOT É ADMIN (versão robusta)
let botEhAdmin = false;
try {
    const metadata = await sock.groupMetadata(chat);

    // 🔥 Limpa todos os IDs do bot (pode vir como @lid, @s.whatsapp.net, etc)
    const limpar = (str) => String(str || '').split('@')[0].split(':')[0].replace(/\D/g, '');

    const botIds = [
        sock.user.id,
        sock.user.lid,
        sock.user.jid,
        sock.user.phoneNumber
    ].filter(Boolean).map(limpar);

    for (const p of metadata.participants) {
        const pIds = [
            p.id,
            p.lid,
            p.jid,
            p.phoneNumber
        ].filter(Boolean).map(limpar);

        // 🔥 Verifica se ALGUM ID do bot bate com ALGUM ID do participante
        const ehBot = pIds.some(id => botIds.includes(id));

        if (ehBot) {
            botEhAdmin = p.admin === 'admin' || p.admin === 'superadmin';
            break;
        }
    }
} catch (e) {
    console.error('Erro ao verificar admin:', e.message);
}

    if (!botEhAdmin) {
        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ⚠️ *BOT NÃO É ADMIN*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ Para mudar a foto do grupo,
┃ o bot precisa ser *ADMIN*.

┃ 📌 Promova o bot e tente
┃ novamente.

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
            msg
        );
        return;
    }

    // 🔥 PEGA A FOTO (respondida ou na mensagem)
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const fotoRespondida = quoted?.imageMessage;
    const fotoAtual = msg.message?.imageMessage;

    // 🔥 DESEMBRULHA viewOnce se tiver
    let foto = null;
    let alvoParaDownload = null;

    if (fotoRespondida) {
        foto = fotoRespondida;
        alvoParaDownload = { message: quoted, key: msg.key };
    } else if (quoted?.viewOnceMessage || quoted?.viewOnceMessageV2) {
        // 🔥 Foto respondida em visualização única
        const inner = quoted.viewOnceMessage?.message || quoted.viewOnceMessageV2?.message;
        if (inner?.imageMessage) {
            foto = inner.imageMessage;
            alvoParaDownload = { message: quoted, key: msg.key };
        }
    } else if (fotoAtual) {
        foto = fotoAtual;
        alvoParaDownload = msg;
    } else if (msg.message?.viewOnceMessage || msg.message?.viewOnceMessageV2) {
        // 🔥 Foto enviada em visualização única
        const inner = msg.message.viewOnceMessage?.message || msg.message.viewOnceMessageV2?.message;
        if (inner?.imageMessage) {
            foto = inner.imageMessage;
            alvoParaDownload = msg;
        }
    }

    if (!foto || !alvoParaDownload) {
        await enviarResposta(chat, sock,
            `📸 *COMO USAR:*
📌 Responda uma foto com: ${CONFIG.prefix}setfoto
📌 Ou envie a foto com a legenda: ${CONFIG.prefix}setfoto

⚠️ Formatos: JPG, PNG, WebP (até 5MB)
💡 Funciona com foto normal E visualização única`,
            msg
        );
        return;
    }

    await reagir(sock, chat, msg.key.id, '⏳');

    try {
        // 🔥 BAIXA A FOTO
        const buffer = await downloadMediaMessage(
            alvoParaDownload, 'buffer', {},
            { logger: P({ level: 'silent' }) }
        );

        if (!buffer || buffer.length < 100) {
            throw new Error('Imagem inválida ou muito pequena');
        }

        // 🔥 VERIFICA TAMANHO (5MB max)
        if (buffer.length > 5 * 1024 * 1024) {
            throw new Error('Imagem muito grande! Máximo 5MB.');
        }

        // 🔥 ATUALIZA DIRETO (sem sharp)
        await sock.updateProfilePicture(chat, buffer);

        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ✅ *FOTO ATUALIZADA*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 📸 Foto do grupo alterada
┃ com sucesso!

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
            msg
        );
        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        console.error('❌ Erro ao mudar foto:', error.message);
        console.error('❌ Stack:', error.stack);

        let msgErro = `❌ Erro: ${error.message}`;

        if (error.message.includes('401') || error.message.includes('not-authorized')) {
            msgErro = '❌ O bot precisa ser *ADMIN* do grupo!';
        } else if (error.message.includes('413')) {
            msgErro = '❌ Imagem muito grande! Envie uma menor.';
        } else if (error.message.includes('400')) {
            msgErro = '❌ Formato de imagem não suportado.';
        } else if (error.message.includes('media') || error.message.includes('download')) {
            msgErro = '❌ Não consegui baixar a foto. Tente novamente.';
        }

        await enviarResposta(chat, sock, msgErro, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== 2. MUDAR NOME DO GRUPO ====================
async function cmdSetGroupName(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG, verificarAdmin, isDono) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores ou dono!', msg);
        return;
    }

    if (!chat.endsWith('@g.us')) {
        await enviarResposta(chat, sock, '📌 Este comando só funciona em grupos!', msg);
        return;
    }

    let nome = args.join(' ').trim();

    // 🔥 SE NÃO TIVER TEXTO, TENTA DA MENSAGEM RESPONDIDA
    if (!nome) {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
            nome = quoted.conversation ||
                quoted.extendedTextMessage?.text ||
                quoted.imageMessage?.caption ||
                '';
            nome = nome.trim();
        }
    }

    if (!nome) {
        await enviarResposta(chat, sock,
            `📝 Use: ${CONFIG.prefix}setnome <novo nome>
📌 Ou responda uma mensagem com ${CONFIG.prefix}setnome

⚠️ Máximo 25 caracteres`,
            msg
        );
        return;
    }

    if (nome.length > 50) {
        await enviarResposta(chat, sock, '❌ Nome muito longo! Máximo 50 caracteres.', msg);
        return;
    }

    await reagir(sock, chat, msg.key.id, '⏳');

    try {
        await sock.groupUpdateSubject(chat, nome);

        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ✅ *NOME ATUALIZADO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 📛 Novo nome:
┃ *${nome}*

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
            msg
        );
        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        console.error('❌ Erro ao mudar nome:', error.message);

        let msgErro = `❌ Erro: ${error.message}`;
        if (error.message.includes('401') || error.message.includes('not-authorized')) {
            msgErro = '❌ O bot precisa ser *ADMIN* do grupo!';
        }

        await enviarResposta(chat, sock, msgErro, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== 3. MUDAR DESCRIÇÃO ====================
async function cmdSetGroupDesc(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG, verificarAdmin, isDono) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores ou dono!', msg);
        return;
    }

    if (!chat.endsWith('@g.us')) {
        await enviarResposta(chat, sock, '📌 Este comando só funciona em grupos!', msg);
        return;
    }

    let descricao = args.join(' ').trim();

    if (!descricao) {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
            descricao = quoted.conversation ||
                quoted.extendedTextMessage?.text ||
                quoted.imageMessage?.caption ||
                quoted.videoMessage?.caption ||
                '';
            descricao = descricao.trim();
        }
    }

    if (!descricao) {
        await enviarResposta(chat, sock,
            `📝 Use: ${CONFIG.prefix}setdesc <descrição>
📌 Ou responda uma mensagem com ${CONFIG.prefix}setdesc

⚠️ Máximo 512 caracteres`,
            msg
        );
        return;
    }

    if (descricao.length > 512) {
        await enviarResposta(chat, sock, '❌ Descrição muito longa! Máximo 512 caracteres.', msg);
        return;
    }

    await reagir(sock, chat, msg.key.id, '⏳');

    try {
        await sock.groupUpdateDescription(chat, descricao);

        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ✅ *DESCRIÇÃO ATUALIZADA*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 📝 Nova descrição:
┃ ${descricao}

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
            msg
        );
        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        console.error('❌ Erro ao mudar descrição:', error.message);

        let msgErro = `❌ Erro: ${error.message}`;
        if (error.message.includes('401') || error.message.includes('not-authorized')) {
            msgErro = '❌ O bot precisa ser *ADMIN* do grupo!';
        }

        await enviarResposta(chat, sock, msgErro, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== 4. RESETAR LINK DO GRUPO ====================
async function cmdSetGroupLink(chat, sock, sender, msg, enviarResposta, reagir, CONFIG, verificarAdmin, isDono) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores ou dono!', msg);
        return;
    }

    if (!chat.endsWith('@g.us')) {
        await enviarResposta(chat, sock, '📌 Este comando só funciona em grupos!', msg);
        return;
    }

    await reagir(sock, chat, msg.key.id, '⏳');

    try {
        // 🔥 RESETA O LINK (revoga o antigo e gera novo)
        const novoCode = await sock.groupRevokeInvite(chat);
        const link = `https://chat.whatsapp.com/${novoCode}`;

        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🔄 *LINK RESETADO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 🔗 *Novo link:*
┃ ${link}

┃ ⚠️ O link antigo não
┃ funciona mais!

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
            msg
        );
        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        console.error('❌ Erro ao resetar link:', error.message);

        let msgErro = `❌ Erro: ${error.message}`;
        if (error.message.includes('401') || error.message.includes('not-authorized')) {
            msgErro = '❌ O bot precisa ser *ADMIN* do grupo!';
        }

        await enviarResposta(chat, sock, msgErro, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== 5. VER LINK DO GRUPO ====================
async function cmdGetGroupLink(chat, sock, sender, msg, enviarResposta, reagir, CONFIG, verificarAdmin, isDono) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores ou dono!', msg);
        return;
    }

    if (!chat.endsWith('@g.us')) {
        await enviarResposta(chat, sock, '📌 Este comando só funciona em grupos!', msg);
        return;
    }

    try {
        const code = await sock.groupInviteCode(chat);
        const link = `https://chat.whatsapp.com/${code}`;

        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🔗 *LINK DO GRUPO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ ${link}

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
            msg
        );
        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== 6. INFO COMPLETA DO GRUPO ====================
async function cmdGroupInfo(chat, sock, msg, db, enviarResposta, reagir, CONFIG) {
    if (!chat.endsWith('@g.us')) {
        await enviarResposta(chat, sock, '📌 Este comando só funciona em grupos!', msg);
        return;
    }

    await reagir(sock, chat, msg.key.id, '📊');

    try {
        const metadata = await sock.groupMetadata(chat);
        const participantes = metadata.participants || [];

        const total = participantes.length;
        const admins = participantes.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
        const totalAdmins = admins.length;
        const membrosNormais = total - totalAdmins;

        let fotoUrl = null;
        try {
            fotoUrl = await sock.profilePictureUrl(chat, 'image');
        } catch (err) {}

        const descricao = metadata.desc || '📝 Sem descrição definida';

        const criadoEm = metadata.creation ? new Date(metadata.creation * 1000) : null;
        const dataCriacao = criadoEm ? criadoEm.toLocaleDateString('pt-BR') : 'N/A';
        const horaCriacao = criadoEm ? criadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A';

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

        let dono = metadata.owner || 'N/A';
        const donoNome = dono !== 'N/A' ? dono.split('@')[0] : 'N/A';

        const status = metadata.announce ? '🔒 FECHADO (apenas ADMs)' : '🔓 ABERTO (todos)';
        const restrito = metadata.restrict ? '🔒 Restrito (apenas ADMs)' : '🔓 Livre (todos)';

        const botIsAdmin = participantes.some(p => p.id === sock.user.id && p.admin);
        const botStatus = botIsAdmin ? '✅ Sim' : '❌ Não';

        let listaAdmins = '';
        const adminsExibidos = admins.slice(0, 10);
        for (const admin of adminsExibidos) {
            listaAdmins += `┃ 👑 @${admin.id.split('@')[0]}\n`;
        }
        if (admins.length > 10) {
            listaAdmins += `┃ 📌 + ${admins.length - 10} outros ADMs\n`;
        }

        const regras = db.regras?.[chat] || '📜 Nenhuma regra definida. Use °setregras para definir.';

        const agora = new Date();
        const dataAtual = agora.toLocaleDateString('pt-BR');
        const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📋 *INFORMAÇÕES DO GRUPO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 📛 *Nome:* ${metadata.subject || 'Sem nome'}
┃ 🆔 *ID:* ${chat.split('@')[0]}
┃ 👑 *Dono:* @${donoNome}
┃ 📅 *Criado em:* ${dataCriacao} às ${horaCriacao}
┃ ⏳ *Idade:* ${idade}
╰━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 👥 *Participantes:* ${total}
┃ 👑 *ADMs:* ${totalAdmins}
┃ 👤 *Membros:* ${membrosNormais}
┃ 🤖 *Bot é ADM:* ${botStatus}
╰━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 🔒 *Status:* ${status}
┃ 🛡️ *Restrição:* ${restrito}
╰━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 📜 *REGRAS:*
┃ ${regras}
╰━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 📝 *DESCRIÇÃO:*
┃ ${descricao}
╰━━━━━━━━━━━━━⬢`;

        if (listaAdmins) {
            texto += `\n╭━━━━━━━━━━━━━⬢
┃ 👑 *ADMINISTRADORES:*
${listaAdmins}╰━━━━━━━━━━━━━⬢`;
        }

        texto += `\n
╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📅 ${dataAtual} | 🕐 ${horaAtual}
┃ 🤖 ${CONFIG.botNome}
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

        const mentions = admins.map(a => a.id);
        if (dono !== 'N/A') mentions.push(dono);

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
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== 7. VER DESCRIÇÃO ====================
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
┃ 📝 *DESCRIÇÃO DO GRUPO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

🏠 *${metadata.subject || 'Sem nome'}*

${descricao}

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📌 Use ${CONFIG.prefix}setdesc para editar (ADM)
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

// ==================== 8. VER ADMINISTRADORES ====================
async function cmdGroupAdmins(chat, sock, msg, enviarResposta, CONFIG) {
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
┃ 👑 *ADMINISTRADORES*
╰━━━━━━━━━━━━━━━━━━━━━⬢

🏠 *${metadata.subject || 'Sem nome'}*
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

// ==================== 9. VER MEMBROS ====================
async function cmdGroupMembers(chat, sock, msg, enviarResposta, CONFIG) {
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
┃ 👥 *MEMBROS DO GRUPO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

🏠 *${metadata.subject || 'Sem nome'}*

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

// ==================== 10. VER ID DO GRUPO ====================
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
┃ 🆔 *ID DO GRUPO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

🏠 *${metadata.subject || 'Sem nome'}*

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

// ==================== 11. VER DATA DE CRIAÇÃO ====================
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
┃ 📅 *DATA DE CRIAÇÃO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

🏠 *${metadata.subject || 'Sem nome'}*

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

// ==================== EXPORTAR ====================
module.exports = {
    cmdSetGroupPhoto,
    cmdSetGroupName,
    cmdSetGroupDesc,
    cmdSetGroupLink,
    cmdGetGroupLink,
    cmdGroupInfo,
    cmdGroupDesc,
    cmdGroupAdmins,
    cmdGroupMembers,
    cmdGroupId,
    cmdGroupCreated
};