// ==================== SISTEMA DE INTERAÇÕES ====================
// services/interactions.js
//
// Interações com vídeos fixos (tapa, matar, beijar, abraçar, socar)
// Baixa o GIF → Converte pra MP4 → Envia pro WhatsApp
// ============================================================

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const os = require('os');

// ==================== TEMP DIR ====================
const TEMP_DIR = path.join(os.tmpdir(), 'jufufu_interactions');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ==================== VÍDEOS FIXOS ====================
const VIDEOS_INTERACAO = {
    tapa: 'https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/793e7878-0127-4e6e-bae7-aa080e15a8a5/7189b36e4a0ef770cda47d2f65747ef1.gif?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzLzc5M2U3ODc4LTAxMjctNGU2ZS1iYWU3LWFhMDgwZTE1YThhNS83MTg5YjM2ZTRhMGVmNzcwY2RhNDdkMmY2NTc0N2VmMS5naWYiLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzkwNzIxMjI2LCJleHAiOjIxMDYwODEyMjZ9.0VqJT6Vl-LGfWUK8ChFYLhvOW8EqXcJZ9HEnbpkaYScuyhLfKqPcy9_NkB3djeY0rsDEpRJOUOpolcx0Zt8JMw',
    matar: 'https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/4def78a3-923f-47dd-bc0d-fc0e0c56abbf/07c7921b7cc767c29b38bfbb85c3312f--1-.gif?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzLzRkZWY3OGEzLTkyM2YtNDdkZC1iYzBkLWZjMGUwYzU2YWJiZi8wN2M3OTIxYjdjYzc2N2MyOWIzOGJmYmI4NWMzMzEyZi0tMS0uZ2lmIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MDcyMTIyMCwiZXhwIjoyMTA2MDgxMjIwfQ.hE2FGSf2yGaCmIm3NIp_I5YRami515tQ_0352e9KhfEFGDdqb4JaAtlI0QjobRKdOATHU4EmGgLm7GvAcOJcNQ',
    beijar: 'https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/77ad94eb-d881-46dd-8547-917ecd35f7b7/argentina-mialygosa.gif?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzLzc3YWQ5NGViLWQ4ODEtNDZkZC04NTQ3LTkxN2VjZDM1ZjdiNy9hcmdlbnRpbmEtbWlhbHlnb3NhLmdpZiIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3OTA3MjEyMjIsImV4cCI6MjEwNjA4MTIyMn0.S3yQNWqW9VQ-o4V5Zu2nTS20l2vzsolmE3kIA0EvSaOf4gnxfHId--aLGyejToTpqIDKUrzlEYxTQeTn68TP-Q',
    abracar: 'https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/b8e4d0e2-a0ab-40f3-bc9a-19df4131beae/6e6e53fb69d7b74286c9d2817e1fc3ca.gif?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzL2I4ZTRkMGUyLWEwYWItNDBmMy1iYzlhLTE5ZGY0MTMxYmVhZS82ZTZlNTNmYjY5ZDdiNzQyODZjOWQyODE3ZTFmYzNjYS5naWYiLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzkwNzIxMjE2LCJleHAiOjIxMDYwODEyMTZ9.SnQJT_--Wqk4pusIuxh8JgsDy3ds_8LDdCL5qRvejqilPja_9YQukpCWUqWvbafDtKW1GOB7gg_twruGLZ39FA',
    socar: 'https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/09810f72-e41d-4733-8a49-133096aee1ed/1Ky5.gif?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzLzA5ODEwZjcyLWU0MWQtNDczMy04YTQ5LTEzMzA5NmFlZTFlZC8xS3k1LmdpZiIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3OTA3MjEyMTgsImV4cCI6MjEwNjA4MTIxOH0.u0JBTgH4Q2pSC9sbLAOMqbLnFJB_DHR45fHCVXqvPFlUG9Qv8xP7nsH_IwMRJPykr2GOc3Ph_vJ58ddDb8Eyfg'
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

// ==================== CACHE DE MP4 ====================
// 🔥 O cache guarda o MP4 já convertido (não o GIF)
const _cacheMp4 = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

// ==================== CONVERTER GIF → MP4 ====================
async function converterGifParaMp4(gifBuffer) {
    const id = crypto.randomBytes(8).toString('hex');

    const inputPath = path.join(TEMP_DIR, `inter-${id}.gif`);
    const outputPath = path.join(TEMP_DIR, `inter-${id}.mp4`);

    try {
        await fs.promises.writeFile(inputPath, gifBuffer);

        await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-y',
                '-hide_banner',
                '-loglevel', 'error',
                '-i', inputPath,

                // 🔥 CONVERSÃO PRA MP4 COMPATÍVEL COM WHATSAPP
                '-movflags', 'faststart',
                '-pix_fmt', 'yuv420p',
                '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=20',
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '28',
                '-an', // sem áudio

                outputPath
            ]);

            let stderr = '';

            ffmpeg.stderr.on('data', chunk => {
                stderr += chunk.toString();
            });

            ffmpeg.on('error', reject);

            ffmpeg.on('close', code => {
                if (code === 0) {
                    resolve();
                    return;
                }
                reject(new Error(`FFmpeg falhou (${code})`));
            });
        });

        const mp4Buffer = await fs.promises.readFile(outputPath);

        if (!mp4Buffer || mp4Buffer.length < 1000) {
            throw new Error('MP4 inválido');
        }

        return mp4Buffer;

    } finally {
        try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch (e) {}
        try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (e) {}
    }
}

// ==================== BAIXAR + CONVERTER ====================
async function baixarEConverter(acao) {
    // 🔥 VERIFICA CACHE
    const cache = _cacheMp4.get(acao);
    if (cache && Date.now() - cache.t < CACHE_TTL) {
        return cache.buffer;
    }

    const videoUrl = VIDEOS_INTERACAO[acao];
    if (!videoUrl) return null;

    // 🔥 BAIXA O GIF
    const res = await fetch(videoUrl);
    if (!res.ok) {
        throw new Error(`Erro ao baixar vídeo: ${res.status}`);
    }

    const gifBuffer = Buffer.from(await res.arrayBuffer());

    if (!gifBuffer || gifBuffer.length < 1000) {
        throw new Error('GIF vazio ou inválido');
    }

    // 🔥 CONVERTE PRA MP4
    const mp4Buffer = await converterGifParaMp4(gifBuffer);

    // 🔥 SALVA NO CACHE
    _cacheMp4.set(acao, {
        buffer: mp4Buffer,
        t: Date.now()
    });

    return mp4Buffer;
}

// ==================== PEGAR NOME DO USUÁRIO ====================
function extrairNumero(sender) {
    if (!sender) return 'unknown';
    return sender.split('@')[0].split(':')[0];
}

// ==================== COMANDO DE INTERAÇÃO ====================
async function cmdInteracao(chat, sock, sender, msg, args, acao, enviarResposta, isDono, CONFIG) {
    try {
        // 🔥 PEGA O ALVO (MENSÃO)
        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        let alvo = mentionedJid[0];

        // 🔥 SE NÃO TIVER MENSÃO, TENTA POR RESPOSTA
        if (!alvo) {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
            if (quoted) alvo = quoted;
        }

        // 🔥 SE NÃO TIVER, TENTA PELO NÚMERO DIGITADO
        if (!alvo && args.length > 0) {
            const arg = args[0].replace('@', '').replace(/\D/g, '');
            if (arg && arg.length >= 8) {
                try {
                    const metadata = await sock.groupMetadata(chat);
                    const participantes = metadata.participants;

                    for (const p of participantes) {
                        const pId = String(p.id || '');
                        const pLid = String(p.lid || '');
                        const pJid = String(p.jid || '');

                        if (
                            pId.includes(arg) ||
                            pLid.includes(arg) ||
                            pJid.includes(arg)
                        ) {
                            alvo = pId || pLid || pJid;
                            break;
                        }
                    }
                } catch (e) {}
            }
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

        // 🔥 CONSTRÓI O TEXTO
        const texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 💥 **${acao.toUpperCase()}**
╰━━━━━━━━━━━━━━━━━━━━━⬢

@${nomeSender} ${frase} @${nomeAlvo}

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

        // 🔥 BAIXA + CONVERTE + ENVIA
        try {
            const mp4Buffer = await baixarEConverter(acao);

            if (!mp4Buffer) {
                await enviarResposta(chat, sock, texto, msg, [sender, alvo]);
                return;
            }

            await sock.sendMessage(chat, {
                video: mp4Buffer,
                gifPlayback: true,
                caption: texto,
                mimetype: 'video/mp4',
                mentions: [sender, alvo]
            }, { quoted: msg });

        } catch (e) {
            // 🔥 FALLBACK: SÓ TEXTO
            await enviarResposta(chat, sock, texto, msg, [sender, alvo]);
        }

    } catch (error) {
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

    for (const acao of Object.keys(FRASES)) {
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