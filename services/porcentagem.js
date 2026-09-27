// ==================== COMANDOS DE PORCENTAGEM ====================
// services/porcentagem.js
//
// Todos os comandos com suporte a vídeo (GIF)
// Menção correta usando @ do usuário
// ============================================================

const fs = require('fs');
const path = require('path');

// ==================== VÍDEOS POR TIPO ====================
// 🔥 Coloque os links dos vídeos aqui (já baixados para mais velocidade)

const VIDEOS_PORCENTAGEM = {
    'gay': [
        'https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1783779888647-mixclr.mp4'
    ],
    'corno': [
        'https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1783812361096-2ldfc6.mp4'
    ],
    'passivo': [
        'https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/video_passivo2.mp4'
    ],
    'lindo': [
        'https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1783812385043-6efelc.mp4'
    ],
    'linda': [
        'https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1783812451661-vf7cxx.mp4'
    ],
    'feio': [
        'https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/video_feio1.mp4'
    ],
    'feia': [
        'https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/video_feia1.mp4'
    ],
    'lesbica': [
        'https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1783812468138-ldu95r.mp4'
    ],
    'inteligente': [
        'https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/video_inteligente1.mp4'
    ],
    'burro': [
        'https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1783812508143-tpvyb4.mp4'
    ],
    'burra': [
        'https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1783812508143-tpvyb4.mp4'
    ]
};

// ==================== CONFIGURAÇÕES DE CADA TIPO ====================
const CONFIGS = {
    'gay': {
        emoji: '🏳️‍🌈',
        titulo: 'Gay',
        alto: '🌈 ORGULHO LGBTQIA+',
        medio: '💖 Arco-Íris Fraco',
        baixo: '💔 Hetero Top',
        comentarios: [
            '🏳️‍🌈 Arrasou migo!',
            '🌈 Orgulho do grupo!',
            '💖 Tá quase lá!',
            '💔 Ainda não descobriu...',
            '🏳️‍🌈 Rei/ Rainha do Orgulho!'
        ]
    },
    'corno': {
        emoji: '🦌',
        titulo: 'Corno',
        alto: '🦌🚨 REI DO CHIFRE',
        medio: '🤔 Corno Moderado',
        baixo: '😎 Seguro Demais',
        comentarios: [
            '🦌 Cuidado com a galhada!',
            '🚨 Alerta de chifre!',
            '🤔 Já desconfio...',
            '😎 De boas, sem chifre',
            '🦌 O Corno Mestre!'
        ]
    },
    'passivo': {
        emoji: '😒',
        titulo: 'Passivo',
        alto: '👑 REI DO VÁCUO',
        medio: '📈 Passivo Moderado',
        baixo: '😇 Ativo Demais',
        comentarios: [
            '🙄 Tá ocupado ou só ignorando?',
            '😏 "Vou responder depois" - famoso',
            '👀 Vi sua mensagem hein...',
            '😴 Acorda pra vida!',
            '👻 É vivo ou é fantasma?'
        ]
    },
    'lindo': {
        emoji: '✨',
        titulo: 'Lindo',
        alto: '👑 PERFEIÇÃO',
        medio: '😊 Bonito',
        baixo: '😐 Normal',
        comentarios: [
            '✨ Maravilhoso(a)!',
            '👑 Beleza rara!',
            '😊 Muito bonito(a)!',
            '😐 Podia ser pior...',
            '⭐ Deusa/Deus da beleza!'
        ]
    },
    'linda': {
        emoji: '✨',
        titulo: 'Linda',
        alto: '👑 PERFEIÇÃO',
        medio: '😊 Bonita',
        baixo: '😐 Normal',
        comentarios: [
            '✨ Maravilhosa!',
            '👑 Beleza rara!',
            '😊 Muito bonita!',
            '😐 Podia ser pior...',
            '⭐ Deusa da beleza!'
        ]
    },
    'feio': {
        emoji: '👹',
        titulo: 'Feio',
        alto: '💀 MORFEIO',
        medio: '😅 Feinho',
        baixo: '😇 Bonito por dentro',
        comentarios: [
            '👹 Mas tem coração!',
            '💀 Tadinho(a)...',
            '😅 Feinho mas é gente boa',
            '😇 Beleza interior conta',
            '👹 O Feio Mestre!'
        ]
    },
    'feia': {
        emoji: '👹',
        titulo: 'Feia',
        alto: '💀 MORFEIA',
        medio: '😅 Feinha',
        baixo: '😇 Bonita por dentro',
        comentarios: [
            '👹 Mas tem coração!',
            '💀 Tadinha...',
            '😅 Feinha mas é gente boa',
            '😇 Beleza interior conta',
            '👹 A Feia Mestra!'
        ]
    },
    'lesbica': {
        emoji: '👩‍❤️‍👩',
        titulo: 'Lésbica',
        alto: '🌈 ORGULHO LÉSBICO',
        medio: '💖 Sapatão Fraco',
        baixo: '💔 Hetero Top',
        comentarios: [
            '👩‍❤️‍👩 Orgulho lésbico!',
            '🌈 Arrasou miga!',
            '💖 Tá quase lá!',
            '💔 Ainda não descobriu...',
            '👩‍❤️‍👩 Rainha do Orgulho!'
        ]
    },
    'inteligente': {
        emoji: '🧠',
        titulo: 'Inteligente',
        alto: '🧠📚 GÊNIO',
        medio: '🤓 Esperto',
        baixo: '😶 Burrinho',
        comentarios: [
            '🧠 Cérebro de Einstein!',
            '📚 Muito inteligente!',
            '🤓 Sabichão!',
            '😶 Tá aprendendo ainda...',
            '🧠 O Gênio do Grupo!'
        ]
    },
    'burro': {
        emoji: '🐴',
        titulo: 'Burro',
        alto: '🐴💀 MUITO BURRO',
        medio: '😅 Burrinho',
        baixo: '🧠 Esperto',
        comentarios: [
            '🐴 Tadinho...',
            '💀 Burrice nível máximo!',
            '😅 Burrinho mas é gente boa',
            '🧠 Na verdade é esperto',
            '🐴 O Burro Mestre!'
        ]
    },
    'burra': {
        emoji: '🐴',
        titulo: 'Burra',
        alto: '🐴💀 MUITO BURRA',
        medio: '😅 Burrinha',
        baixo: '🧠 Esperta',
        comentarios: [
            '🐴 Tadinha...',
            '💀 Burrice nível máximo!',
            '😅 Burrinha mas é gente boa',
            '🧠 Na verdade é esperta',
            '🐴 A Burra Mestra!'
        ]
    }
};

// ==================== FOTOS PADRÃO ====================
const FOTOS_PADRAO = [
    "https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1783600763527-x2fy02.jpg",
    "https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1783600799374-qcm0be.jpg",
    "https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1783600816412-ybqzns.jpg",
    "https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1783600838200-q7fdzb.jpg",
    "https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1783600851281-m3yhaw.jpg"
];

// ==================== FUNÇÕES AUXILIARES ====================
function getFotoAleatoria() {
    return FOTOS_PADRAO[Math.floor(Math.random() * FOTOS_PADRAO.length)];
}

function gerarBarra(valor, total = 100, tamanho = 15) {
    const percentual = Math.min(Math.floor((valor / total) * tamanho), tamanho);
    let barra = '';
    for (let i = 0; i < tamanho; i++) {
        barra += i < percentual ? '▰' : '▱';
    }
    return barra;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getVideoAleatorio(tipo) {
    const videos = VIDEOS_PORCENTAGEM[tipo] || [];
    if (videos.length === 0) return null;
    return videos[Math.floor(Math.random() * videos.length)];
}

// 🔥 FUNÇÃO SIMPLES PARA PEGAR O @ DO USUÁRIO
function getNomeUsuario(target) {
    if (!target) return 'unknown';
    return target.split('@')[0];
}

// ==================== COMANDO PRINCIPAL ====================
async function cmdPorcentagem(sock, chat, sender, msg, args, tipo, CONFIG) {
    // 🔥 PEGA O USUÁRIO MENCIONADO
    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentionedJid[0] || sender;
    
    const nome = getNomeUsuario(target);
    
    // 🔥 PEGA A FOTO DE PERFIL
    let foto = null;
    try {
        foto = await sock.profilePictureUrl(target, 'image');
    } catch (err) {
        foto = getFotoAleatoria();
    }
    
    // 🔥 SORTEIA O VALOR
    const valor = getRandomInt(0, 100);
    const barra = gerarBarra(valor);
    
    // 🔥 PEGA O VÍDEO
    const videoUrl = getVideoAleatorio(tipo);
    
    // 🔥 PEGA A CONFIGURAÇÃO
    const config = CONFIGS[tipo];
    if (!config) {
        await sock.sendMessage(chat, { text: `❌ Tipo "${tipo}" não encontrado!` }, { quoted: msg });
        return;
    }
    
    // 🔥 DEFINE O STATUS
    let statusTexto = '';
    if (valor >= 80) statusTexto = config.alto;
    else if (valor >= 50) statusTexto = config.medio;
    else statusTexto = config.baixo;
    
    const comentarioAleatorio = getRandomItem(config.comentarios);
    
    // ============================================================
    // 📊 CONSTRÓI A MENSAGEM
    // ============================================================
    const texto = `〘 ${CONFIG.botNome} 〙
╭━━━━━━━━━━━━━━━━━━━━━⬢
┃〔 ◈ USUARIO: 『 @${nome} 』
┃〔 ◈ ${config.emoji} ${config.titulo}: 『 ${valor}% 』
┃〔 ◈ STATUS: 『 ${statusTexto} 』
┃〔 ◈ COMENTÁRIO: 『 ${comentarioAleatorio} 』
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ ${barra}

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ${config.emoji} ${valor}% de ${config.titulo}
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』
▰▰▰▰▰▰▰▰▰▰ 100%
╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 𝙲𝚛𝚒𝚊𝚍𝚘𝚛: ${CONFIG.donos ? CONFIG.donos[0] : 'N/A'}
┃ 𝙱𝚘𝚝: ${CONFIG.botNome}
╰━━━━━━━━━━━━━━━━━━━━━⬢`;

    const mentions = [target];
    
    // ============================================================
    // 📤 ENVIA A MÍDIA
    // ============================================================
    try {
        if (videoUrl && videoUrl.startsWith('http')) {
            // 🔥 ENVIA COMO VÍDEO/GIF
            await sock.sendMessage(chat, {
                video: { url: videoUrl },
                gifPlayback: true,
                caption: texto,
                mentions
            }, { quoted: msg });
        } else if (foto) {
            // 🔥 ENVIA COMO FOTO
            await sock.sendMessage(chat, {
                image: { url: foto },
                caption: texto,
                mentions
            }, { quoted: msg });
        } else {
            // 🔥 ENVIA SÓ TEXTO
            await sock.sendMessage(chat, {
                text: texto,
                mentions
            }, { quoted: msg });
        }
    } catch (err) {
        console.error('❌ Erro ao enviar mídia:', err.message);
        // 🔥 FALLBACK: TEXTO PURO
        try {
            await sock.sendMessage(chat, {
                text: texto,
                mentions
            }, { quoted: msg });
        } catch (e) {
            console.error('❌ Fallback também falhou:', e.message);
        }
    }
}

// ==================== COMANDOS INDIVIDUAIS ====================
async function cmdGay(sock, chat, sender, msg, args, CONFIG) {
    await cmdPorcentagem(sock, chat, sender, msg, args, 'gay', CONFIG);
}

async function cmdCorno(sock, chat, sender, msg, args, CONFIG) {
    await cmdPorcentagem(sock, chat, sender, msg, args, 'corno', CONFIG);
}

async function cmdPassivo(sock, chat, sender, msg, args, CONFIG) {
    await cmdPorcentagem(sock, chat, sender, msg, args, 'passivo', CONFIG);
}

async function cmdLindo(sock, chat, sender, msg, args, CONFIG) {
    await cmdPorcentagem(sock, chat, sender, msg, args, 'lindo', CONFIG);
}

async function cmdLinda(sock, chat, sender, msg, args, CONFIG) {
    await cmdPorcentagem(sock, chat, sender, msg, args, 'linda', CONFIG);
}

async function cmdFeio(sock, chat, sender, msg, args, CONFIG) {
    await cmdPorcentagem(sock, chat, sender, msg, args, 'feio', CONFIG);
}

async function cmdFeia(sock, chat, sender, msg, args, CONFIG) {
    await cmdPorcentagem(sock, chat, sender, msg, args, 'feia', CONFIG);
}

async function cmdLesbica(sock, chat, sender, msg, args, CONFIG) {
    await cmdPorcentagem(sock, chat, sender, msg, args, 'lesbica', CONFIG);
}

async function cmdInteligente(sock, chat, sender, msg, args, CONFIG) {
    await cmdPorcentagem(sock, chat, sender, msg, args, 'inteligente', CONFIG);
}

async function cmdBurro(sock, chat, sender, msg, args, CONFIG) {
    await cmdPorcentagem(sock, chat, sender, msg, args, 'burro', CONFIG);
}

async function cmdBurra(sock, chat, sender, msg, args, CONFIG) {
    await cmdPorcentagem(sock, chat, sender, msg, args, 'burra', CONFIG);
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdPorcentagem,
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
    cmdBurra,
    getVideoAleatorio,
    VIDEOS_PORCENTAGEM,
    CONFIGS,
    getNomeUsuario,
    gerarBarra,
    getFotoAleatoria
};