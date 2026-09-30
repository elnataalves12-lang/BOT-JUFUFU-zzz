// ==================== COMANDOS DE PORCENTAGEM ====================
// services/porcentagem.js
//
// Baixa o GIF → Converte pra MP4 → Envia pro WhatsApp
// Menção correta usando @ do usuário
// ============================================================

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const os = require('os');

// ==================== TEMP DIR ====================
const TEMP_DIR = path.join(os.tmpdir(), 'jufufu_porcentagem');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ==================== VÍDEOS POR TIPO ====================
const VIDEOS_PORCENTAGEM = {
    'gay': [
        'https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/b874a9d3-538a-4cd2-ac91-a21fcb6850bf/81c7c1cee3522304add4a500e98b44be.gif?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzL2I4NzRhOWQzLTUzOGEtNGNkMi1hYzkxLWEyMWZjYjY4NTBiZi84MWM3YzFjZWUzNTIyMzA0YWRkNGE1MDBlOThiNDRiZS5naWYiLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzkwNzI0MjIyLCJleHAiOjIxMDYwODQyMjJ9.fzDUVY7tC-DBGtCa0GTxxzRx1_ic_FWtEU0DKb6IyIRQG5aUPwmq2TIeFDLtQwPr5C9z0arrgAm7skOhPkn4Hw'
    ],
    'corno': [
        'https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/5e3acd90-1011-4474-9d0b-2cca4ac12075/1f402.gif?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzLzVlM2FjZDkwLTEwMTEtNDQ3NC05ZDBiLTJjY2E0YWMxMjA3NS8xZjQwMi5naWYiLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzkwNzI0MjIzLCJleHAiOjIxMDYwODQyMjN9.4kVLBOkoatrrZEwuhDNQW0IM3sk1lCgUr7g9mkBqW0M_ginyuPt3-xbd-pbhO_HoIj5Z76zTB421_h8vQ_p7PQ'
    ],
    'passivo': [
        'https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/c19bd4ac-2c93-4534-969e-b297bb6a8d66/passive-mode.gif?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzL2MxOWJkNGFjLTJjOTMtNDUzNC05NjllLWIyOTdiYjZhOGQ2Ni9wYXNzaXZlLW1vZGUuZ2lmIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MDcyNDIyNSwiZXhwIjoyMTA2MDg0MjI1fQ.B0eKia8ziRYmp-MCwcptPMy-TQYgSJEO4Q9VXDirT9biNacayHF6kXY2fhiiT2K0k3QsGJIFw013GyeNnCM6Mw'
    ],
    'lindo': [
        'https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/72cb358c-0f27-4793-9de9-f9d3fc5ba14f/smile.gif?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzLzcyY2IzNThjLTBmMjctNDc5My05ZGU5LWY5ZDNmYzViYTE0Zi9zbWlsZS5naWYiLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzkwNzI0MjE5LCJleHAiOjIxMDYwODQyMTl9.zjGqpVz9sdwUdipMEbjo3MdutL0DzzJj4ZaREYE_enjvvMlsOjvs4n_9k8SuLxU7k9LXRUnI-2uI00gKb3VtLw'
    ],
    'linda': [
        'https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/c4907f24-ccf6-4d0f-b0f6-a73e81934209/ac6784322e025d15b7fdcf7d95e09b0b.gif?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzL2M0OTA3ZjI0LWNjZjYtNGQwZi1iMGY2LWE3M2U4MTkzNDIwOS9hYzY3ODQzMjJlMDI1ZDE1YjdmZGNmN2Q5NWUwOWIwYi5naWYiLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzkwNzI0MjE4LCJleHAiOjIxMDYwODQyMTh9.Fk5LYDGiXtaW_Kcz9O1Kwa1ULd9ByQZTOoWrMiEjMscTqo9y7jJIQtcKLWtaLtplzf_-1dlvPCu3Nc5syN-1vw'
    ],
    'feio': [
        'https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/73dbd66a-7f32-4cc2-8bcc-164d28986dd7/2v9rhos4vqwf1.gif?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzLzczZGJkNjZhLTdmMzItNGNjMi04YmNjLTE2NGQyODk4NmRkNy8ydjlyaG9zNHZxd2YxLmdpZiIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3OTA3MjQyMTMsImV4cCI6MjEwNjA4NDIxM30.Ri1v0gR-ey4tEOD61eT9medXf9xPrXk8dcly9MrI2cu39HNW4JO0irFLp_pyUTiQ8-Oxmb35s1LvoZSLSUZf8Q'
    ],
    'feia': [
        'https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/0f8b7800-9290-427f-b2a2-ccc7bbb26d30/cruella-de-vil-giggle.gif?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzLzBmOGI3ODAwLTkyOTAtNDI3Zi1iMmEyLWNjYzdiYmIyNmQzMC9jcnVlbGxhLWRlLXZpbC1naWdnbGUuZ2lmIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MDcyNDIxNiwiZXhwIjoyMTA2MDg0MjE2fQ.zfcmEUWE893wvelmHe921qka-oaIF5Ed6y-u7tQB41p7fNSsV2LL00sh3_dmK1DlIY6-DsX3z6X7yWsnCFNQ1w'
    ],
    'lesbica': [
        'https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/35d48142-b269-4f13-a398-6a8bab203929/tumblr_n223q6JtjG1rmvjnyo1_500.gif?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzLzM1ZDQ4MTQyLWIyNjktNGYxMy1hMzk4LTZhOGJhYjIwMzkyOS90dW1ibHJfbjIyM3E2SnRqRzFybXZqbnlvMV81MDAuZ2lmIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MDcyNDIwNSwiZXhwIjoyMTA2MDg0MjA1fQ.nCUy1DVbwPLzjRIVHaYipcK0akzWfNI5ltVA9CBhyYqj5I-aKI_9i3R2TpRCjbDrNCbL6V3SGDiK6HHFKypbJg'
    ],
    'inteligente': [
        'https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/21d70e31-ae6e-4b3c-b4e2-c22bed3f01ac/79e95164a31746be4309f1670c15a2ca.gif?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzLzIxZDcwZTMxLWFlNmUtNGIzYy1iNGUyLWMyMmJlZDNmMDFhYy83OWU5NTE2NGEzMTc0NmJlNDMwOWYxNjcwYzE1YTJjYS5naWYiLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzkwNzI0ODA3LCJleHAiOjIxMDYwODQ4MDd9.9CR18RIe4kRdPUWha6TCXVZgbCbCM7n0te6PkBu4Tdh369C10ouhDzynPpJYKQ2s4Sd16qw3ogM1rDtMQZeUBA'
    ],
    'burro': [
        'https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/60e8cb08-1462-414a-9b27-51efb39850a4/2279738_42794.gif?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzLzYwZThjYjA4LTE0NjItNDE0YS05YjI3LTUxZWZiMzk4NTBhNC8yMjc5NzM4XzQyNzk0LmdpZiIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3OTA3MjQyMDMsImV4cCI6MjEwNjA4NDIwM30.TW1885wE4e9PpxYuSa2I4Y0xzveUvPoKrm0QrBnmnLlHTK_nKHZYFOuFkc48qvoSouEjCP31P-w_fegayFz8ZQ'
    ],
    'burra': [
        'https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/60e8cb08-1462-414a-9b27-51efb39850a4/2279738_42794.gif?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzLzYwZThjYjA4LTE0NjItNDE0YS05YjI3LTUxZWZiMzk4NTBhNC8yMjc5NzM4XzQyNzk0LmdpZiIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3OTA3MjQyMDMsImV4cCI6MjEwNjA4NDIwM30.TW1885wE4e9PpxYuSa2I4Y0xzveUvPoKrm0QrBnmnLlHTK_nKHZYFOuFkc48qvoSouEjCP31P-w_fegayFz8ZQ'
    ]
};

// ==================== CONFIGURAÇÕES ====================
const CONFIGS = {
    'gay': { emoji: '🏳️‍🌈', titulo: 'Gay', alto: '🌈 ORGULHO LGBTQIA+', medio: '💖 Arco-Íris Fraco', baixo: '💔 Hetero Top', comentarios: ['🏳️‍🌈 Arrasou migo!', '🌈 Orgulho do grupo!', '💖 Tá quase lá!', '💔 Ainda não descobriu...', '🏳️‍🌈 Rei/Rainha do Orgulho!'] },
    'corno': { emoji: '🦌', titulo: 'Corno', alto: '🦌🚨 REI DO CHIFRE', medio: '🤔 Corno Moderado', baixo: '😎 Seguro Demais', comentarios: ['🦌 Cuidado com a galhada!', '🚨 Alerta de chifre!', '🤔 Já desconfio...', '😎 De boas, sem chifre', '🦌 O Corno Mestre!'] },
    'passivo': { emoji: '😒', titulo: 'Passivo', alto: '👑 REI DO VÁCUO', medio: '📈 Passivo Moderado', baixo: '😇 Ativo Demais', comentarios: ['🙄 Tá ocupado ou só ignorando?', '😏 "Vou responder depois" - famoso', '👀 Vi sua mensagem hein...', '😴 Acorda pra vida!', '👻 É vivo ou é fantasma?'] },
    'lindo': { emoji: '✨', titulo: 'Lindo', alto: '👑 PERFEIÇÃO', medio: '😊 Bonito', baixo: '😐 Normal', comentarios: ['✨ Maravilhoso(a)!', '👑 Beleza rara!', '😊 Muito bonito(a)!', '😐 Podia ser pior...', '⭐ Deusa/Deus da beleza!'] },
    'linda': { emoji: '✨', titulo: 'Linda', alto: '👑 PERFEIÇÃO', medio: '😊 Bonita', baixo: '😐 Normal', comentarios: ['✨ Maravilhosa!', '👑 Beleza rara!', '😊 Muito bonita!', '😐 Podia ser pior...', '⭐ Deusa da beleza!'] },
    'feio': { emoji: '👹', titulo: 'Feio', alto: '💀 MORFEIO', medio: '😅 Feinho', baixo: '😇 Bonito por dentro', comentarios: ['👹 Mas tem coração!', '💀 Tadinho(a)...', '😅 Feinho mas é gente boa', '😇 Beleza interior conta', '👹 O Feio Mestre!'] },
    'feia': { emoji: '👹', titulo: 'Feia', alto: '💀 MORFEIA', medio: '😅 Feinha', baixo: '😇 Bonita por dentro', comentarios: ['👹 Mas tem coração!', '💀 Tadinha...', '😅 Feinha mas é gente boa', '😇 Beleza interior conta', '👹 A Feia Mestra!'] },
    'lesbica': { emoji: '👩‍❤️‍👩', titulo: 'Lésbica', alto: '🌈 ORGULHO LÉSBICO', medio: '💖 Sapatão Fraco', baixo: '💔 Hetero Top', comentarios: ['👩‍❤️‍👩 Orgulho lésbico!', '🌈 Arrasou miga!', '💖 Tá quase lá!', '💔 Ainda não descobriu...', '👩‍❤️‍👩 Rainha do Orgulho!'] },
    'inteligente': { emoji: '🧠', titulo: 'Inteligente', alto: '🧠📚 GÊNIO', medio: '🤓 Esperto', baixo: '😶 Burrinho', comentarios: ['🧠 Cérebro de Einstein!', '📚 Muito inteligente!', '🤓 Sabichão!', '😶 Tá aprendendo ainda...', '🧠 O Gênio do Grupo!'] },
    'burro': { emoji: '🐴', titulo: 'Burro', alto: '🐴💀 MUITO BURRO', medio: '😅 Burrinho', baixo: '🧠 Esperto', comentarios: ['🐴 Tadinho...', '💀 Burrice nível máximo!', '😅 Burrinho mas é gente boa', '🧠 Na verdade é esperto', '🐴 O Burro Mestre!'] },
    'burra': { emoji: '🐴', titulo: 'Burra', alto: '🐴💀 MUITO BURRA', medio: '😅 Burrinha', baixo: '🧠 Esperta', comentarios: ['🐴 Tadinha...', '💀 Burrice nível máximo!', '😅 Burrinha mas é gente boa', '🧠 Na verdade é esperta', '🐴 A Burra Mestra!'] }
};

// ==================== FUNÇÕES AUXILIARES ====================
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

function getNomeUsuario(target) {
    if (!target) return 'unknown';
    return target.split('@')[0].split(':')[0];
}

// ==================== CACHE DE MP4 ====================
const _cacheMp4 = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

// ==================== CONVERTER GIF → MP4 ====================
async function converterGifParaMp4(gifBuffer) {
    const id = crypto.randomBytes(8).toString('hex');

    const inputPath = path.join(TEMP_DIR, `porc-${id}.gif`);
    const outputPath = path.join(TEMP_DIR, `porc-${id}.mp4`);

    try {
        await fs.promises.writeFile(inputPath, gifBuffer);

        await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-y',
                '-hide_banner',
                '-loglevel', 'error',
                '-i', inputPath,
                '-movflags', 'faststart',
                '-pix_fmt', 'yuv420p',
                '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=20',
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '28',
                '-an',
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
async function baixarEConverter(videoUrl) {
    // 🔥 VERIFICA CACHE
    const cache = _cacheMp4.get(videoUrl);
    if (cache && Date.now() - cache.t < CACHE_TTL) {
        return cache.buffer;
    }

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
    _cacheMp4.set(videoUrl, {
        buffer: mp4Buffer,
        t: Date.now()
    });

    return mp4Buffer;
}

// ==================== COMANDO PRINCIPAL ====================
async function cmdPorcentagem(sock, chat, sender, msg, args, tipo, CONFIG) {
    // 🔥 PEGA O USUÁRIO MENCIONADO
    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentionedJid[0] || sender;

    const nome = getNomeUsuario(target);

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
            // 🔥 BAIXA + CONVERTE + ENVIA COMO VÍDEO
            const mp4Buffer = await baixarEConverter(videoUrl);

            await sock.sendMessage(chat, {
                video: mp4Buffer,
                gifPlayback: true,
                caption: texto,
                mimetype: 'video/mp4',
                mentions
            }, { quoted: msg });

        } else {
            // 🔥 SEM VÍDEO → SÓ TEXTO
            await sock.sendMessage(chat, {
                text: texto,
                mentions
            }, { quoted: msg });
        }
    } catch (err) {
        // 🔥 FALLBACK: SÓ TEXTO
        try {
            await sock.sendMessage(chat, {
                text: texto,
                mentions
            }, { quoted: msg });
        } catch (e) {}
    }
}

// ==================== COMANDOS INDIVIDUAIS ====================
async function cmdGay(sock, chat, sender, msg, args, CONFIG) { await cmdPorcentagem(sock, chat, sender, msg, args, 'gay', CONFIG); }
async function cmdCorno(sock, chat, sender, msg, args, CONFIG) { await cmdPorcentagem(sock, chat, sender, msg, args, 'corno', CONFIG); }
async function cmdPassivo(sock, chat, sender, msg, args, CONFIG) { await cmdPorcentagem(sock, chat, sender, msg, args, 'passivo', CONFIG); }
async function cmdLindo(sock, chat, sender, msg, args, CONFIG) { await cmdPorcentagem(sock, chat, sender, msg, args, 'lindo', CONFIG); }
async function cmdLinda(sock, chat, sender, msg, args, CONFIG) { await cmdPorcentagem(sock, chat, sender, msg, args, 'linda', CONFIG); }
async function cmdFeio(sock, chat, sender, msg, args, CONFIG) { await cmdPorcentagem(sock, chat, sender, msg, args, 'feio', CONFIG); }
async function cmdFeia(sock, chat, sender, msg, args, CONFIG) { await cmdPorcentagem(sock, chat, sender, msg, args, 'feia', CONFIG); }
async function cmdLesbica(sock, chat, sender, msg, args, CONFIG) { await cmdPorcentagem(sock, chat, sender, msg, args, 'lesbica', CONFIG); }
async function cmdInteligente(sock, chat, sender, msg, args, CONFIG) { await cmdPorcentagem(sock, chat, sender, msg, args, 'inteligente', CONFIG); }
async function cmdBurro(sock, chat, sender, msg, args, CONFIG) { await cmdPorcentagem(sock, chat, sender, msg, args, 'burro', CONFIG); }
async function cmdBurra(sock, chat, sender, msg, args, CONFIG) { await cmdPorcentagem(sock, chat, sender, msg, args, 'burra', CONFIG); }

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
    gerarBarra
};