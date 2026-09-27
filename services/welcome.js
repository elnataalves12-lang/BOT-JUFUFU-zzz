// ==================== SISTEMA DE BOAS-VINDAS ====================
// services/welcome.js
// ============================================================
// Método: image: { url: foto } — o Baileys baixa com auth
// Sem canvas
// ============================================================

const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// ==================== IMAGEM PADRÃO ====================
const IMAGEM_PADRAO = 'https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1790535895199-l9ob00.jpg';

// ==================== MENSAGENS PADRÃO ====================
const MENSAGEM_ENTRADA_PADRAO = '👋 Seja bem-vindo(a) ao grupo {grupo}!';
const MENSAGEM_SAIDA_PADRAO = '👋 {nome} saiu do grupo {grupo}!';

// ==================== PROCESSAR MENSAGEM ====================
function processarMensagem(mensagem, nome, grupo) {
    if (!mensagem) return null;
    let texto = mensagem;
    texto = texto.replace(/{grupo}/g, grupo);
    texto = texto.replace(/{nome}/g, nome);
    return texto;
}

// ==================== PEGAR URL DA FOTO ====================
// 🔥 Método padrão: retorna a URL pra o Baileys baixar
// Se não tiver foto → retorna a imagem padrão

async function pegarFotoUrl(sock, participantId) {
    try {
        const foto = await sock.profilePictureUrl(participantId, 'image');
        if (foto) return foto;
        return IMAGEM_PADRAO;
    } catch (e) {
        return IMAGEM_PADRAO;
    }
}

// ==================== ENVIAR BOAS-VINDAS ====================
async function enviarBoasVindas(sock, chat, participant, db, CONFIG) {
    try {
        if (!db.welcome || !db.welcome[chat]) return;

        const participantId = typeof participant === 'string' ? participant : participant.id;

        // 🔥 METADATA + FOTO EM PARALELO
        const [metadata, fotoUrl] = await Promise.all([
            sock.groupMetadata(chat).catch(() => null),
            pegarFotoUrl(sock, participantId)
        ]);

        const grupoNome = metadata?.subject || 'Grupo';

        // 🔥 MENSAGEM PERSONALIZADA
        const mensagemPersonalizada = db.welcomeMsg?.[chat] || null;
        const mensagemFinal = mensagemPersonalizada
            ? processarMensagem(mensagemPersonalizada, 'membro', grupoNome)
            : processarMensagem(MENSAGEM_ENTRADA_PADRAO, 'membro', grupoNome);

        const numeroMencao = participantId.split('@')[0];

        // 🔥 TEXTO
        const texto = `👋 Seja bem-vindo(a) @${numeroMencao}!\n\n${mensagemFinal}\n\n『 ${CONFIG.botNome} 』`;

        // 🔥 LINK DO CANAL
        const canalLink = CONFIG.canalLink || '';

        // ============================================================
        // 🔥 ENVIA A IMAGEM (método correto: image: { url })
        // ============================================================
        // O Baileys baixa a imagem com autenticação automaticamente
        // Se a URL do perfil do usuário falhar, o Baileys usa a padrão
        // ============================================================

        try {
            // Tenta enviar com botão (interactive)
            if (canalLink) {
                // 🔥 USA O MÉTODO INTERATIVO
                const mediaContent = await require('@whiskeysockets/baileys')
                    .generateWAMessageContent(
                        { image: { url: fotoUrl } },
                        { upload: sock.waUploadToServer }
                    );

                const interactiveMessage = {
                    body: { text: texto },
                    footer: { text: CONFIG.botNome },
                    header: {
                        hasMediaAttachment: true,
                        imageMessage: mediaContent.imageMessage
                    },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: 'cta_url',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '📢 Canal do Bot',
                                    url: canalLink
                                })
                            }
                        ]
                    },
                    contextInfo: {
                        mentionedJid: [participantId]
                    }
                };

                const msgContent = generateWAMessageFromContent(chat, {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2
                            },
                            interactiveMessage: interactiveMessage
                        }
                    }
                }, { userJid: sock.user.id });

                await sock.relayMessage(chat, msgContent.message, {
                    messageId: msgContent.key.id,
                    additionalNodes: [
                        {
                            tag: 'biz',
                            attrs: {},
                            content: [
                                {
                                    tag: 'interactive',
                                    attrs: { type: 'native_flow', v: '1' },
                                    content: [
                                        { tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }
                                    ]
                                }
                            ]
                        }
                    ]
                });

            } else {
                // 🔥 SEM BOTÃO → ENVIA NORMAL
                await sock.sendMessage(chat, {
                    image: { url: fotoUrl },
                    caption: texto,
                    mentions: [participantId]
                });
            }

        } catch (e) {
            // 🔥 FALLBACK: TENTA SEM BOTÃO
            try {
                await sock.sendMessage(chat, {
                    image: { url: fotoUrl },
                    caption: texto,
                    mentions: [participantId]
                });
            } catch (e2) {
                // 🔥 ÚLTIMO RECURSO: SÓ TEXTO
                await sock.sendMessage(chat, {
                    text: texto,
                    mentions: [participantId]
                });
            }
        }

    } catch (error) {}
}

// ==================== ENVIAR SAÍDA ====================
async function enviarSaida(sock, chat, participant, db, CONFIG) {
    try {
        if (!db.welcome || !db.welcome[chat]) return;
        if (!db.welcomeSaida || !db.welcomeSaida[chat]) return;

        const participantId = typeof participant === 'string' ? participant : participant.id;

        const metadata = await sock.groupMetadata(chat).catch(() => null);
        const grupoNome = metadata?.subject || 'Grupo';

        const mensagemPersonalizada = db.welcomeSaidaMsg?.[chat] || null;
        const mensagemFinal = mensagemPersonalizada
            ? processarMensagem(mensagemPersonalizada, 'membro', grupoNome)
            : processarMensagem(MENSAGEM_SAIDA_PADRAO, 'membro', grupoNome);

        const numeroMencao = participantId.split('@')[0];

        const texto = `👋 @${numeroMencao}\n${mensagemFinal}\n\n『 ${CONFIG.botNome} 』`;

        // 🔥 PEGA A FOTO
        const fotoUrl = await pegarFotoUrl(sock, participantId);

        // 🔥 ENVIA COM IMAGEM
        try {
            await sock.sendMessage(chat, {
                image: { url: fotoUrl },
                caption: texto,
                mentions: [participantId]
            });
        } catch (e) {
            // 🔥 FALLBACK: SÓ TEXTO
            await sock.sendMessage(chat, {
                text: texto,
                mentions: [participantId]
            });
        }

    } catch (error) {}
}

// ==================== COMANDOS ====================
async function cmdWelcome(chat, sock, sender, args, msg, enviarResposta, verificarAdmin, isDono, db, salvarDB, CONFIG) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    const acao = args[0]?.toLowerCase();

    if (acao === 'on') {
        if (!db.welcome) db.welcome = {};
        db.welcome[chat] = true;
        salvarDB();
        await enviarResposta(chat, sock, '✅ Welcome (entrada) ATIVADO!', msg);
        return;
    }

    if (acao === 'off') {
        if (!db.welcome) db.welcome = {};
        db.welcome[chat] = false;
        salvarDB();
        await enviarResposta(chat, sock, '❌ Welcome (entrada) DESATIVADO!', msg);
        return;
    }

    const status = db.welcome?.[chat] ? '✅ ATIVO' : '❌ DESATIVADO';
    const mensagem = db.welcomeMsg?.[chat] || MENSAGEM_ENTRADA_PADRAO;

    await enviarResposta(chat, sock,
        `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 👋 WELCOME - ENTRADA
╰━━━━━━━━━━━━━━━━━━━━━⬢

📊 Status: ${status}
📝 Mensagem: ${mensagem}

📌 Comandos:
┃ °welcome on - Ativar
┃ °welcome off - Desativar
┃ °setwelcome <texto> - Editar
┃ °resetwelcome - Resetar

📌 Placeholders:
┃ {grupo} - Nome do grupo
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
        msg
    );
}

async function cmdSetWelcome(chat, sock, sender, args, msg, enviarResposta, verificarAdmin, isDono, db, salvarDB, CONFIG) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    let mensagem = args.join(' ').trim();

    if (!mensagem) {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
            mensagem = quoted.conversation ||
                quoted.extendedTextMessage?.text ||
                quoted.imageMessage?.caption ||
                quoted.videoMessage?.caption ||
                '';
        }
    }

    if (!mensagem) {
        await enviarResposta(chat, sock,
            `📝 Use: ${CONFIG.prefix}setwelcome <mensagem>\n` +
            `📌 Placeholder: {grupo} (nome do grupo)\n` +
            `📌 Exemplo: ${CONFIG.prefix}setwelcome Seja bem-vindo ao grupo {grupo}!`,
            msg
        );
        return;
    }

    if (!db.welcomeMsg) db.welcomeMsg = {};
    db.welcomeMsg[chat] = mensagem;
    salvarDB();

    await enviarResposta(chat, sock, `✅ Mensagem atualizada!\n\n📝 ${mensagem}`, msg);
}

async function cmdResetWelcome(chat, sock, sender, msg, enviarResposta, verificarAdmin, isDono, db, salvarDB, CONFIG) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    if (db.welcomeMsg) {
        delete db.welcomeMsg[chat];
        salvarDB();
    }

    await enviarResposta(chat, sock, `🔄 Mensagem resetada!\n\n📝 ${MENSAGEM_ENTRADA_PADRAO}`, msg);
}

async function cmdWelcomeSaida(chat, sock, sender, args, msg, enviarResposta, verificarAdmin, isDono, db, salvarDB, CONFIG) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    const acao = args[0]?.toLowerCase();

    if (acao === 'on') {
        if (!db.welcomeSaida) db.welcomeSaida = {};
        db.welcomeSaida[chat] = true;
        salvarDB();
        await enviarResposta(chat, sock, '✅ Welcome (saída) ATIVADO!', msg);
        return;
    }

    if (acao === 'off') {
        if (!db.welcomeSaida) db.welcomeSaida = {};
        db.welcomeSaida[chat] = false;
        salvarDB();
        await enviarResposta(chat, sock, '❌ Welcome (saída) DESATIVADO!', msg);
        return;
    }

    const status = db.welcomeSaida?.[chat] ? '✅ ATIVO' : '❌ DESATIVADO';
    const mensagem = db.welcomeSaidaMsg?.[chat] || MENSAGEM_SAIDA_PADRAO;

    await enviarResposta(chat, sock,
        `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 👋 WELCOME - SAÍDA
╰━━━━━━━━━━━━━━━━━━━━━⬢

📊 Status: ${status}
📝 Mensagem: ${mensagem}

📌 Comandos:
┃ °welcome saida on - Ativar
┃ °welcome saida off - Desativar
┃ °setwsaida <texto> - Editar
┃ °resetwsaida - Resetar

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
        msg
    );
}

async function cmdSetWelcomeSaida(chat, sock, sender, args, msg, enviarResposta, verificarAdmin, isDono, db, salvarDB, CONFIG) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    let mensagem = args.join(' ').trim();

    if (!mensagem) {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
            mensagem = quoted.conversation ||
                quoted.extendedTextMessage?.text ||
                quoted.imageMessage?.caption ||
                quoted.videoMessage?.caption ||
                '';
        }
    }

    if (!mensagem) {
        await enviarResposta(chat, sock,
            `📝 Use: ${CONFIG.prefix}setwsaida <mensagem>\n` +
            `📌 Exemplo: ${CONFIG.prefix}setwsaida Membro saiu do grupo {grupo}!`,
            msg
        );
        return;
    }

    if (!db.welcomeSaidaMsg) db.welcomeSaidaMsg = {};
    db.welcomeSaidaMsg[chat] = mensagem;
    salvarDB();

    await enviarResposta(chat, sock, `✅ Mensagem de saída atualizada!\n\n📝 ${mensagem}`, msg);
}

async function cmdResetWelcomeSaida(chat, sock, sender, msg, enviarResposta, verificarAdmin, isDono, db, salvarDB, CONFIG) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    if (db.welcomeSaidaMsg) {
        delete db.welcomeSaidaMsg[chat];
        salvarDB();
    }

    await enviarResposta(chat, sock, `🔄 Mensagem de saída resetada!\n\n📝 ${MENSAGEM_SAIDA_PADRAO}`, msg);
}

// ==================== EXPORTAR ====================
module.exports = {
    enviarBoasVindas,
    enviarSaida,
    cmdWelcome,
    cmdSetWelcome,
    cmdResetWelcome,
    cmdWelcomeSaida,
    cmdSetWelcomeSaida,
    cmdResetWelcomeSaida,
    MENSAGEM_ENTRADA_PADRAO,
    MENSAGEM_SAIDA_PADRAO,
    IMAGEM_PADRAO
};