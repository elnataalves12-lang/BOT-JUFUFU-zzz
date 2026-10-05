// ==================== IMPORTAÇÕES ====================
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, downloadMediaMessage, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const P = require('pino');
const { Boom } = require('@hapi/boom');
const readline = require('readline');
const fetch = require('node-fetch');
const { processarAntiPalavrao, cmdAntiPalavrao } = require('./services/antiPalavrao.js');
const CONFIG = require('./config.js');
const { cmdPlay, cmdLimparCachePlay, cmdCacheStatusPlay } = require('./services/play.js');
const execAsync = promisify(exec);  
const { startBot, getSocket, isConnected, setOnBotOnline } = require('./bot.js');
const { cmdYt } = require('./services/youtube.js');
const { cmdStickerToMedia } = require('./services/stickerToMedia.js');
const { cmdStickerToGif } = require('./services/stickerToGif.js');
const { renomearFigurinha } = require('./services/renameSticker.js');
const { createSticker } = require('./services/sticker.js');
const { cmdBotInfo } = require('./services/botInfo.js');
const { cmdWaifu, cmdNeko } = require('./services/waifu.js');
const { cmdGifSticker } = require('./services/stickerGif.js');
const { cmdPerfil } = require('./services/profileCommand.js');
const { cmdGerarImagem } = require('./services/imageAI.js');
const { processarAntiLinkSupremo } = require('./services/antiLinkSupremo.js');
const { cmdTts } = require('./services/tts.js');
const { cmdAllGlb } = require('./services/allglb.js');
const { cmdRevelar } = require('./services/revelar.js');
const { verificarBlacklistNaEntrada } = require('./services/blacklistJoin.js');
const { cmdCriador } = require('./services/criador.js');
const { cmdPdf } = require('./services/pdf.js');
const { cmdPack, responderBotaoPack } = require('./services/pack.js');
const { cmdEmojiMix } = require('./services/emojimix.js');
const { initModule: initPing, cmdPing } = require('./services/ping.js');

// ==================== INÍCIO DO BOT ====================
global.inicioBot = Date.now();
// ==================== PASTAS ====================
const PASTAS = {
  auth: path.join(process.cwd(), 'auth_joe'),
  musicas: path.join(process.cwd(), 'musicas'),
  temp: path.join(process.cwd(), 'temp'),
  cache: path.join(process.cwd(), 'cache'),
  session: path.join(process.cwd(), 'session')
};

// ==================== CACHE ====================
const cacheBusca = new Map();
const CACHE_TEMPO = 120000; // 2 minutos
const downloadsAtivos = new Map();

// Criar pastas necessárias
Object.values(PASTAS).forEach(pasta => {
  if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });
});

// ==================== BANCO DE DADOS ====================
let db = {
  welcome: {},
  welcomeMsg: {},
  antilink: {},
  antilinkBan: {},
  mutados: {},
  rankAtivo: {},
  nivelAtivo: {},
  afk: {},
  donos: [],
  regras: {},
  interactionGifs: {
    tapa: "", matar: "", beijar: "", abracar: "", socar: ""
  },
  warning: {},
  antiSpam: {},
  temporizador: {},
  nivelXp: {},
  antiPalavrao: {},
  levelConfig: {},
  agendamentos: {}
};

const { 
    cmdShip, 
    cmdShipTop, 
    cmdPedir,
    cmdAceitar,
    cmdRecusar,
    cmdPedidos,
    cmdCasados, 
    cmdDivorciar, 
    cmdAmor,
    cmdPresentear
} = require('./services/marriage.js');

// ==================== IMPORTAÇÕES ====================
const { 
    cmdSetGroupPhoto,
    cmdSetGroupDesc,
    cmdGroupInfo,
    cmdGroupDesc,
    cmdGroupAdmins,
    cmdGroupMembers,
    cmdGroupId,
    cmdGroupCreated
} = require('./services/group.js');

// ==================== IMPORTAÇÕES ====================
const {
    cmdAntiAudio,
    cmdAntiImage,
    cmdAntiVideo,
    cmdAntiSticker,
    cmdAntiDocument,
    processarAntiMidia
} = require('./services/antiMidia.js');

// ==================== IMPORTAÇÕES ====================
const {
    cmdRankFeio,
    cmdRankBonito,
    cmdRankCorno,
    cmdRankGay,
    cmdRankFofo,
    cmdRankDoido,
    cmdSetRankImage,
    cmdBaixarRankImages,
    initRankings,
    baixarTodasImagensRankings
} = require('./services/rankings.js');

// ==================== IMPORTAÇÕES ====================
const {
    cmdBlacklistAdd,
    cmdBlacklistRemove,
    cmdBlacklistView,
    initBlacklist
} = require('./services/blacklist.js');

// ==================== IMPORTAÇÕES ====================
const { 
    tratarComandoMenu,
    responderBotaoMenu,
    iniciarAvisosDoPainel,
    enviarMenu,
    enviarMenus,
    enviarMenuAdm,
    enviarMenuBrincadeira,
    enviarMenuDono
} = require('./services/menus.js');

// ==================== IMPORTAÇÕES ====================
const { 
    enviarBoasVindas,
    enviarSaida,
    cmdWelcome,
    cmdSetWelcome,
    cmdResetWelcome,
    cmdWelcomeSaida,
    cmdSetWelcomeSaida,
    cmdResetWelcomeSaida
} = require('./services/welcome.js');

// ==================== IMPORTAÇÕES ====================
const {
    cmdGay,
    cmdCorno,
    cmdPassivo,
    cmdLindo,
    cmdLinda,
    cmdFeio,
    cmdFeia,
    cmdLesbica,
    cmdInteligente,
    cmdBurro,
    cmdBurra
} = require('./services/porcentagem.js');

// ==================== IMPORTAÇÕES DAS INTERAÇÕES ====================
const {
    cmdTapa,
    cmdMatar,
    cmdBeijar,
    cmdAbracar,
    cmdSocar,
    cmdListarInteracoes
} = require('./services/interactions.js');

// ================ pinterest ================
const { 
    cmdPinterest,
    responderBotaoPinterest 
} = require('./services/pinterest.js');

// ================ protecao de adm ================
const {
    processarMudancaAdm,
    processarBan,
    cmdProtecaoAdm,
    cmdAdmAllowed
} = require('./services/protecaoAdm.js'); 

// ==================== IMPORTAÇÕES ====================
const {
    cmdAceitarSolicitacoes,
    cmdListarSolicitacoes
} = require('./services/joinRequests.js');

const DB_PATH = path.join(process.cwd(), 'database.json');
if (fs.existsSync(DB_PATH)) {
  try { 
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    db = { ...db, ...data };
  } catch(e) { console.error('Erro ao carregar DB'); }
}

function salvarDB() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch(e) { 
    console.error('Erro ao salvar DB:', e.message); 
  }
}

// 🔥 EXPÕE O DB GLOBALMENTE (pra outros módulos acessarem)
global.db = db;
global.salvarDB = salvarDB;
// ==================== INICIALIZAR ESTRUTURAS DO DB ====================
const initDB = () => {
  // Estruturas existentes
  ['mutados', 'rankAtivo', 'nivelAtivo', 'afk', 'donos', 'regras', 'warning', 'antiSpam', 'temporizador', 'nivelXp', 'levelConfig', 'agendamentos'].forEach(key => {
    if (!db[key]) db[key] = {};
  });
  
 
  // 🔥 GARANTE QUE db.donos SEJA UM ARRAY (NÃO UM OBJETO)
  if (!db.donos || !Array.isArray(db.donos)) {
    db.donos = [];
  }
  
  
  if (!db.interactionGifs) {
    db.interactionGifs = { tapa: "", matar: "", beijar: "", abracar: "", socar: "" };
  }
  if (!db.welcome) db.welcome = {};
  if (!db.welcomeMsg) db.welcomeMsg = {};
  if (!db.antilink) db.antilink = {};
  if (!db.antilinkBan) db.antilinkBan = {};
  
  // 🔥 ADICIONAR CONFIGURAÇÃO DO MENU
  if (!db.menuConfig) {
    db.menuConfig = {
      global: {
        prefix: '°',
        video: null,
        image: null,
        audio: null,
        audioDono: null,
        updatedBy: null,
        updatedAt: null
      }
    };
  }
};
initDB();

// ==================== IMPORTAÇÕES DO RPG ====================
const {
    initModule,
    cmdToggleRPG,
    isRPGAtivo,
    getNomeUsuario,
    trabalhar,
    diaria,
    vagasEmprego,
    contratar,
    demitir,
    carteira,
    rankTrabalho,
    cmdJogoDaVelha,
    cmdJogarVelha,
    cmdCassino,
    cmdDepositar,
    cmdSacar,
    cmdTransferir,
    cmdMinerar,
    cmdComprarPicareta,
    cmdComprarEscudo,
    cmdQuiz,
    cmdColherPolen,
    cmdRankGold
} = require('./services/rpgSystem.js');

// 🔥 INICIALIZAR O MÓDULO RPG
initModule(db, CONFIG, enviarResposta, DB_PATH);

// ==================== MENSAGUENS ====================
const {
    initModule: initMensagens,
    contarMensagem: contarMensagemXp,
    cmdMinhasMensagens,
    cmdPerfilMensagens,
    cmdRankMensagens,
    cmdResumoMensagens,
    iniciarSchedulerMensagens
} = require('./services/mensagens.js');

// 🔥 INICIALIZAR MÓDULO MENSAGENS
initMensagens(db, CONFIG, enviarResposta, salvarDB, verificarAdmin, isDono);

// ==================== CITAR-MARCAR ===================
const {
    initModule: initCitar,
    cmdMarcaTodos,
    cmdMarcarAdm,
    cmdCitar
} = require('./services/citar.js');
// 🔥 INICIALIZAR MÓDULO CITAR
initCitar(CONFIG, enviarResposta, reagir, verificarAdmin, isDono);
// ==================== IMPORTAÇÕES DO AFK ====================
const {
    initModule: initAfk,
    setAfk,
    removerAfk,
    verificarAfk,
    listarAfks,
    cmdAfk,
    cmdAfks
} = require('./services/afk.js');

// 🔥 INICIALIZAR O MÓDULO AFK
initAfk(db, CONFIG, enviarResposta, salvarDB);

// ==================== IMPORTAÇÃO DO SISTEMA DE ÁUDIO ====================
const {
    processarAudio,
    cmdVideoToAudio,
    cmdListarEfeitos,
    EFEITOS
} = require('./services/audioEffects.js');

// ==================== IMPORTAÇÕES DO SCHEDULER ====================
const {
    initModule: initScheduler,
    agendarFechamento,
    agendarAbertura,
    verAgendamentos,
    deletarAgendamento,
    iniciarScheduler,
    carregarAgendamentosInicial
} = require('./services/scheduler.js');
initScheduler(db, CONFIG, enviarResposta, reagir, DB_PATH);

// ==================== FUNÇÕES AUXILIARES ====================
function obterNomeUsuario(sock, jid) {
  try {
    const nome = sock.user?.name || sock.user?.pushName || jid.split('@')[0];
    return nome;
  } catch { return jid.split('@')[0]; }
}

async function marcarComoLida(sock, msg) {
  try { await sock.readMessages([msg.key]); } catch (e) {}
}

async function verificarAdmin(sock, chat, sender) {
  try {
    const metadata = await sock.groupMetadata(chat);
    return metadata.participants.some(p => p.id === sender && p.admin);
  } catch { return false; }
}

async function isDono(sender) {
  const senderId = sender.split('@')[0];
  return senderId === CONFIG.donoOriginal || (Array.isArray(db.donos) && db.donos.includes(senderId));
}

async function podeComandoAdmin(sock, chat, sender) {
  const isAdmin = await verificarAdmin(sock, chat, sender);
  const isDonoBot = await isDono(sender);
  return isAdmin || isDonoBot;
}

async function podeBanir(sock, chat, sender, alvo) {
  const pode = await podeComandoAdmin(sock, chat, sender);
  if (!pode) return { pode: false, motivo: '🚫 Apenas administradores!' };
  
  const alvoAdmin = await verificarAdmin(sock, chat, alvo);
  if (alvoAdmin) {
    return { pode: false, motivo: '🛡️ Não é possível banir um administrador!' };
  }
  
  if (await isDono(alvo)) {
    await alertarContraDono(chat, sock, null);
    return { pode: false, motivo: '🔒 Não pode banir o dono!' };
  }
  
  if (alvo === sock.user.id) {
    return { pode: false, motivo: '❌ Não posso me banir!' };
  }
  
  return { pode: true };
}

const avisosContraDono = [
  '🚫 Ops! Esse é o criador do bot!',
  '⚠️ Tentativa frustrada!',
  '🔒 Você não pode fazer isso!',
  '💀 O dono é imune!',
  '🤖 Proteção ativada!',
  '🎵 Nem tente!',
  '🛡️ Escudo ativado!',
  '⚡ Comando bloqueado!'
];

async function alertarContraDono(chat, sock, msg) {
  const aviso = avisosContraDono[Math.floor(Math.random() * avisosContraDono.length)];
  if (msg) {
    await enviarResposta(chat, sock, aviso, msg);
  } else {
    await sock.sendMessage(chat, { text: aviso });
  }
}

async function obterMencionado(msg, texto) {
  let mencionado = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (!mencionado) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (quoted) return quoted;
    const match = texto.match(/@(\d+)/);
    if (match) return `${match[1]}@s.whatsapp.net`;
  }
  return mencionado;
}

async function reagir(sock, chat, msgId, emoji) {
  try { await sock.sendMessage(chat, { react: { text: emoji, key: { remoteJid: chat, id: msgId } } }); } catch (e) {}
}

const emojiProcessando = '⌛';
const emojiSucesso = '✅';
const emojiErro = '❌';
const emojiAudio = '🎵';
const emojiSticker = '🎨';

// ==================== ENVIO DE RESPOSTAS ====================
async function enviarResposta(chat, sock, texto, quoted, mentions = []) {
    // 🔥 PEGA O LINK DO CONFIG
    const canalLink = CONFIG.canalLink || 'https://whatsapp.com/channel/0029VbDHw0fAO7RBFTJ3rn1e';
    const msgFinal = texto;
    
    try {
        // 🔥 TENTA ENVIAR COM BOTÕES
        const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
        
        // 🔥 CONSTRÓI A MENSAGEM INTERATIVA (COM MENTIONS)
        const interactiveMessage = {
            body: { text: msgFinal },
            footer: { text: CONFIG.botNome },
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
            }
        };
        
        // 🔥 CONSTRÓI A MENSAGEM
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
        
        // 🔥 ADICIONA AS MENÇÕES
        if (mentions && mentions.length > 0) {
            msgContent.message.viewOnceMessage.message.interactiveMessage.contextInfo = {
                mentionedJid: mentions
            };
        }
        
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
        
        
    } catch (error) {
        // 🔥 FALLBACK: ENVIA SEM BOTÃO
        const footer = `\n\n🎮 ${CONFIG.botNome}\n📢 ${canalLink}`;
        const msgFallback = texto + footer;
        
        try {
            await sock.sendMessage(chat, { text: msgFallback, mentions }, { quoted });
        } catch (e) {
            // 🔥 ÚLTIMO RECURSO: ENVIA SEM QUOTED
            try {
                await sock.sendMessage(chat, { text: msgFallback, mentions });
            } catch (e2) {
                console.error('❌ Erro total ao enviar mensagem:', e2.message);
            }
        }
    }
}

// ==================== ENVIO DE RESPOSTAS (SEM BOTÃO) ====================
async function enviarRespostaMenu(chat, sock, texto, quoted, mentions = []) {
    // 🔥 PEGA O PRIMEIRO DONO DO CONFIG
    let nomeDono = 'N/A';
    if (CONFIG.donos && Array.isArray(CONFIG.donos) && CONFIG.donos.length > 0) {
        nomeDono = CONFIG.donos[0];
    }
    
    // 🔥 RODAPÉ SIMPLES (SEM BOTÃO)
    const footer = `\n\n🎮 ${CONFIG.botNome} | 👑 ${nomeDono}`;
    const msgFinal = texto + footer;
    
    try {
        await sock.sendMessage(chat, { text: msgFinal, mentions }, { quoted });
    } catch (e) {
        await sock.sendMessage(chat, { text: msgFinal, mentions }, { quoted });
    }
}
 
// ==================== COMANDO °AUDIO ====================
async function cmdAudio(chat, sock, msg, args, sender) {
    const efeito = args[0]?.toLowerCase();
    if (!efeito) {
        await cmdListarEfeitos(chat, sock, msg);
        return;
    }
    await processarAudio(chat, sock, msg, efeito, sender, enviarResposta, reagir, downloadMediaMessage, P, CONFIG);
}

// ==================== COMANDO °VIDEOAUDIO ====================
async function cmdVideoAudio(chat, sock, msg, sender) {
    await cmdVideoToAudio(chat, sock, msg, sender, enviarResposta, reagir, downloadMediaMessage, P, CONFIG);
}

// ==================== COMANDO °EFEITOS ====================
async function cmdEfeitos(chat, sock, msg) {
    await cmdListarEfeitos(chat, sock, msg, enviarResposta, CONFIG);
}

// ==================== RANK ATIVO ====================
async function contarMensagem(chat, sender, msg, sock) {
  if (!chat.endsWith('@g.us')) return;
  if (sender === sock.user.id) return;
  if (msg.key.fromMe) return;
  
  if (!db.rankAtivo[chat]) db.rankAtivo[chat] = {};
  if (!db.rankAtivo[chat][sender]) {
    db.rankAtivo[chat][sender] = { mensagens: 0, ultimaMsg: Date.now(), tipos: {} };
  }
  db.rankAtivo[chat][sender].mensagens++;
  db.rankAtivo[chat][sender].ultimaMsg = Date.now();
  salvarDB();
}

// ==================== RANK ATIVO - VISUAL PREMIUM ====================
async function mostrarRankAtivo(chat, sock, msg) {
  const rankData = db.rankAtivo[chat];
  if (!rankData || Object.keys(rankData).length === 0) {
    await enviarResposta(chat, sock, '📊 Nenhuma mensagem registrada!', msg);
    return;
  }
  
  const ranking = Object.entries(rankData)
    .map(([id, data]) => ({ id, mensagens: data.mensagens }))
    .sort((a, b) => b.mensagens - a.mensagens)
    .slice(0, 15);
  
  const totalMensagens = ranking.reduce((acc, user) => acc + user.mensagens, 0);
  const agora = new Date();
  const dataAtual = agora.toLocaleDateString('pt-BR');
  const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🏆 𝐑𝐀𝐍𝐊 𝐃𝐎 𝐆𝐑𝐔𝐏𝐎
┃ 📊 ${ranking.length} usuários ativos
┃ 💬 ${totalMensagens} mensagens totais
┃ 📅 ${dataAtual} | 🕐 ${horaAtual}
╰━━━━━━━━━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━━━━━━━━━⬢\n`;
  
  ranking.forEach((user, index) => {
    let medalha = '';
    let cor = '';
    if (index === 0) {
      medalha = '👑';
      cor = '🥇';
    } else if (index === 1) {
      medalha = '🥈';
    } else if (index === 2) {
      medalha = '🥉';
    } else if (index < 6) {
      medalha = '⭐';
    } else if (index < 11) {
      medalha = '💫';
    } else {
      medalha = '🔹';
    }
    
    let status = '';
    if (index === 0) status = '🔥 Líder';
    else if (index === 1) status = '⚡ Vice';
    else if (index === 2) status = '💪 Top 3';
    else if (index < 6) status = '🌟 Destaque';
    else if (index < 11) status = '📈 Ativo';
    else status = '💬 Participante';
    
    const barraTamanho = 15;
    const progresso = Math.min(Math.floor((user.mensagens / totalMensagens) * barraTamanho), barraTamanho);
    let barra = '';
    for (let i = 0; i < barraTamanho; i++) {
      if (i < progresso) {
        barra += '▰';
      } else {
        barra += '▱';
      }
    }
    
    const nome = user.id.split('@')[0];
    texto += `┃ ${medalha} ${cor} @${nome}
┃ 📩 ${user.mensagens} mensagens
┃ ${barra} ${status}
┃ ──────────────────────────\n`;
  });
  
  texto += `╰━━━━━━━━━━━━━━━━━━━━━⬢
╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🎮 ${CONFIG.botNome}
┃ 👑 ${CONFIG.donoOriginal}
┃ 📌 Use ${CONFIG.prefix}meustatus para ver sua posição
╰━━━━━━━━━━━━━━━━━━━━━⬢

『 ${CONFIG.botNome} 』
▰▰▰▰▰▰▰▰▰▰ 100%`;
  
  const mentions = ranking.map(user => user.id);
  await sock.sendMessage(chat, { text: texto, mentions }, { quoted: msg });
}

async function resetarRankAtivo(chat, sender, sock, msg) {
  const pode = await podeComandoAdmin(sock, chat, sender);
  if (!pode) {
    await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
    return;
  }
  if (!db.rankAtivo[chat]) {
    await enviarResposta(chat, sock, '📊 Nenhum dado encontrado!', msg);
    return;
  }
  db.rankAtivo[chat] = {};
  salvarDB();
  await enviarResposta(chat, sock, '✅ Rank resetado!', msg);
}

async function meuStatus(chat, sock, sender, msg) {
  const rankData = db.rankAtivo[chat];
  if (!rankData || !rankData[sender]) {
    await enviarResposta(chat, sock, '📊 Sem mensagens registradas!', msg);
    return;
  }
  
  const stats = rankData[sender];
  const ranking = Object.entries(rankData).sort((a, b) => b[1].mensagens - a[1].mensagens).map(([id]) => id);
  const posicao = ranking.indexOf(sender) + 1;
  
  const texto = `开启 ${CONFIG.botNome} - Status 〛\n╭━━━━━━━━━━━━━⬢\n┃ 👤 @${sender.split('@')[0]}\n┃ 📊 ${posicao}º lugar\n┃ 💬 ${stats.mensagens} mensagens\n╰━━━━━━━━━━━━━⬢`;
  
  await sock.sendMessage(chat, { text: texto, mentions: [sender] }, { quoted: msg });
}
// ==================== FUNÇÃO AUXILIAR PARA ENVIAR MÍDIA ====================

async function enviarMidiaComMencao(sock, chat, quoted, buffer, mentions, texto) {
    const isImage = !!quoted.imageMessage;
    const isVideo = !!quoted.videoMessage;
    const isAudio = !!quoted.audioMessage;
    const isSticker = !!quoted.stickerMessage;

    let mimeType = '';
    let mediaType = '';

    if (isImage) {
        mimeType = quoted.imageMessage?.mimetype || 'image/jpeg';
        mediaType = 'image';
    } else if (isVideo) {
        mimeType = quoted.videoMessage?.mimetype || 'video/mp4';
        mediaType = 'video';
    } else if (isAudio) {
        mimeType = quoted.audioMessage?.mimetype || 'audio/ogg; codecs=opus';
        mediaType = 'audio';
    } else if (isSticker) {
        mediaType = 'sticker';
    }

    // 🔥 CORTA O TEXTO SE FOR MUITO LONGO (PARA CABER NA LEGENDA)
    let caption = texto || '';
    if (caption.length > 1000) {
        caption = caption.slice(0, 997) + '...';
    }

    const msgOptions = {
        mentions: mentions
    };

    // 🔥 ADICIONA LEGENDA SE TIVER TEXTO
    if (caption && (isImage || isVideo)) {
        msgOptions.caption = caption;
    }

    if (isImage) {
        await sock.sendMessage(chat, {
            image: buffer,
            ...msgOptions
        }, { quoted: { message: quoted, key: { id: '' } } });
    } else if (isVideo) {
        await sock.sendMessage(chat, {
            video: buffer,
            mimetype: mimeType,
            ...msgOptions
        }, { quoted: { message: quoted, key: { id: '' } } });
    } else if (isAudio) {
        await sock.sendMessage(chat, {
            audio: buffer,
            mimetype: mimeType,
            ptt: true,
            ...msgOptions
        }, { quoted: { message: quoted, key: { id: '' } } });
    } else if (isSticker) {
        await sock.sendMessage(chat, {
            sticker: buffer,
            ...msgOptions
        }, { quoted: { message: quoted, key: { id: '' } } });
    }
}

// ==================== CRIAR FIGURINHA ====================
async function criarFigurinha(chat, sock, sender, msg) {
    // 🔥 PEGA A MÍDIA RESPONDIDA (se tiver)
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    // 🔥 PEGA A MÍDIA DA PRÓPRIA MENSAGEM (se tiver)
    const midiaAtual = msg.message?.imageMessage || msg.message?.videoMessage;

    // 🔥 DEFINE DE ONDE VAI PEGAR A MÍDIA
    let midiaFonte = null;
    let tipoMidia = null;

    if (quoted && (quoted.imageMessage || quoted.videoMessage)) {
        // ✅ CASO 1: RESPONDENDO UMA MÍDIA
        midiaFonte = quoted;
        tipoMidia = quoted.imageMessage ? 'image' : 'video';
    } else if (midiaAtual) {
        // ✅ CASO 2: ENVIANDO MÍDIA COM O COMANDO
        midiaFonte = msg.message;
        tipoMidia = msg.message.imageMessage ? 'image' : 'video';
    } else {
        // ❌ NENHUMA MÍDIA
        await enviarResposta(chat, sock,
            '⚠️ Envie uma foto/vídeo (até 10s) com °sticker\n' +
            '📌 Ou responda uma mídia com °sticker',
            msg
        );
        return;
    }

    const isImage = tipoMidia === 'image';
    const isVideo = tipoMidia === 'video';

    // 🔥 VERIFICA DURAÇÃO DO VÍDEO
    if (isVideo) {
        const seconds = midiaFonte.videoMessage?.seconds;
        if (seconds > 10) {
            await enviarResposta(chat, sock, '⚠️ O vídeo tem mais de 10 segundos!', msg);
            return;
        }
    }

    await reagir(sock, chat, msg.key.id, '⏳');

    try {
        const downloadImage = async (webMsg, getRandomName) => {
            const target = { message: webMsg.message || webMsg, key: msg.key };
            const buffer = await downloadMediaMessage(target, 'buffer', {}, { logger: P({ level: 'silent' }) });
            const filePath = path.join(PASTAS.temp, getRandomName('png'));
            fs.writeFileSync(filePath, buffer);
            return filePath;
        };

        const downloadVideo = async (webMsg, getRandomName) => {
            const target = { message: webMsg.message || webMsg, key: msg.key };
            const buffer = await downloadMediaMessage(target, 'buffer', {}, { logger: P({ level: 'silent' }) });
            const filePath = path.join(PASTAS.temp, getRandomName('mp4'));
            fs.writeFileSync(filePath, buffer);
            return filePath;
        };

        const sendStickerFromFile = async (stickerPath) => {
            const buffer = fs.readFileSync(stickerPath);
            await sock.sendMessage(chat, { sticker: buffer }, { quoted: msg });
        };

        // 🔥 PEGA O NICK DA PESSOA
        const nickPessoa = msg.pushName || sender.split('@')[0];

        await createSticker({
            isImage,
            isVideo,
            downloadImage,
            downloadVideo,
            webMessage: {
                message: midiaFonte,       // ← AQUI (mídia respondida OU atual)
                key: msg.key,
                pushName: msg.pushName
            },
            sendStickerFromFile,
            userLid: sender,
            msg: msg,
            metadataCustom: {
                creator: nickPessoa
            }
        });

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (err) {
        console.error('❌ Erro ao criar sticker:', err);
        await enviarResposta(chat, sock, `❌ ${err.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}
// ==================== COMANDOS ADMIN ====================
async function mutar(sock, chat, alvo, msg) {
  if (!db.mutados[chat]) db.mutados[chat] = [];
  if (!db.mutados[chat].includes(alvo)) {
    db.mutados[chat].push(alvo);
    salvarDB();
    await enviarResposta(chat, sock, `🔇 @${alvo.split('@')[0]} mutado!`, msg, [alvo]);
  }
}

async function desmutar(sock, chat, alvo, msg) {
  if (db.mutados[chat] && db.mutados[chat].includes(alvo)) {
    db.mutados[chat] = db.mutados[chat].filter(id => id !== alvo);
    salvarDB();
    await enviarResposta(chat, sock, `🔊 @${alvo.split('@')[0]} desmutado!`, msg, [alvo]);
  }
}

async function deletarMensagem(sock, chat, msg) {
  try {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) throw new Error();
    const key = {
      remoteJid: chat,
      fromMe: false,
      id: msg.message.extendedTextMessage.contextInfo.stanzaId,
      participant: msg.message.extendedTextMessage.contextInfo.participant
    };
    await sock.sendMessage(chat, { delete: key });
    await enviarResposta(chat, sock, '🗑️ Mensagem apagada!', msg);
  } catch {
    await enviarResposta(chat, sock, '❌ Não foi possível apagar!', msg);
  }
}

// ==================== SISTEMA DE DONOS ====================

// ==================== VERIFICAR SE É DONO ====================
async function isDono(sender) {
    try {
        if (!sender) return false;
        
        const senderId = String(sender).split('@')[0];
        
        // 🔥 GARANTE QUE db.donos É UM ARRAY
        if (!db.donos) db.donos = [];
        if (!Array.isArray(db.donos)) db.donos = [];
        
        // 🔥 GARANTE QUE CONFIG.donos É UM ARRAY
        if (!CONFIG.donos) CONFIG.donos = [];
        if (!Array.isArray(CONFIG.donos)) CONFIG.donos = [];
        
        // 🔥 VERIFICA NO CONFIG.donos
        for (const dono of CONFIG.donos) {
            if (!dono) continue;
            const donoStr = String(dono);
            if (senderId === donoStr || senderId.includes(donoStr) || donoStr.includes(senderId)) {
                return true;
            }
        }
        
        // 🔥 VERIFICA NO BANCO DE DADOS (FALLBACK)
        for (const dono of db.donos) {
            if (!dono) continue;
            const donoStr = String(dono);
            if (senderId === donoStr || senderId.includes(donoStr) || donoStr.includes(senderId)) {
                return true;
            }
        }
        
        return false;
        
    } catch (error) {
        console.error('❌ Erro ao verificar dono:', error.message);
        return false;
    }
}

// ==================== ADICIONAR DONO ====================
async function adicionarDono(chat, sock, sender, alvo, msg) {
    // 🔥 VERIFICA SE É DONO
    if (!await isDono(sender)) {
        await enviarResposta(chat, sock, '🔒 Apenas donos podem adicionar outros donos!', msg);
        return;
    }
    
    if (!alvo) {
        await enviarResposta(chat, sock, `⚠️ Marque alguém: ${CONFIG.prefix}adddono @user`, msg);
        return;
    }
    
    const alvoId = alvo.split('@')[0];
    
    // 🔥 VERIFICA SE JÁ É DONO
    if (Array.isArray(CONFIG.donos) && CONFIG.donos.includes(alvoId)) {
        await enviarResposta(chat, sock, `⚠️ @${alvoId} já é dono!`, msg, [alvo]);
        return;
    }
    
    // 🔥 ADICIONA AO CONFIG
    if (!Array.isArray(CONFIG.donos)) CONFIG.donos = [];
    CONFIG.donos.push(alvoId);
    
    // 🔥 SALVA NO ARQUIVO
    try {
        const fs = require('fs');
        const configPath = path.join(__dirname, 'config.js');
        let configContent = fs.readFileSync(configPath, 'utf8');
        
        const donosStr = JSON.stringify(CONFIG.donos, null, 4);
        const newConfigContent = configContent.replace(
            /donos:\s*\[[^\]]*\]/,
            `donos: ${donosStr}`
        );
        fs.writeFileSync(configPath, newConfigContent);
        
        await enviarResposta(chat, sock, `👑 @${alvoId} agora é dono!\n📌 Adicionado ao config.js`, msg, [alvo]);
    } catch (err) {
        console.error('❌ Erro ao salvar config:', err);
        await enviarResposta(chat, sock, `❌ Erro ao salvar: ${err.message}`, msg);
    }
}

// ==================== REMOVER DONO ====================
async function removerDono(chat, sock, sender, alvo, msg) {
    // 🔥 VERIFICA SE É DONO
    if (!await isDono(sender)) {
        await enviarResposta(chat, sock, '🔒 Apenas donos podem remover outros donos!', msg);
        return;
    }
    
    if (!alvo) {
        await enviarResposta(chat, sock, `⚠️ Marque alguém: ${CONFIG.prefix}removerdono @user`, msg);
        return;
    }
    
    const alvoId = alvo.split('@')[0];
    
    if (!Array.isArray(CONFIG.donos) || !CONFIG.donos.includes(alvoId)) {
        await enviarResposta(chat, sock, `⚠️ @${alvoId} não é dono!`, msg, [alvo]);
        return;
    }
    
    // 🔥 REMOVE DO CONFIG
    CONFIG.donos = CONFIG.donos.filter(id => id !== alvoId);
    
    // 🔥 SALVA NO ARQUIVO
    try {
        const fs = require('fs');
        const configPath = path.join(__dirname, 'config.js');
        let configContent = fs.readFileSync(configPath, 'utf8');
        
        const donosStr = JSON.stringify(CONFIG.donos, null, 4);
        const newConfigContent = configContent.replace(
            /donos:\s*\[[^\]]*\]/,
            `donos: ${donosStr}`
        );
        fs.writeFileSync(configPath, newConfigContent);
        
        await enviarResposta(chat, sock, `👋 @${alvoId} removido dos donos!`, msg, [alvo]);
    } catch (err) {
        console.error('❌ Erro ao salvar config:', err);
        await enviarResposta(chat, sock, `❌ Erro ao salvar: ${err.message}`, msg);
    }
}

// ==================== LISTAR DONOS ====================
async function listarDonos(chat, sock, msg) {
    let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 👑 DONOS DO BOT
╰━━━━━━━━━━━━━━━━━━━━━⬢\n`;

    if (Array.isArray(CONFIG.donos) && CONFIG.donos.length > 0) {
        for (const dono of CONFIG.donos) {
            texto += `┃ 👤 @${dono}\n`;
        }
    } else {
        texto += `┃ 📌 Nenhum dono configurado.\n`;
    }

    texto += `\n╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

    const mentions = [];
    if (Array.isArray(CONFIG.donos)) {
        for (const dono of CONFIG.donos) {
            mentions.push(dono + '@s.whatsapp.net');
        }
    }

    await sock.sendMessage(chat, { text: texto, mentions }, { quoted: msg });
}

// ==================== LIMPAR TODOS OS DONOS ====================
async function limparDonos(chat, sock, sender, msg) {
    // 🔥 VERIFICA SE É DONO
    if (!await isDono(sender)) {
        await enviarResposta(chat, sock, '🔒 Apenas donos podem usar este comando!', msg);
        return;
    }
    
    let removidosConfig = 0;
    
    // 🔥 LIMPA DO CONFIG
    if (Array.isArray(CONFIG.donos) && CONFIG.donos.length > 0) {
        removidosConfig = CONFIG.donos.length;
        CONFIG.donos = [];
        
        try {
            const fs = require('fs');
            const configPath = path.join(__dirname, 'config.js');
            let configContent = fs.readFileSync(configPath, 'utf8');
            
            const donosStr = JSON.stringify(CONFIG.donos, null, 4);
            const newConfigContent = configContent.replace(
                /donos:\s*\[[^\]]*\]/,
                `donos: ${donosStr}`
            );
            fs.writeFileSync(configPath, newConfigContent);
        } catch (err) {
            console.error('❌ Erro ao salvar config:', err);
        }
    }
    
    // 🔥 LIMPA DO DB
    if (Array.isArray(db.donos) && db.donos.length > 0) {
        db.donos = [];
        salvarDB();
    }
    
    await enviarResposta(chat, sock, 
        `✅ **DONOS LIMPOS!**\n\n` +
        `📊 Removidos: ${removidosConfig}\n\n` +
        `📌 Use °adddono @user para adicionar novos donos.`,
        msg
    );
}
// ==================== REGRAS ====================
async function setRegras(chat, sock, sender, args, msg) {
  const pode = await podeComandoAdmin(sock, chat, sender);
  if (!pode) {
    await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
    return;
  }
  
  const regrasTexto = args.join(' ').trim();
  if (!regrasTexto) {
    await enviarResposta(chat, sock, `📝 Use: ${CONFIG.prefix}setregras <texto>`, msg);
    return;
  }
  
  db.regras[chat] = regrasTexto;
  salvarDB();
  await enviarResposta(chat, sock, '✅ Regras definidas!', msg);
}

async function verRegras(chat, sock, msg) {
  const regras = db.regras[chat];
  if (!regras) {
    await enviarResposta(chat, sock, '📜 Nenhuma regra definida!', msg);
    return;
  }
  
  try {
    const metadata = await sock.groupMetadata(chat);
    let fotoGrupo = null;
    try { fotoGrupo = await sock.profilePictureUrl(chat, 'image'); } catch (err) {}
    
    const texto = `开启 ${CONFIG.botNome} - Regras 〛\n╭━━━━━━━━━━━━━⬢\n┃ 🏠 ${metadata.subject}\n┃ 📜 ${regras}\n╰━━━━━━━━━━━━━⬢`;
    
    if (fotoGrupo) {
      await sock.sendMessage(chat, { image: { url: fotoGrupo }, caption: texto }, { quoted: msg });
    } else {
      await sock.sendMessage(chat, { text: texto }, { quoted: msg });
    }
  } catch (err) {
    await enviarResposta(chat, sock, `📜 ${regras}`, msg);
  }
}

// ==================== ARTE DO BOT ====================
function mostrarArte() {
    const chalk = require('chalk');
    console.clear();
    console.log(chalk.hex('#FFF59D')('     ██╗██╗   ██╗███████╗██╗   ██╗███████╗██╗   ██╗'));
    console.log(chalk.hex('#FFE082')('     ██║██║   ██║██╔════╝██║   ██║██╔════╝██║   ██║'));
    console.log(chalk.hex('#FFD54F')('     ██║██║   ██║█████╗  ██║   ██║█████╗  ██║   ██║'));
    console.log(chalk.hex('#FFC107')('██╗  ██║██║   ██║██╔══╝  ██║   ██║██╔══╝  ██║   ██║'));
    console.log(chalk.hex('#FFB300')('╚█████╔╝╚██████╔╝██║     ╚██████╔╝██║     ╚██████╔╝'));
    console.log(chalk.hex('#FF8F00')(' ╚════╝  ╚═════╝ ╚═╝      ╚═════╝ ╚═╝      ╚═════╝'));
    console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.white(`🤖 BOT: ${CONFIG.botNome} ULTRA`));
    console.log(chalk.yellow(`👑 Dono: ${CONFIG.donos}`));
    console.log(chalk.hex('#FFD54F')(`✨ Versão: ${CONFIG.versao}`));
    console.log(chalk.hex('#FFCA28')(`📊 Comandos: 25+`));
    console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
}

// ==================== CHAMAR A ARTE ====================
mostrarArte();

// ================================================================
// 🔥 CONFIGURAR EVENTOS
// ================================================================

function configurarEventos(sock) {
    console.log('📅 Configurando eventos...');

sock.ev.on("group-participants.update", async (update) => {
    const { id, participants, action, author } = update;

    for (const p of participants) {
        const participantId = typeof p === 'string' ? p : (p.id || p);

        // ============================================================
        // 🔥 ENTRADA
        // ============================================================
        if (action === 'add') {
            // 🔥 VERIFICA BLACKLIST PRIMEIRO
            await verificarBlacklistNaEntrada(sock, id, p);

            // 🔥 DEPOIS MANDA BOAS-VINDAS (se não foi banido)
            await enviarBoasVindas(sock, id, p, db, CONFIG);
        }

        // ============================================================
        // 🔥 SAÍDA (ban ou voluntária)
        // ============================================================
        else if (action === 'remove') {
            // 🔥 SE TEM AUTHOR = foi um ADM que removeu (ban)
            if (author) {
                try {
                    await processarBan(sock, id, author, participantId, db, salvarDB, CONFIG);
                } catch (e) {}
            } else {
                // 🔥 SE NÃO TEM AUTHOR = a pessoa saiu sozinha
                await enviarSaida(sock, id, p, db, CONFIG);
            }
        }

        // ============================================================
        // 🔥 PROMOÇÃO DE ADM
        // ============================================================
        else if (action === 'promote') {
            try {
                await processarMudancaAdm(sock, id, author, participantId, 'promote', db, salvarDB, CONFIG);
            } catch (e) {}
        }

        // ============================================================
        // 🔥 REBAIXAMENTO DE ADM
        // ============================================================
        else if (action === 'demote') {
            try {
                await processarMudancaAdm(sock, id, author, participantId, 'demote', db, salvarDB, CONFIG);
            } catch (e) {}
        }
    }
});

    sock.ev.on('messages.upsert', async ({ messages }) => {
        if (!sock) return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const chat = msg.key.remoteJid;
        const sender = msg.key.participant || chat;
        const msgId = msg.key.id;
        
        if (!chat.endsWith('@g.us')) {
            await marcarComoLida(sock, msg);
            return;
        }
        
        await marcarComoLida(sock, msg);
        await contarMensagem(chat, sender, msg, sock);

// 🔥 CONTAR MENSAGEM + XP
try {
    await contarMensagemXp(chat, sender, msg, sock);
} catch (e) {}

      // 🔥 PEGA O TEXTO DE QUALQUER LUGAR (incluindo legendas de mídia)
const texto = (
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption ||
    msg.message.videoMessage?.caption ||
    msg.message.documentMessage?.caption ||
    ''
).trim();

const textoOriginal = texto.toLowerCase();
        
        const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        await verificarAfk(chat, sender, mencionados, sock, msg);

        // 🔥 MITA - RESPOSTA AUTOMÁTICA
if (chat.endsWith('@g.us') && !texto.startsWith(CONFIG.prefix)) {
    try {
        await processarMensagemAutomatica(sock, chat, sender, msg, texto, CONFIG);
    } catch (e) {}
}


        if (db.mutados[chat] && db.mutados[chat].includes(sender)) {
            try { await sock.sendMessage(chat, { delete: msg.key }); } catch(e) {}
            return;
        }
        
if (msg.message?.templateButtonReplyMessage) {
    const buttonId = msg.message.templateButtonReplyMessage.selectedId;
    
    if (buttonId.startsWith('menu_') || buttonId.startsWith('fechar_')) {
        await responderBotaoMenu(sock, chat, sender, msg, buttonId);
    } else if (buttonId.startsWith('pin_')) {
        await responderBotaoPinterest(sock, chat, sender, msg, buttonId, CONFIG, reagir);
    } else if (buttonId.startsWith('pack_')) {
        await responderBotaoPack(sock, chat, sender, msg, buttonId, CONFIG, reagir);
    } else if (buttonId.startsWith('opcao_')) {
        await responderBotao(sock, chat, sender, msg, buttonId, CONFIG);
    }
    return;
}

if (msg.message?.interactiveResponseMessage) {
    const interactiveResponse = msg.message.interactiveResponseMessage;
    const nativeFlowResponse = interactiveResponse.nativeFlowResponseMessage;
    
    if (nativeFlowResponse) {
        try {
            const params = JSON.parse(nativeFlowResponse.paramsJson);
            const buttonId = params.id;
            
            if (buttonId.startsWith('menu_') || buttonId.startsWith('fechar_')) {
                await responderBotaoMenu(sock, chat, sender, msg, buttonId);
            } else if (buttonId.startsWith('pin_')) {
                await responderBotaoPinterest(sock, chat, sender, msg, buttonId, CONFIG, reagir);
            } else if (buttonId.startsWith('pack_')) {   // ← ADICIONA ESSA LINHA
                await responderBotaoPack(sock, chat, sender, msg, buttonId, CONFIG, reagir);
            } else if (buttonId.startsWith('opcao_')) {
                await responderBotao(sock, chat, sender, msg, buttonId, CONFIG);
            }
        } catch (e) {
            console.error('❌ Erro:', e.message);
        }
    }
    return;
}
        
   // 🔥 ANTILINK SUPREMO
await processarAntiLinkSupremo(sock, chat, sender, msg, db, salvarDB, enviarResposta, reagir, verificarAdmin, isDono, podeBanir, CONFIG);
// ===== ANTI-MÍDIA =====
        await processarAntiMidia(sock, chat, sender, msg, db, enviarResposta, verificarAdmin, isDono);

        const isComando = texto.startsWith(CONFIG.prefix);
        if (!isComando && chat.endsWith('@g.us')) {
            try {
                const processado = await processarAntiPalavrao(
                    sock, chat, sender, msg, db, salvarDB, enviarResposta, reagir, verificarAdmin, isDono, podeBanir
                );
                if (processado) return;
            } catch (err) {
                console.error('❌ Erro no anti-palavrão:', err.message);
            }
        }

      // ===== COMANDO PREFIXO =====
      if (textoOriginal === 'prefixo' || textoOriginal === 'prefix') {
        const resposta = `开启 ${CONFIG.botNome} 〛\n╭━━━━━━━━━━━━━⬢\n┃ 🔖 Prefixo: ${CONFIG.prefix}\n┃ 🤖 Bot: ${CONFIG.botNome}\n╰━━━━━━━━━━━━━⬢`;
        await sock.sendMessage(chat, { text: resposta }, { quoted: msg });
        await reagir(sock, chat, msgId, '🔖');
        return;
      }
      
      if (!texto.startsWith(CONFIG.prefix) && textoOriginal !== 'menu' && textoOriginal !== 'menudono') return;
      
      const isMenu = textoOriginal === 'menu';
      const isMenuDono = textoOriginal === 'menudono';
      let comando, args;
      
      if (isMenu) {
        comando = 'menu';
        args = [];
      } else if (isMenuDono) {
        comando = 'menudono';
        args = [];
      } else {
        const parts = texto.slice(CONFIG.prefix.length).trim().split(/ +/);
        comando = parts[0].toLowerCase();
        args = parts.slice(1);
      }
      
      await reagir(sock, chat, msgId, emojiProcessando);
      
      try {
          
    if (comando === 'menu' || comando === 'menus' || comando === 'menuadm' || 
    comando === 'menubrincadeira' || comando === 'menudono') {
    await tratarComandoMenu({
        comando, chat, sock, msg, sender,
        enviarResposta: enviarRespostaMenu,
        verificarAdmin, isDono,
        downloadMediaMessage, P
    });
}
else if (comando === 'setmenuimage') {
    await tratarComandoMenu({
        comando, chat, sock, msg, sender,
        enviarResposta, verificarAdmin, isDono,
        downloadMediaMessage, P
    });
}
else if (comando === 'setmenuview' || comando === 'setmenuvideo') {
    await tratarComandoMenu({
        comando, chat, sock, msg, sender,
        enviarResposta, verificarAdmin, isDono,
        downloadMediaMessage, P
    });
}
else if (comando === 'setmenuaudio' || comando === 'setmenuaudiodono') {
    await tratarComandoMenu({
        comando, chat, sock, msg, sender,
        enviarResposta, verificarAdmin, isDono,
        downloadMediaMessage, P
    });
}
else if (comando === 'resetmenu') {
    await tratarComandoMenu({
        comando, chat, sock, msg, sender,
        enviarResposta, verificarAdmin, isDono,
        downloadMediaMessage, P
    });
}

// ===== PROTEÇÃO DE ADM =====
else if (comando === 'protecaoadm') {
    await cmdProtecaoAdm(chat, sock, sender, msg, args, enviarResposta, reagir, verificarAdmin, isDono, db, salvarDB, CONFIG);
}
else if (comando === 'admallowed') {
    await cmdAdmAllowed(chat, sock, sender, msg, args, enviarResposta, reagir, verificarAdmin, isDono, db, salvarDB, CONFIG);
}
// ===== REVELAR (VIEW-ONCE) =====
else if (comando === 'revelar') {
    await cmdRevelar(chat, sock, sender, msg, args, enviarResposta, reagir, verificarAdmin, isDono, CONFIG);
}
// ===== LISTA NEGRA =====
else if (comando === 'addblacklist' || comando === 'addblack' || comando === 'adicionarlista') {
    await cmdBlacklistAdd(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, CONFIG);
}
else if (comando === 'removeblacklist' || comando === 'removeblack' || comando === 'removerlista') {
    await cmdBlacklistRemove(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, CONFIG);
}
else if (comando === 'blacklist' || comando === 'listanegra' || comando === 'verblacklist') {
    await cmdBlacklistView(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, CONFIG);
}

// ===== ANTI-MÍDIA (ADM) =====
else if (comando === 'anti-audio' || comando === 'anti-audios') {
    await cmdAntiAudio(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, salvarDB);
}
else if (comando === 'anti-image' || comando === 'anti-img' || comando === 'anti-imagem' || comando === 'anti-imagens') {
    await cmdAntiImage(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, salvarDB);
}
else if (comando === 'anti-video' || comando === 'anti-videos') {
    await cmdAntiVideo(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, salvarDB);
}
else if (comando === 'anti-sticker' || comando === 'anti-figu' || comando === 'anti-figurinha' || comando === 'anti-figurinhas') {
    await cmdAntiSticker(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, salvarDB);
}
else if (comando === 'anti-document' || comando === 'anti-doc' || comando === 'anti-documento' || comando === 'anti-documentos') {
    await cmdAntiDocument(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, salvarDB);
}

// ===== ACEITAR SOLICITAÇÕES =====
else if (comando === 'aprovar') {
    await cmdAceitarSolicitacoes(sock, chat, sender, msg, enviarResposta, reagir, verificarAdmin, isDono, CONFIG);
}

// ===== LISTAR SOLICITAÇÕES =====
else if (comando === 'solicitacoes') {
    await cmdListarSolicitacoes(sock, chat, sender, msg, enviarResposta, reagir, verificarAdmin, isDono, CONFIG);
}
// ===== PING =====
else if (comando === 'ping') {
    await cmdPing(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG);
}
// ===== MENSAGENS =====
else if (comando === 'meustatusmsgs') {
    await cmdMinhasMensagens(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG);
}
else if (comando === 'perfilmsgs') {
    await cmdPerfilMensagens(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG);
}
else if (comando === 'rankmsgs') {
    await cmdRankMensagens(chat, sock, msg, args, enviarResposta, reagir, CONFIG);
}
else if (comando === 'resumomsgs') {
    await cmdResumoMensagens(chat, sock, sender, msg, args, enviarResposta, reagir, verificarAdmin, isDono, CONFIG);
}
// ===== EMOJIMIX =====
else if (comando === 'emojimix') {
    await cmdEmojiMix(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG);
}
// ===== PACK DE FIGURINHAS =====
else if (comando === 'pack') {
    await cmdPack(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG);
}
// ===== PDF =====
else if (comando === 'pdf') {
    await cmdPdf(chat, sock, sender, msg, args, enviarResposta, reagir, downloadMediaMessage, P, CONFIG);
}
// ===== CRIADOR =====
else if (comando === 'criador') {
    await cmdCriador(chat, sock, sender, msg, enviarResposta, reagir, CONFIG);
}
  // ===== TTS - TEXTO EM ÁUDIO =====
else if (comando === 'tts') {
    await cmdTts(chat, sock, msg, args, enviarResposta, reagir, CONFIG);
} 
   
      // ===== AFK =====
else if (comando === 'afk') {
    await cmdAfk(chat, sock, sender, msg, args);
}
else if (comando === 'afks' || comando === 'listafk') {
    await cmdAfks(chat, sock, msg);
}

// ===== STICKER → GIF =====
else if (comando === 'sticker2gif' || comando === 's2gif' || comando === 'fig2gif') {
    await cmdStickerToGif(sock, chat, sender, msg, args, enviarResposta, reagir, downloadMediaMessage, P, CONFIG);
}

// ===== YOUTUBE =====
else if (comando === 'yt' || comando === 'youtube') {
    await cmdYt(sock, chat, sender, msg, args, enviarResposta, reagir, CONFIG);
}

// ===== PLAY VIA API (IGUAL PINTEREST) =====
else if (comando === 'play') {
    await cmdPlay(sock, chat, msg, args, enviarResposta, reagir, CONFIG);
}

// ===== LIMPAR CACHE DO PLAY =====
else if (comando === 'limparcache' || comando === 'clearcache' || comando === 'limparyt') {
    await cmdLimparCachePlay(sock, chat, msg, args, enviarResposta, reagir, isDono, CONFIG);
}

// ===== STATUS DO CACHE =====
else if (comando === 'cachestatus' || comando === 'statuscache') {
    await cmdCacheStatusPlay(sock, chat, msg, args, enviarResposta, isDono, CONFIG);
}
    // ===== PERFIL =====
else if (comando === 'perfil' || comando === 'profile') {
    const alvo = await obterMencionado(msg, texto);
    await cmdPerfil(sock, chat, sender, msg, alvo, CONFIG);
}
// ===== SHIP =====
else if (comando === 'ship') {
    await cmdShip(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir);
}
else if (comando === 'shiptop' || comando === 'rankship') {
    await cmdShipTop(sock, chat, msg, db, enviarResposta);
}

else if (comando === 'sticker' || comando === 's') {
    await criarFigurinha(chat, sock, sender, msg);
}

// ===== NOMEAR FIGURINHA (SÓ O NOME QUE A PESSOA DIGITOU) =====
else if (comando === 'nomear' || comando === 'name' || comando === 'sticker-name') {
    const nome = args.join(' ').trim();
    if (!nome) {
        await enviarResposta(chat, sock, 
            `📌 Use: ${CONFIG.prefix}nomear <nome da figurinha>\n` +
            `📌 Exemplo: ${CONFIG.prefix}nomear Minha Figurinha`,
            msg
        );
        return;
    }
    
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted || !quoted.stickerMessage) {
        await enviarResposta(chat, sock, '📌 Responda a uma figurinha com °nomear <nome>', msg);
        return;
    }
    
    await reagir(sock, chat, msg.key.id, '⏳');
    
    try {
        const target = { message: quoted, key: msg.key };
        const buffer = await downloadMediaMessage(target, 'buffer', {}, { logger: P({ level: 'silent' }) });
        
        if (!buffer || buffer.length < 100) {
            throw new Error('Figurinha inválida!');
        }
        
        // 🔥 USA O RENAME (SÓ O NOME, SEM AUTOR)
        const stickerBuffer = await renomearFigurinha(buffer, nome);
        
        await sock.sendMessage(chat, { sticker: stickerBuffer }, { quoted: msg });
        await reagir(sock, chat, msg.key.id, '✅');
        await enviarResposta(chat, sock, `✅ Figurinha renomeada para: "${nome}"`, msg);
        
    } catch (error) {
        console.error('❌ Erro ao renomear:', error);
        await enviarResposta(chat, sock, `❌ ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ===== MYNM (NOME DO WHATSAPP) =====
else if (comando === 'mynm' || comando === 'meunome' || comando === 'my-name') {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted || !quoted.stickerMessage) {
        await enviarResposta(chat, sock, '📌 Responda a uma figurinha com °mynm', msg);
        return;
    }
    
    await reagir(sock, chat, msg.key.id, '⏳');
    
    try {
        const target = { message: quoted, key: msg.key };
        const buffer = await downloadMediaMessage(target, 'buffer', {}, { logger: P({ level: 'silent' }) });
        
        if (!buffer || buffer.length < 100) {
            throw new Error('Figurinha inválida!');
        }
        
        // 🔥 PEGA O NOME DO WHATSAPP
        const nomeUsuario = msg.pushName || sender.split('@')[0];
        
        // 🔥 USA O RENAME (NOME DA PESSOA COMO PACKNAME, SEM AUTOR)
        const stickerBuffer = await renomearFigurinha(buffer, nomeUsuario);
        
        await sock.sendMessage(chat, { sticker: stickerBuffer }, { quoted: msg });
        await reagir(sock, chat, msg.key.id, '✅');
        await enviarResposta(chat, sock, `✅ Figurinha com nome de: ${nomeUsuario}`, msg);
        
    } catch (error) {
        console.error('❌ Erro:', error);
        await enviarResposta(chat, sock, `❌ ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ===== COMANDOS =====
else if (comando === 'rank-feio' || comando === 'rankfeio') {
    await cmdRankFeio(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, CONFIG);
}
else if (comando === 'rank-bonito' || comando === 'rankbonito') {
    await cmdRankBonito(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, CONFIG);
}
else if (comando === 'rank-corno' || comando === 'rankcorno') {
    await cmdRankCorno(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, CONFIG);
}
else if (comando === 'rank-gay' || comando === 'rankgay') {
    await cmdRankGay(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, CONFIG);
}
else if (comando === 'rank-fofo' || comando === 'rankfofo') {
    await cmdRankFofo(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, CONFIG);
}
else if (comando === 'rank-doido' || comando === 'rankdoido') {
    await cmdRankDoido(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, CONFIG);
}
else if (comando === 'setrankimage' || comando === 'set-rank-image') {
    await cmdSetRankImage(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, downloadMediaMessage, P, verificarAdmin, isDono);
}
else if (comando === 'baixarrankimages' || comando === 'baixar-rank-images') {
    await cmdBaixarRankImages(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, isDono, CONFIG);
}
// ===== COMANDOS DE GRUPO =====

// 📸 Editar foto do grupo (respondendo imagem)
else if (comando === 'setfoto' || comando === 'setphoto' || comando === 'fotogrupo') {
    await cmdSetGroupPhoto(chat, sock, sender, msg, enviarResposta, reagir, downloadMediaMessage, P, CONFIG, verificarAdmin, isDono);
}

// 📝 Editar descrição do grupo
else if (comando === 'setdesc' || comando === 'setdescricao' || comando === 'setdescription') {
    await cmdSetGroupDesc(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG, verificarAdmin, isDono);
}

// 📋 Ver informações completas do grupo
else if (comando === 'grupoinfo' || comando === 'info' || comando === 'groupinfo' || comando === 'about') {
    await cmdGroupInfo(chat, sock, msg, db, enviarResposta, reagir, CONFIG);
}

// 📝 Ver apenas a descrição
else if (comando === 'descricao' || comando === 'desc' || comando === 'description') {
    await cmdGroupDesc(chat, sock, msg, enviarResposta, CONFIG);
}

// 👑 Ver apenas os administradores
else if (comando === 'admins' || comando === 'administradores' || comando === 'listadm') {
    await cmdGroupAdmins(chat, sock, msg, enviarResposta, CONFIG);
}

// 👥 Ver total de membros
else if (comando === 'membros' || comando === 'members' || comando === 'totalmembros') {
    await cmdGroupMembers(chat, sock, msg, enviarResposta, CONFIG);
}

// 🆔 Ver ID do grupo
else if (comando === 'groupid' || comando === 'idgrupo' || comando === 'id') {
    await cmdGroupId(chat, sock, msg, enviarResposta, CONFIG);
}

// 📅 Ver data de criação
else if (comando === 'cri' || comando === 'created' || comando === 'datacriacao') {
    await cmdGroupCreated(chat, sock, msg, enviarResposta, CONFIG);
}
// ===== CASAMENTO =====
else if (comando === 'pedir' || comando === 'propor') {
    await cmdPedir(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir);
}
else if (comando === 'aceitar' || comando === 'aceito') {
    await cmdAceitar(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir);
}
else if (comando === 'recusar' || comando === 'rejeitar') {
    await cmdRecusar(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir);
}
else if (comando === 'pedidos' || comando === 'propostas') {
    await cmdPedidos(sock, chat, sender, msg, db, enviarResposta);
}
else if (comando === 'casados' || comando === 'casais') {
    await cmdCasados(sock, chat, msg, db, enviarResposta);
}
else if (comando === 'divorciar' || comando === 'divorcio') {
    await cmdDivorciar(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir);
}
else if (comando === 'amor' || comando === 'love') {
    await cmdAmor(sock, chat, sender, msg, args, db, enviarResposta);
}
else if (comando === 'presentear' || comando === 'presente') {
    await cmdPresentear(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir);
}

        // ===== RANK =====
        else if (comando === 'rankativo' || comando === 'rank') {
          await mostrarRankAtivo(chat, sock, msg);
        }
        else if (comando === 'meustatus' || comando === 'mystatus') {
          await meuStatus(chat, sock, sender, msg);
        }
        else if (comando === 'resetrankativo') {
          await resetarRankAtivo(chat, sender, sock, msg);
        }

        // ===== REGRAS =====
        else if (comando === 'setregras') {
          await setRegras(chat, sock, sender, args, msg);
        }
        else if (comando === 'regras') {
          await verRegras(chat, sock, msg);
        }
        
// ===== DONOS =====
else if (comando === 'adddono' || comando === 'addowner') {
    const alvo = await obterMencionado(msg, texto);
    await adicionarDono(chat, sock, sender, alvo, msg);
}
else if (comando === 'removerdono' || comando === 'removeowner') {
    const alvo = await obterMencionado(msg, texto);
    await removerDono(chat, sock, sender, alvo, msg);
}
else if (comando === 'listadonos' || comando === 'donos') {
    await listarDonos(chat, sock, msg);
}
else if (comando === 'limpardono' || comando === 'limpardonos') {
    await limparDonos(chat, sock, sender, msg);
}

        // ===== ADMIN =====
        else if (comando === 'antipalavrao' || comando === 'ap') {
          await cmdAntiPalavrao(chat, sock, msg, args, sender, db, salvarDB, enviarResposta, verificarAdmin, isDono);
        }
        else if (comando === 'ban' || comando === 'kick' || comando === 'b' || comando === 'vaza') {
          const alvo = await obterMencionado(msg, texto);
          if (!alvo) {
            await enviarResposta(chat, sock, `⚠️ Marque alguém: ${CONFIG.prefix}ban @user`, msg);
            await reagir(sock, chat, msgId, emojiErro);
            return;
          }
          const verificacao = await podeBanir(sock, chat, sender, alvo);
          if (!verificacao.pode) {
            await enviarResposta(chat, sock, verificacao.motivo, msg);
            await reagir(sock, chat, msgId, emojiErro);
            return;
          }
          await sock.groupParticipantsUpdate(chat, [alvo], 'remove');
          await enviarResposta(chat, sock, `🔨 @${alvo.split('@')[0]} foi removido!`, msg, [alvo]);
          await reagir(sock, chat, msgId, emojiSucesso);
        }
        else if (comando === 'promover') {
          const alvo = await obterMencionado(msg, texto);
          if (!await podeComandoAdmin(sock, chat, sender)) {
            await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
            await reagir(sock, chat, msgId, emojiErro);
            return;
          }
          if (!alvo) {
            await enviarResposta(chat, sock, `⚠️ Marque alguém: ${CONFIG.prefix}promover @user`, msg);
            await reagir(sock, chat, msgId, emojiErro);
            return;
          }
          if (alvo === sock.user.id) {
            await enviarResposta(chat, sock, '❌ Não posso me promover!', msg);
            await reagir(sock, chat, msgId, emojiErro);
            return;
          }
          await sock.groupParticipantsUpdate(chat, [alvo], 'promote');
          await enviarResposta(chat, sock, `📈 @${alvo.split('@')[0]} promovido!`, msg, [alvo]);
          await reagir(sock, chat, msgId, emojiSucesso);
        }
        else if (comando === 'rebaixar') {
          const alvo = await obterMencionado(msg, texto);
          if (!await podeComandoAdmin(sock, chat, sender)) {
            await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
            await reagir(sock, chat, msgId, emojiErro);
            return;
          }
          if (!alvo) {
            await enviarResposta(chat, sock, `⚠️ Marque alguém: ${CONFIG.prefix}rebaixar @user`, msg);
            await reagir(sock, chat, msgId, emojiErro);
            return;
          }
          if (alvo === sock.user.id) {
            await enviarResposta(chat, sock, '❌ Não posso me rebaixar!', msg);
            await reagir(sock, chat, msgId, emojiErro);
            return;
          }
          await sock.groupParticipantsUpdate(chat, [alvo], 'demote');
          await enviarResposta(chat, sock, `📉 @${alvo.split('@')[0]} rebaixado!`, msg, [alvo]);
          await reagir(sock, chat, msgId, emojiSucesso);
        }
        else if (comando === 'fechar') {
          if (!await podeComandoAdmin(sock, chat, sender)) {
            await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
            await reagir(sock, chat, msgId, emojiErro);
            return;
          }
          await sock.groupSettingUpdate(chat, 'announcement');
          await enviarResposta(chat, sock, '🔒 Grupo fechado!', msg);
          await reagir(sock, chat, msgId, emojiSucesso);
        }
        else if (comando === 'abrir') {
          if (!await podeComandoAdmin(sock, chat, sender)) {
            await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
            await reagir(sock, chat, msgId, emojiErro);
            return;
          }
          await sock.groupSettingUpdate(chat, 'not_announcement');
          await enviarResposta(chat, sock, '🔓 Grupo aberto!', msg);
          await reagir(sock, chat, msgId, emojiSucesso);
        }
        else if (comando === 'mute') {
          const alvo = await obterMencionado(msg, texto);
          if (!await podeComandoAdmin(sock, chat, sender)) {
            await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
            await reagir(sock, chat, msgId, emojiErro);
            return;
          }
          if (!alvo) {
            await enviarResposta(chat, sock, `⚠️ Marque alguém: ${CONFIG.prefix}mute @user`, msg);
            await reagir(sock, chat, msgId, emojiErro);
            return;
          }
          await mutar(sock, chat, alvo, msg);
          await reagir(sock, chat, msgId, emojiSucesso);
        }
        else if (comando === 'desmute') {
          const alvo = await obterMencionado(msg, texto);
          if (!await podeComandoAdmin(sock, chat, sender)) {
            await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
            await reagir(sock, chat, msgId, emojiErro);
            return;
          }
          if (!alvo) {
            await enviarResposta(chat, sock, `⚠️ Marque alguém: ${CONFIG.prefix}desmute @user`, msg);
            await reagir(sock, chat, msgId, emojiErro);
            return;
          }
          await desmutar(sock, chat, alvo, msg);
          await reagir(sock, chat, msgId, emojiSucesso);
        }
        else if (comando === 'del' || comando === 'apagar') {
          if (!await podeComandoAdmin(sock, chat, sender)) {
            await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
            await reagir(sock, chat, msgId, emojiErro);
            return;
          }
          await deletarMensagem(sock, chat, msg);
          await reagir(sock, chat, msgId, emojiSucesso);
        }
        
        // ===== PINTEREST =====
        else if (comando === 'pinterest' || comando === 'pin' || comando === 'pins') {
          await cmdPinterest(sock, chat, msg, args, enviarResposta, reagir, CONFIG);
        }

        // ===== ALLGLB - ENVIAR PARA TODOS OS GRUPOS =====
        else if (comando === 'allglb') {
          await cmdAllGlb(chat, sock, sender, msg, args, enviarResposta, reagir, isDono, CONFIG);
        }
        // ===== AGENDAMENTO =====
        else if (comando === 'agendarfechar' || comando === 'agf') {
          if (!await podeComandoAdmin(sock, chat, sender)) {
            await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
            return;
          }
          const hora = parseInt(args[0]);
          const minuto = parseInt(args[1]);
          if (isNaN(hora) || isNaN(minuto) || hora < 0 || hora > 23 || minuto < 0 || minuto > 59) {
            await enviarResposta(chat, sock, `📌 Use: ${CONFIG.prefix}agendarfechar <hora> <minuto>\n📌 Exemplo: ${CONFIG.prefix}agendarfechar 18 00`, msg);
            return;
          }
          await agendarFechamento(chat, sock, hora, minuto, msg);
        }
        else if (comando === 'agendarabrir' || comando === 'aga') {
          if (!await podeComandoAdmin(sock, chat, sender)) {
            await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
            return;
          }
          const hora = parseInt(args[0]);
          const minuto = parseInt(args[1]);
          if (isNaN(hora) || isNaN(minuto) || hora < 0 || hora > 23 || minuto < 0 || minuto > 59) {
            await enviarResposta(chat, sock, `📌 Use: ${CONFIG.prefix}agendarabrir <hora> <minuto>\n📌 Exemplo: ${CONFIG.prefix}agendarabrir 07 00`, msg);
            return;
          }
          await agendarAbertura(chat, sock, hora, minuto, msg);
        }
        else if (comando === 'veragenda' || comando === 'vagenda') {
          if (!await podeComandoAdmin(sock, chat, sender)) {
            await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
            return;
          }
          await verAgendamentos(chat, sock, msg);
        }
        else if (comando === 'deletaragenda' || comando === 'delagenda') {
          if (!await podeComandoAdmin(sock, chat, sender)) {
            await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
            return;
          }
          await deletarAgendamento(chat, sock, args, msg);
        }
        
// ===== STICKER PARA IMAGEM/GIF =====
else if (comando === 'sticker2img' || comando === 's2img' || comando === 'fig2img' || comando === 'sticker2foto') {
    await cmdStickerToMedia(sock, chat, sender, msg, args, enviarResposta, reagir, downloadMediaMessage, P, CONFIG);
}

// ===== INTERAÇÕES =====
else if (comando === 'tapa') {
    await cmdTapa(chat, sock, sender, msg, args, enviarResposta, isDono, CONFIG);
}
else if (comando === 'matar') {
    await cmdMatar(chat, sock, sender, msg, args, enviarResposta, isDono, CONFIG);
}
else if (comando === 'beijar') {
    await cmdBeijar(chat, sock, sender, msg, args, enviarResposta, isDono, CONFIG);
}
else if (comando === 'abracar' || comando === 'abraçar') {
    await cmdAbracar(chat, sock, sender, msg, args, enviarResposta, isDono, CONFIG);
}
else if (comando === 'socar') {
    await cmdSocar(chat, sock, sender, msg, args, enviarResposta, isDono, CONFIG);
}
else if (comando === 'interacoes' || comando === 'listinter') {
    await cmdListarInteracoes(chat, sock, msg, enviarResposta, CONFIG);
}

// ===== WAIFU =====
else if (comando === 'waifu') {
    await cmdWaifu(sock, chat, msg, enviarResposta, reagir, CONFIG);
}

// ===== NEKO =====
else if (comando === 'neko') {
    await cmdNeko(sock, chat, msg, enviarResposta, reagir, CONFIG);
}
        
// ===== BOTINFO - INFORMAÇÕES COMPLETAS DO BOT =====
else if (comando === 'bot') {
    await cmdBotInfo(sock, chat, msg, CONFIG, db);
}

       // ===== PORCENTAGENS =====
else if (comando === 'gay') {
    await cmdGay(sock, chat, sender, msg, args, CONFIG);
}
else if (comando === 'corno') {
    await cmdCorno(sock, chat, sender, msg, args, CONFIG);
}
else if (comando === 'passivo') {
    await cmdPassivo(sock, chat, sender, msg, args, CONFIG);
}
else if (comando === 'lindo') {
    await cmdLindo(sock, chat, sender, msg, args, CONFIG);
}
else if (comando === 'linda') {
    await cmdLinda(sock, chat, sender, msg, args, CONFIG);
}
else if (comando === 'feio') {
    await cmdFeio(sock, chat, sender, msg, args, CONFIG);
}
else if (comando === 'feia') {
    await cmdFeia(sock, chat, sender, msg, args, CONFIG);
}
else if (comando === 'lesbica' || comando === 'lésbica') {
    await cmdLesbica(sock, chat, sender, msg, args, CONFIG);
}
else if (comando === 'inteligente') {
    await cmdInteligente(sock, chat, sender, msg, args, CONFIG);
}
else if (comando === 'burro') {
    await cmdBurro(sock, chat, sender, msg, args, CONFIG);
}
else if (comando === 'burra') {
    await cmdBurra(sock, chat, sender, msg, args, CONFIG);
}
      
      // ===== IA - GERAR IMAGEM =====
else if (comando === 'gerar') {
    await cmdGerarImagem(chat, sock, msg, args, sender, enviarResposta, reagir, CONFIG);
}

// ===== TOGGLE RPG =====
else if (comando === 'rpgcd') {
    await cmdToggleRPG(sock, chat, sender, msg, args, enviarResposta, reagir, verificarAdmin, isDono, db, salvarDB, CONFIG);
}

// ===== VERIFICA SE RPG ESTÁ ATIVO =====
else if (['trabalhar', 'work', 'diaria', 'daily', 'vagas', 'empregos', 'vaga', 'emprego', 'contratar', 'demitir', 'carteira', 'ctps', 'ranktrabalho', 'rankwork', 'minerar', 'miner', 'comprarpicareta', 'cpicareta', 'comprarescudo', 'cescudo', 'quiz', 'colherpolen', 'cp', 'favo', 'rankgold', 'rgold', 'jogodavelha', 'jogovelha', 'tictactoe', 'jogarvelha', 'movevelha', 'move', 'cassino', 'apostar', 'bet', 'depositar', 'deposit', 'sacar', 'withdraw', 'transferir', 'transfer', 'pix'].includes(comando)) {
    
    // 🔥 SÓ VERIFICA SE O RPG ESTIVER DESATIVADO
    if (!isRPGAtivo(chat)) {
        const isAdmin = await verificarAdmin(sock, chat, sender);
        const isDonoBot = await isDono(sender);
        
        if (!isAdmin && !isDonoBot) {
            await enviarResposta(chat, sock, `🔒 **RPG DESATIVADO!**\n\n📌 Um administrador desativou o RPG.`, msg);
            await reagir(sock, chat, msg.key.id, '🔒');
            return;
        }
    }
    
    // 🔥 PEGA O NOME CORRETO
    const nomeExibicao = await getNomeUsuario(sock, chat, sender);
    
    // 🔥 COMANDOS DE EMPREGO
    if (comando === 'trabalhar' || comando === 'work') {
        await trabalhar(sender, sock, chat, msg, nomeExibicao);
    }
    else if (comando === 'diaria' || comando === 'daily') {
        await diaria(sender, sock, chat, msg, nomeExibicao);
    }
    else if (comando === 'vagas' || comando === 'empregos' || comando === 'vaga' || comando === 'emprego') {
        await vagasEmprego(sender, sock, chat, msg, args, nomeExibicao);
    }
    else if (comando === 'contratar') {
        await contratar(sender, sock, chat, msg, args);
    }
    else if (comando === 'demitir') {
        await demitir(sender, sock, chat, msg);
    }
    else if (comando === 'carteira' || comando === 'ctps') {
        await carteira(sender, sock, chat, msg, nomeExibicao);
    }
    else if (comando === 'ranktrabalho' || comando === 'rankwork') {
        await rankTrabalho(sock, chat, msg);
    }
    // 🔥 MINERAÇÃO
    else if (comando === 'minerar' || comando === 'miner') {
        await cmdMinerar(sender, sock, chat, msg, nomeExibicao);
    }
    else if (comando === 'comprarpicareta' || comando === 'cpicareta') {
        await cmdComprarPicareta(sender, sock, chat, msg, nomeExibicao);
    }
    else if (comando === 'comprarescudo' || comando === 'cescudo') {
        await cmdComprarEscudo(sender, sock, chat, msg, nomeExibicao);
    }
    // 🔥 QUIZ
    else if (comando === 'quiz') {
        await cmdQuiz(sender, sock, chat, msg, args, nomeExibicao);
    }
    // 🔥 FAVO
    else if (comando === 'colherpolen' || comando === 'cp' || comando === 'favo') {
        await cmdColherPolen(sender, sock, chat, msg, nomeExibicao);
    }
    // 🔥 RANK GOLD
    else if (comando === 'rankgold' || comando === 'rgold') {
        await cmdRankGold(sock, chat, msg);
    }
    // 🔥 JOGOS
    else if (comando === 'jogodavelha' || comando === 'jogovelha' || comando === 'tictactoe') {
        await cmdJogoDaVelha(sock, chat, sender, msg, args);
    }
    else if (comando === 'jogarvelha' || comando === 'movevelha' || comando === 'move') {
        await cmdJogarVelha(sock, chat, sender, msg, args);
    }
    else if (comando === 'cassino' || comando === 'apostar' || comando === 'bet') {
        await cmdCassino(sock, chat, sender, msg, args, nomeExibicao);
    }
    // 🔥 FINANCEIRO
    else if (comando === 'depositar' || comando === 'deposit') {
        await cmdDepositar(sock, chat, sender, msg, args, nomeExibicao);
    }
    else if (comando === 'sacar' || comando === 'withdraw') {
        await cmdSacar(sock, chat, sender, msg, args, nomeExibicao);
    }
    else if (comando === 'transferir' || comando === 'transfer' || comando === 'pix') {
        await cmdTransferir(sock, chat, sender, msg, args, nomeExibicao);
    }
}
        // ===== ÁUDIO =====
        else if (comando === 'audio' || comando === 'efeito') {
          await cmdAudio(chat, sock, msg, args, sender);
        }
        else if (comando === 'videoaudio' || comando === 'va') {
          await cmdVideoAudio(chat, sock, msg, sender);
        }
        else if (comando === 'efeitos' || comando === 'listaudio') {
          await cmdEfeitos(chat, sock, msg);
        }
        
 // ===== MARCAR TODOS =====
else if (comando === 'marcatodos' || comando === 'mt' || comando === 'todos') {
    await cmdMarcaTodos(chat, sock, sender, msg);
}
else if (comando === 'marcaradm' || comando === 'ma') {
    await cmdMarcarAdm(chat, sock, sender, msg);
}
else if (comando === 'citar' || comando === 'cita' || comando === 'citacao') {
    await cmdCitar(chat, sock, msg, args, sender);
}
else if (comando === 'admins' || comando === 'listadm') {
    const metadata = await sock.groupMetadata(chat);
    const admins = metadata.participants.filter(
        p => p.admin === 'admin' || p.admin === 'superadmin'
    );

    if (admins.length === 0) {
        await enviarResposta(chat, sock, '📊 Nenhum administrador encontrado!', msg);
        return;
    }

    let texto = `开启 ${CONFIG.botNome} - 👑 ADMINS 〛\n╭━━━━━━━━━━━━━━━━━━━━━⬢\n┃ 📋 ${admins.length} administradores\n╰━━━━━━━━━━━━━━━━━━━━━⬢\n\n`;

    for (const admin of admins) {
        const nome = admin.id.split('@')[0];
        texto += `@${nome}\n`;
    }

    texto += `\n╰━━━━━━━━━━━━━━━━━━━━━⬢\n『 ${CONFIG.botNome} 』`;

    const mentions = admins.map(p => p.id);

    await sock.sendMessage(
        chat,
        { text: texto, mentions },
        { quoted: msg }
    );
}

// ===== WELCOME ENTRADA =====
else if (comando === 'welcome') {
    await cmdWelcome(
        chat, sock, sender, args, msg,
        enviarResposta, verificarAdmin, isDono,
        db, salvarDB, CONFIG
    );
}
else if (comando === 'setwelcome') {
    await cmdSetWelcome(
        chat, sock, sender, args, msg,
        enviarResposta, verificarAdmin, isDono,
        db, salvarDB, CONFIG
    );
}
else if (comando === 'resetwelcome') {
    await cmdResetWelcome(
        chat, sock, sender, msg,
        enviarResposta, verificarAdmin, isDono,
        db, salvarDB, CONFIG
    );
}

// ===== WELCOME SAÍDA =====
else if (comando === 'wsaida' || comando === 'welcomesaida') {
    await cmdWelcomeSaida(
        chat, sock, sender, args, msg,
        enviarResposta, verificarAdmin, isDono,
        db, salvarDB, CONFIG
    );
}
else if (comando === 'setwsaida' || comando === 'setsaida') {
    await cmdSetWelcomeSaida(
        chat, sock, sender, args, msg,
        enviarResposta, verificarAdmin, isDono,
        db, salvarDB, CONFIG
    );
}
else if (comando === 'resetwsaida' || comando === 'resetsaida') {
    await cmdResetWelcomeSaida(
        chat, sock, sender, msg,
        enviarResposta, verificarAdmin, isDono,
        db, salvarDB, CONFIG
    );
}

        else if (comando === 'antilink') {
          const pode = await podeComandoAdmin(sock, chat, sender);
          if (!pode) { await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg); await reagir(sock, chat, msgId, emojiErro); return; }
          const acao = args[0]?.toLowerCase();
          if (acao === 'on') { db.antilink[chat] = true; salvarDB(); await enviarResposta(chat, sock, '🔗 Anti-Link ATIVADO!', msg); }
          else if (acao === 'off') { db.antilink[chat] = false; salvarDB(); await enviarResposta(chat, sock, '🔗 Anti-Link DESATIVADO!', msg); }
          else { await enviarResposta(chat, sock, `📌 Use: ${CONFIG.prefix}antilink on/off`, msg); }
          await reagir(sock, chat, msgId, emojiSucesso);
        }
          else {
          await enviarResposta(chat, sock, `╭━━━〔 ❌ 〕━━⬢
┃ Comando inválido.
┃
┃ 📖 ${CONFIG.prefix}menu
┃ 💬 wa.me/${CONFIG.donos[0]}
╰━━━━━━━━━━⬢`, msg);
          await reagir(sock, chat, msgId, emojiErro);
        }
        
        await reagir(sock, chat, msgId, emojiSucesso);
      } catch (err) {
        console.error(err);
        await enviarResposta(chat, sock, '❌ Erro ao executar comando!', msg);
        await reagir(sock, chat, msgId, emojiErro);
      }
    }); // 🔥 FECHA O messages.upsert

    console.log('✅ Eventos configurados!');
}

// ================================================================
// 🔥 QUANDO O BOT CONECTAR
// ================================================================

setOnBotOnline(async (sock) => {
    console.log('🔥 CALLBACK EXECUTOU!');
    initRankings(db);
    initBlacklist(db);
    console.log('📅 Carregando agendamentos...');
    carregarAgendamentosInicial(sock);
    configurarEventos(sock);
    iniciarSchedulerMensagens(sock);
    iniciarAvisosDoPainel(sock, 30000);
    console.log('✅ Bot pronto para usar!\n');
});

// ================================================================
// 🔥 INICIAR O BOT
// ================================================================

startBot().catch(console.error);
