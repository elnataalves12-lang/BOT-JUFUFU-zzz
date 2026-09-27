// ==================== SISTEMA DE BOAS-VINDAS ====================
// services/welcome.js
// ============================================================

const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

// ==================== CONFIGURAÇÃO ====================
const BANNER_URL = 'https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1789931108593-u9bx8p.jpg';
const BANNER_PATH = path.join(process.cwd(), 'assets', 'banner.png');
const CANAL_LINK_FALLBACK = 'https://whatsapp.com/channel/0029VbDHw0fAO7RBFTJ3rn1e';

// ==================== CACHE DA PASTA ASSETS ====================
const ASSETS_DIR = path.join(process.cwd(), 'assets');
if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// ==================== CACHE DO BANNER ====================
let bannerImageCache = null;

async function carregarBanner() {
    if (bannerImageCache) return bannerImageCache;

    if (!fs.existsSync(BANNER_PATH)) {
        try {
            const response = await fetch(BANNER_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(BANNER_PATH, buffer);
        } catch (e) {
            return null;
        }
    }

    try {
        bannerImageCache = await loadImage(BANNER_PATH);
        return bannerImageCache;
    } catch (e) {
        return null;
    }
}

// ==================== CACHE DE FOTOS DE PERFIL ====================
// 🔥 Evita baixar a mesma foto múltiplas vezes

const fotoCache = new Map(); // jid -> { buffer, timestamp }
const FOTO_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function pegarFotoCache(jid) {
    const item = fotoCache.get(jid);
    if (!item) return null;

    // Se expirou, remove
    if (Date.now() - item.timestamp > FOTO_CACHE_TTL) {
        fotoCache.delete(jid);
        return null;
    }

    return item.buffer;
}

function salvarFotoCache(jid, buffer) {
    fotoCache.set(jid, {
        buffer,
        timestamp: Date.now()
    });

    // 🔥 Se o cache ficar muito grande, limpa os mais antigos
    if (fotoCache.size > 100) {
        const entradas = [...fotoCache.entries()]
            .sort((a, b) => a[1].timestamp - b[1].timestamp);

        // Remove os 20 mais antigos
        for (let i = 0; i < 20; i++) {
            if (entradas[i]) {
                fotoCache.delete(entradas[i][0]);
            }
        }
    }
}

// ==================== FOTO PADRÃO ====================
const IMAGEM_PADRAO = 'https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1788729255779-an5ltq.jpg';

const MENSAGEM_ENTRADA_PADRAO = '👋 Seja bem-vindo(a) ao grupo {grupo}!';
const MENSAGEM_SAIDA_PADRAO = '👋 {nome} saiu do grupo {grupo}!';

// ==================== BAIXAR IMAGEM ====================
async function baixarImagem(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return Buffer.from(await response.arrayBuffer());
    } catch (error) {
        return null;
    }
}

// ==================== PROCESSAR MENSAGEM ====================
function processarMensagem(mensagem, nome, grupo) {
    if (!mensagem) return null;
    let texto = mensagem;
    texto = texto.replace(/{grupo}/g, grupo);
    texto = texto.replace(/{nome}/g, nome);
    return texto;
}

// ==================== CRIAR BOAS-VINDAS COM CANVAS ====================
async function criarBoasVindasCanvas(fotoUrl, nomeGrupo, totalMembros) {
    try {
        const banner = await carregarBanner();
        if (!banner) return null;

        const canvas = createCanvas(1280, 720);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(banner, 0, 0, 1280, 720);

        const circleX = 640;
        const circleY = 330;
        const circleRadius = 170;

        try {
            const fotoBuffer = await baixarImagem(fotoUrl);
            if (fotoBuffer) {
                const avatar = await loadImage(fotoBuffer);

                ctx.save();
                ctx.beginPath();
                ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                ctx.drawImage(
                    avatar,
                    circleX - circleRadius,
                    circleY - circleRadius,
                    circleRadius * 2,
                    circleRadius * 2
                );

                ctx.restore();
            }
        } catch (e) {}

        ctx.textAlign = 'center';

        // NOME DO GRUPO
        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = '#FFEB3B';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 10;
        ctx.fillText(nomeGrupo.slice(0, 30).toUpperCase(), 640, 620);
        ctx.shadowBlur = 0;

        // TOTAL DE MEMBROS
        ctx.font = '26px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 8;
        ctx.fillText(`${totalMembros} MEMBROS`, 640, 655);
        ctx.shadowBlur = 0;

        return canvas.toBuffer();

    } catch (error) {
        return null;
    }
}

// ==================== PEGAR FOTO (com cache) ====================
async function pegarFotoParticipante(sock, participantId) {
    // 🔥 1. Verifica cache primeiro
    const cache = pegarFotoCache(participantId);
    if (cache) return cache;

    // 🔥 2. Se não tá no cache, baixa
    let fotoUrl = IMAGEM_PADRAO;

    try {
        const foto = await sock.profilePictureUrl(participantId, 'image');
        if (foto) fotoUrl = foto;
    } catch (e) {}

    // 🔥 3. Salva no cache
    salvarFotoCache(participantId, fotoUrl);

    return fotoUrl;
}

// ==================== ENVIAR BOAS-VINDAS ====================
async function enviarBoasVindas(sock, chat, participant, db, CONFIG) {
    try {
        if (!db.welcome || !db.welcome[chat]) return;

        const participantId = typeof participant === 'string' ? participant : participant.id;

        // 🔥 PARALELISMO: metadata + foto ao mesmo tempo
        const [metadata, fotoUrl] = await Promise.all([
            sock.groupMetadata(chat).catch(() => null),
            pegarFotoParticipante(sock, participantId)
        ]);

        const grupoNome = metadata?.subject || 'Grupo';
        const totalMembros = metadata?.participants?.length || 0;

        // 🔥 Cria a imagem (depende da foto, então é sequencial)
        const imageBuffer = await criarBoasVindasCanvas(fotoUrl, grupoNome, totalMembros);

        // 🔥 Mensagem personalizada
        const mensagemPersonalizada = db.welcomeMsg?.[chat] || null;
        const mensagemFinal = mensagemPersonalizada ?
            processarMensagem(mensagemPersonalizada, 'membro', grupoNome) :
            processarMensagem(MENSAGEM_ENTRADA_PADRAO, 'membro', grupoNome);

        const numeroMencao = participantId.split('@')[0];

        const texto = `👋 Seja bem-vindo(a) @${numeroMencao}!\n\n${mensagemFinal}\n\n『 ${CONFIG.botNome} 』`;

        // 🔥 LINK DO CANAL (do config.js)
        const canalLink = CONFIG.canalLink || CANAL_LINK_FALLBACK;

        // 🔥 Envia com botão + menção
        if (imageBuffer) {
            try {
                const mediaContent = await generateWAMessageContent(
                    { image: imageBuffer },
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

            } catch (e) {
                // Fallback
                await sock.sendMessage(chat, {
                    image: imageBuffer,
                    caption: texto,
                    mentions: [participantId]
                });
            }
        } else {
            await sock.sendMessage(chat, {
                text: texto,
                mentions: [participantId]
            });
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
        const mensagemFinal = mensagemPersonalizada ?
            processarMensagem(mensagemPersonalizada, 'membro', grupoNome) :
            processarMensagem(MENSAGEM_SAIDA_PADRAO, 'membro', grupoNome);

        const texto = `\n${mensagemFinal}\n\n『 ${CONFIG.botNome} 』`;

        await sock.sendMessage(chat, {
            text: texto,
            mentions: [participantId]
        });

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
    criarBoasVindasCanvas,
    MENSAGEM_ENTRADA_PADRAO,
    MENSAGEM_SAIDA_PADRAO
};