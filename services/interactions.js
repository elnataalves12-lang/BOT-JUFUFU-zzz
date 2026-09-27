// ==================== SISTEMA DE INTERAÇÕES ====================
// services/interactions.js
//
// Interações com vídeos fixos (tapa, matar, beijar, abraçar, socar)
// ============================================================

const fs = require('fs');
const path = require('path');

// ==================== VÍDEOS FIXOS ====================
// 🔥 Cole os links dos vídeos aqui (serão usados para todas as interações)

const VIDEOS_INTERACAO = {
    tapa: 'https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1789788374162-vfziou.mp4',
    matar: 'https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1789788499714-at4rcr.mp4',
    beijar: 'https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1789788530936-s50447.mp4',
    abracar: 'https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1789788593864-hiqnga.mp4',
    socar: 'https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1789788573884-8igmcl.mp4'
};

// ==================== FRASES POR AÇÃO ====================
const FRASES = {
    tapa: [
        'deu um tapa em',
        'tacou um tapão em',
        'deu uma chinelada em',
        'deu um cascudo em'
    ],
    matar: [
        'matou',
        'assassinou',
        'eliminou',
        'aniquilou',
        'destruiu'
    ],
    beijar: [
        'beijou',
        'deu um beijo em',
        'roubou um beijo de',
        'selou com um beijo'
    ],
    abracar: [
        'abraçou',
        'deu um abraço em',
        'envolveu em um abraço',
        'abraçou com força'
    ],
    socar: [
        'socou',
        'deu um soco em',
        'acertou um direto em',
        'nocauteou'
    ]
};

// ==================== PEGAR NOME DO USUÁRIO ====================
function extrairNumero(sender) {
    if (!sender) return 'unknown';
    return sender.split('@')[0];
}

// ==================== COMANDO DE INTERAÇÃO ====================
async function cmdInteracao(chat, sock, sender, msg, args, acao, enviarResposta, isDono, CONFIG) {
    try {
        // 🔥 PEGA O ALVO (MENSÃO)
        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        let alvo = mentionedJid[0];
        
        // 🔥 SE NÃO TIVER MENSÃO, TENTA PELO NÚMERO
        if (!alvo && args.length > 0) {
            const arg = args[0].replace('@', '');
            try {
                const metadata = await sock.groupMetadata(chat);
                const participantes = metadata.participants.map(p => p.id);
                alvo = participantes.find(p => p.startsWith(arg) || p.includes(arg));
            } catch (e) {}
        }
        
        if (!alvo) {
            await enviarResposta(chat, sock, `⚠️ Marque alguém: ${CONFIG.prefix}${acao} @user`, msg);
            return;
        }
        
        if (alvo === sender) {
            await enviarResposta(chat, sock, `❌ Não pode ${acao} a si mesmo!`, msg);
            return;
        }
        
        if (await isDono(alvo)) {
            await enviarResposta(chat, sock, '👑 Não pode fazer isso com o dono do bot!', msg);
            return;
        }
        
        // 🔥 PEGA A FRASE ALEATÓRIA
        const frases = FRASES[acao] || ['interagiu com'];
        const frase = frases[Math.floor(Math.random() * frases.length)];
        
        // 🔥 PEGA OS NOMES
        const nomeSender = extrairNumero(sender);
        const nomeAlvo = extrairNumero(alvo);
        
        // 🔥 PEGA O VÍDEO
        const videoUrl = VIDEOS_INTERACAO[acao];
        
        // 🔥 CONSTRÓI O TEXTO (SEM O RODAPÉ)
        const texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 💥 **${acao.toUpperCase()}**
╰━━━━━━━━━━━━━━━━━━━━━⬢

@${nomeSender} ${frase} @${nomeAlvo}

╰━━━━━━━━━━━━━━━━━━━━━⬢`;

        // 🔥 ENVIA COM O VÍDEO (SE TIVER)
        if (videoUrl && videoUrl.startsWith('http')) {
            try {
                // 🔥 USA O sock.sendMessage DIRETO, MAS O enviarResposta JÁ VAI ADICIONAR O RODAPÉ
                await sock.sendMessage(chat, {
                    video: { url: videoUrl },
                    gifPlayback: true,
                    caption: texto,
                    mentions: [sender, alvo]
                }, { quoted: msg });
                
                // 🔥 DEPOIS ENVIA O RODAPÉ COM O BOTÃO
                // (não precisa, o texto já foi enviado)
                
            } catch (e) {
                console.log('⚠️ Erro ao enviar vídeo:', e.message);
                await enviarResposta(chat, sock, texto, msg, [sender, alvo]);
            }
        } else {
            await enviarResposta(chat, sock, texto, msg, [sender, alvo]);
        }
        
    } catch (error) {
        console.error(`❌ Erro na interação ${acao}:`, error.message);
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
    }
}

// ==================== COMANDOS INDIVIDUAIS ====================
async function cmdTapa(chat, sock, sender, msg, args, enviarResposta, isDono, CONFIG) {
    await cmdInteracao(chat, sock, sender, msg, args, 'tapa', enviarResposta, isDono, CONFIG);
}

async function cmdMatar(chat, sock, sender, msg, args, enviarResposta, isDono, CONFIG) {
    await cmdInteracao(chat, sock, sender, msg, args, 'matar', enviarResposta, isDono, CONFIG);
}

async function cmdBeijar(chat, sock, sender, msg, args, enviarResposta, isDono, CONFIG) {
    await cmdInteracao(chat, sock, sender, msg, args, 'beijar', enviarResposta, isDono, CONFIG);
}

async function cmdAbracar(chat, sock, sender, msg, args, enviarResposta, isDono, CONFIG) {
    await cmdInteracao(chat, sock, sender, msg, args, 'abracar', enviarResposta, isDono, CONFIG);
}

async function cmdSocar(chat, sock, sender, msg, args, enviarResposta, isDono, CONFIG) {
    await cmdInteracao(chat, sock, sender, msg, args, 'socar', enviarResposta, isDono, CONFIG);
}

// ==================== LISTAR INTERAÇÕES ====================
async function cmdListarInteracoes(chat, sock, msg, enviarResposta, CONFIG) {
    let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🎭 **INTERAÇÕES DISPONÍVEIS**
╰━━━━━━━━━━━━━━━━━━━━━⬢\n\n`;

    for (const [acao, frases] of Object.entries(FRASES)) {
        const temVideo = VIDEOS_INTERACAO[acao] ? '✅' : '❌';
        texto += `┃ ${temVideo} °${acao} @user\n`;
    }

    texto += `\n╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

    await enviarResposta(chat, sock, texto, msg);
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdInteracao,
    cmdTapa,
    cmdMatar,
    cmdBeijar,
    cmdAbracar,
    cmdSocar,
    cmdListarInteracoes,
    VIDEOS_INTERACAO,
    FRASES
};