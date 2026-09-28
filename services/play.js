// ==================== PLAY - MÚSICAS (JU API) ====================
// services/play.js - Versão PushName + CONFIG.botNome. Porque a outra tava um lixo de ruim
// ============================================================

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const { verificarApiConfigurada } = require('./apiError.js');

// ==================== CONFIGURAÇÃO ====================
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const TIMEOUT_API = 120000;
const TIMEOUT_DOWNLOAD = 180000;

// Frases aleatórias estilo Jufufu
const FRASES = [
    'Waaah',
    'To, sua música',
    'Sua música chegou!',
    'Aperta o play!',
    'Bom gosto',
    'So ouvir'
];

// ==================== FUNÇÕES AUXILIARES ====================

// Frase aleatória
function fraseAleatoria() {
    return FRASES[Math.floor(Math.random() * FRASES.length)];
}

// Formatar segundos para mm:ss ou hh:mm:ss
function formatarDuracao(segundos) {
    if (!segundos || segundos <= 0) return '0:00';
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const seg = Math.floor(segundos % 60);
    if (horas > 0) return `${horas}:${String(minutos).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
    return `${minutos}:${String(seg).padStart(2, '0')}`;
}

// Extrair ID do YouTube
const YT_RE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
function extrairVideoId(url) {
    if (!url) return null;
    const match = url.match(YT_RE);
    return match? match[1] : null;
}

// Pegar nick do usuário via PushName
function pegarNomeExibido(msg) {
    try {
        if (msg.pushName && msg.pushName.trim()) {
            return msg.pushName.trim();
        }
        return 'Usuário';
    } catch (e) {
        return 'Usuário';
    }
}

// Barra de progresso falsa estilo player
function criarBarra(duracao) {
    const total = duracao || 180;
    const progresso = Math.floor(Math.random() * 30) + 35;
    const progressoSegundos = Math.floor((progresso / 100) * total);
    const tempoAtual = formatarDuracao(progressoSegundos);
    const duracaoFormatada = formatarDuracao(total);
    const tamanho = 15;
    const preenchido = Math.floor((progresso / 100) * tamanho);
    let barra = '';
    for (let i = 0; i < tamanho; i++) {
        if (i < preenchido) barra += '━';
        else if (i === preenchido) barra += '●';
        else barra += '─';
    }
    return { barra, tempoAtual, duracaoFormatada };
}

// ==================== API ====================

async function buscarMusicaAPI(query, CONFIG) {
    const { baseUrl, apiKey } = CONFIG.jufufuAPI;
    const url = `${baseUrl}/play?q=${encodeURIComponent(query)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_API);

    let response;
    try {
        response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            signal: controller.signal
        });
    } catch (e) {
        if (e.name === 'AbortError') throw new Error('API demorou muito, tente novamente.');
        throw new Error('Sem conexão com a API');
    } finally {
        clearTimeout(timer);
    }

    // Tratamento de erros HTTP
    if (response.status === 404) throw new Error('Música não encontrada, tente outro nome 🎵');
    if (response.status === 401 || response.status === 403) throw new Error('API Key inválida ou expirada');
    if (response.status === 429) throw new Error('Muitas buscas, aguarde um pouco');
    if (!response.ok) throw new Error(`API fora do ar (${response.status})`);

    const data = await response.json();
    if (!data.ok) throw new Error(data.error || 'Música não encontrada');
    if (!data.downloadUrl) throw new Error('API sem link de download');

    let thumbnail = data.thumbnail;
    if (!thumbnail) {
        const videoId = extrairVideoId(data.url);
        thumbnail = videoId? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : null;
    }

    return {
        title: data.title || 'Título desconhecido',
        author: data.author || 'Desconhecido',
        url: data.url || 'https://youtube.com',
        downloadUrl: data.downloadUrl,
        thumbnail,
        duration: data.duration || data.total_duration_in_seconds || null
    };
}

async function baixarAudio(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_DOWNLOAD);

    let response;
    try {
        response = await fetch(url, { method: 'GET', signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    } catch (e) {
        if (e.name === 'AbortError') throw new Error('Download demorou muito');
        throw e;
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) throw new Error(`Erro ao baixar: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer || buffer.length < 1000) throw new Error('Áudio inválido');
    return buffer;
}

async function converterParaAudioWhatsApp(inputBuffer) {
    const id = crypto.randomBytes(8).toString('hex');
    const inputPath = path.join(TEMP_DIR, `play-${id}.input`);
    const outputPath = path.join(TEMP_DIR, `play-${id}.ogg`);

    try {
        await fs.promises.writeFile(inputPath, inputBuffer);

        await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-y','-hide_banner','-loglevel','error',
                '-i', inputPath,
                '-c:a','libopus','-b:a','64k','-ar','24000','-ac','1',
                '-application','voip', outputPath
            ]);
            ffmpeg.on('error', reject);
            ffmpeg.on('close', code => code === 0? resolve() : reject(new Error('FFmpeg falhou')));
        });

        const outputBuffer = await fs.promises.readFile(outputPath);
        if (!outputBuffer || outputBuffer.length < 100) throw new Error('Áudio inválido');
        return outputBuffer;

    } finally {
        await Promise.allSettled([
            fs.promises.unlink(inputPath),
            fs.promises.unlink(outputPath)
        ]);
    }
}

// ==================== VISUAL ====================

function criarPlayerVisual(data, tempoBusca, nomeExibido, CONFIG) {
    const duracao = data.duration || 0;
    const { barra, tempoAtual, duracaoFormatada } = criarBarra(duracao);
    const botNome = CONFIG.botNome;
    const frase = fraseAleatoria();

    return `╭━━━ ⭐ *${botNome.toUpperCase()} PLAYER* ⭐ ━━━⬣
┃━━━━━━━━━━━━━━━━━━━⬣
┃ ✨ ${frase}
┃━━━━━━━━━━━━━━━━━━━⬣
┃ 🎵 *${data.title}*
┃━━━━━━━━━━━━━━━━━━━⬣
┃ 👤 ${data.author}
┃━━━━━━━━━━━━━━━━━━━⬣
┃ ${tempoAtual} ${barra} ${duracaoFormatada}
┃.......................................................
┃
┃ 💛 Pedido por: ${nomeExibido}
┃-------------------------------------------------------
┃ ⏱️ Busca em: ${tempoBusca}s
┃-------------------------------------------------------
┃ 🔗 YouTube: ${data.url}
┃━━━━━━━━━━━━━━━━━━━⬣
┃•••••••••••••••°°°°°°°°°•••••••••••••••••
╰━━━━━━━━━━━━━━━━━━━⬣
┃ 💿 *${botNome}*
╰━━━━━━━━━━━━━━━━━━━⬣`;
}

// Envio em carrossel interativo
async function enviarCarrosselPlay(sock, chat, data, thumbBuffer, playerTexto, senderJid, CONFIG) {
    try {
        const card = {
            body: proto.Message.InteractiveMessage.Body.create({ text: playerTexto }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: `💛 ${CONFIG.botNome}` }),
            header: proto.Message.InteractiveMessage.Header.create({
                hasMediaAttachment: true,
               ...(await generateWAMessageContent({ image: thumbBuffer }, { upload: sock.waUploadToServer }))
            }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: [
                    { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '▶️ Ouvir no YouTube', url: data.url }) },
                    { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: '🔗 Copiar Link', copy_code: data.url }) }
                ]
            })
        };

        const msgContent = generateWAMessageFromContent(chat, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: { text: `🎵 *${data.title}*` },
                        footer: { text: CONFIG.botNome },
                        carouselMessage: { cards: [card], messageVersion: 1 }
                    })
                }
            }
        }, { userJid: sock.user.id });

        if (senderJid) {
            msgContent.message.viewOnceMessage.message.interactiveMessage.contextInfo = { mentionedJid: [senderJid] };
        }

        await sock.relayMessage(chat, msgContent.message, {
            messageId: msgContent.key.id,
            additionalNodes: [{ tag: 'biz', attrs: {}, content: [{ tag: 'interactive', attrs: { type: 'native_flow', v: '1' }, content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }] }] }]
        });

        return true;
    } catch (e) {
        return false;
    }
}

// ==================== COMANDO PRINCIPAL ====================

async function cmdPlay(sock, chat, msg, args, enviarResposta, reagir, CONFIG) {
    // Verifica se comando está ativo
    if (!CONFIG.comandos?.play) {
        await enviarResposta(chat, sock, '⛔ Comando desativado!', msg);
        return;
    }

    // Verifica API configurada
    if (!(await verificarApiConfigurada(CONFIG, chat, sock, msg, enviarResposta, reagir))) return;

    // Pega query
    const query = Array.isArray(args)? args.join(' ').trim() : String(args || '').trim();
    if (!query) {
        await enviarResposta(chat, sock, `🎵 Digite o nome da música!\n📌 Exemplo: ${CONFIG.prefix}play coldplay`, msg);
        return;
    }
    if (query.includes('http://') || query.includes('https://')) {
        await enviarResposta(chat, sock, '❌ Use apenas o nome da música!', msg);
        return;
    }

    const senderJid = msg.key.participant || msg.key.remoteJid;
    const nomeExibido = pegarNomeExibido(msg);

    await reagir(sock, chat, msg.key.id, '💛');

    try {
        const inicioBusca = Date.now();
        const data = await buscarMusicaAPI(query, CONFIG);
        const tempoBusca = Math.floor((Date.now() - inicioBusca) / 1000);

        const audioBuffer = await baixarAudio(data.downloadUrl);
        const audioPtt = await converterParaAudioWhatsApp(audioBuffer);
        const playerTexto = criarPlayerVisual(data, tempoBusca, nomeExibido, CONFIG);

        // Baixa capa
        let thumbBuffer = null;
        if (data.thumbnail) {
            try {
                const r = await fetch(data.thumbnail);
                if (r.ok) thumbBuffer = Buffer.from(await r.arrayBuffer());
            } catch (e) {}
        }

        // Tenta carrossel, se falhar manda normal
        let enviado = false;
        if (thumbBuffer) enviado = await enviarCarrosselPlay(sock, chat, data, thumbBuffer, playerTexto, senderJid, CONFIG);

        if (!enviado) {
            if (thumbBuffer) {
                await sock.sendMessage(chat, { image: thumbBuffer, caption: playerTexto, mentions: [senderJid] }, { quoted: msg });
            } else {
                await sock.sendMessage(chat, { text: playerTexto, mentions: [senderJid] }, { quoted: msg });
            }
        }

        // Envia áudio
        await sock.sendMessage(chat, { audio: audioPtt, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: msg });
        await reagir(sock, chat, msg.key.id, '🎵');

    } catch (error) {
        await enviarResposta(chat, sock, `❌ ${error.message || 'Erro ao buscar música'}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

module.exports = { cmdPlay, buscarMusicaAPI, baixarAudio, converterParaAudioWhatsApp, enviarCarrosselPlay, pegarNomeExibido };