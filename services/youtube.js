// ==================== SISTEMA YOUTUBE ====================
// services/youtube.js
//
// API: Ju API (única fonte)
// Sem yt-dlp — baixa MP4 direto do downloadUrl
// ============================================================

const fetch = require('node-fetch');
const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const { verificarApiConfigurada } = require('./apiError.js');

// ==================== CONFIGURAÇÃO ====================
const MAX_VIDEO_MB = 64;         // Limite do WhatsApp
const DOWNLOAD_TIMEOUT = 180000; // 3 minutos

// ==================== PARSING ====================
const YT_RE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

function parseYt(body) {
    if (!body || typeof body !== 'string') return null;
    const texto = body.replace(/^[°º!\/.]?yt\s+/i, '').trim();
    if (!texto) return null;

    // Se for URL completa do YouTube, aceita direto
    if (YT_RE.test(texto)) return { tipo: "url", url: texto };

    // Se for só o ID do vídeo (11 chars)
    if (/^[A-Za-z0-9_-]{11}$/.test(texto)) {
        return { tipo: "url", url: "https://www.youtube.com/watch?v=" + texto };
    }

    // Qualquer outra URL que não é YouTube (deixa a API decidir)
    if (/^https?:\/\//i.test(texto)) return { tipo: "url", url: texto };

    // Senão, é busca por nome
    return { tipo: "busca", termo: texto };
}

// ==================== EXTRAIR VIDEO ID DA URL ====================
function extrairVideoId(url) {
    if (!url) return null;
    const match = url.match(YT_RE);
    return match ? match[1] : null;
}

// ==================== BUSCAR VÍDEO NA JU API ====================
async function buscarVideoAPI(query, CONFIG) {
    const { baseUrl, apiKey, timeout } = CONFIG.jufufuAPI;

    const url = `${baseUrl}/youtube?q=${encodeURIComponent(query)}&type=video`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout || 60000);

    let response;
    try {
        response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) {
        throw new Error(`API retornou erro ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
        throw new Error(data.error || 'Vídeo não encontrado');
    }

    if (!data.downloadUrl) {
        throw new Error('API não retornou o link de download');
    }

    // 🔥 EXTRAI O VIDEO ID DA URL (PRA GERAR THUMBNAIL)
    const videoId = extrairVideoId(data.url);

    // 🔥 THUMBNAIL AUTOMÁTICA
    const thumbnail = videoId
        ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
        : null;

    return {
        videoId,
        title: data.title || 'Vídeo',
        author: data.author || 'Desconhecido',
        url: data.url || (videoId ? `https://youtube.com/watch?v=${videoId}` : 'https://youtube.com'),
        downloadUrl: data.downloadUrl,
        thumbnail,
        credits: data.credits_remaining ?? null
    };
}

// ==================== BAIXAR VÍDEO DA URL ====================
async function baixarVideoDaUrl(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT);

    let response;
    try {
        response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) {
        throw new Error(`Erro ao baixar: ${response.status}`);
    }

    // 🔥 VERIFICA TAMANHO PELO HEADER (SE DISPONÍVEL)
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
        const tamanhoMB = parseInt(contentLength) / (1024 * 1024);
        if (tamanhoMB > MAX_VIDEO_MB) {
            throw new Error(`Vídeo muito grande (${tamanhoMB.toFixed(1)}MB). Máximo: ${MAX_VIDEO_MB}MB`);
        }
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (!buffer || buffer.length < 10000) {
        throw new Error('Vídeo muito pequeno ou inválido');
    }

    const tamanhoMB = buffer.length / (1024 * 1024);
    if (tamanhoMB > MAX_VIDEO_MB) {
        throw new Error(`Vídeo muito grande (${tamanhoMB.toFixed(1)}MB). Máximo: ${MAX_VIDEO_MB}MB`);
    }

    return buffer;
}

// ==================== CRIAR CARD ====================
async function makeCard(sock, media, mediaType, title, texto, botoes) {
    let mediaContent = {};

    if (mediaType === 'image') {
        mediaContent = await generateWAMessageContent(
            { image: media },
            { upload: sock.waUploadToServer }
        );
    } else if (mediaType === 'video') {
        mediaContent = await generateWAMessageContent(
            { video: media },
            { upload: sock.waUploadToServer }
        );
    }

    return {
        body: proto.Message.InteractiveMessage.Body.create({ text: texto }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: title }),
        header: proto.Message.InteractiveMessage.Header.create({
            hasMediaAttachment: mediaType ? true : false,
            ...mediaContent
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: botoes
        })
    };
}

// ==================== ENVIAR CARROSSEL ====================
async function enviarCarrosselYT(sock, chat, msg, videoData, videoBuffer, tempoBusca, CONFIG) {
    try {
        // 🔥 BAIXA A CAPA
        let capaBuffer = null;
        if (videoData.thumbnail) {
            try {
                const capaResponse = await fetch(videoData.thumbnail);
                if (capaResponse.ok) {
                    capaBuffer = Buffer.from(await capaResponse.arrayBuffer());
                }
            } catch (e) {}
        }

        const cards = [];

        // 🔥 CARD 1: CAPA + INFO
        if (capaBuffer) {
            const infoTexto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🎬 *INFORMAÇÕES*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 📺 *Título:*
┃ ${videoData.title}
┃
┃ 👤 *Canal:* ${videoData.author}
┃ ⚡ *Busca:* ${tempoBusca}s

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🔗 ${videoData.url}
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

            const card1 = await makeCard(
                sock,
                capaBuffer,
                'image',
                `🎬 ${videoData.title}`,
                infoTexto,
                [
                    {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: '▶️ Assistir no YouTube',
                            url: videoData.url
                        })
                    }
                ]
            );
            cards.push(card1);
        }

        // 🔥 CARD 2: VÍDEO
        if (videoBuffer) {
            const videoTexto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🎥 *VÍDEO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 📺 *Título:*
┃ ${videoData.title}
┃
┃ 👤 *Canal:* ${videoData.author}

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🔗 ${videoData.url}
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

            const card2 = await makeCard(
                sock,
                videoBuffer,
                'video',
                `🎥 ${videoData.title}`,
                videoTexto,
                [
                    {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: '🔗 Abrir no YouTube',
                            url: videoData.url
                        })
                    }
                ]
            );
            cards.push(card2);
        }

        if (cards.length === 0) {
            return false;
        }

        const msgContent = generateWAMessageFromContent(chat, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: { text: `📹 *${videoData.title}*` },
                        footer: { text: CONFIG.botNome },
                        carouselMessage: {
                            cards: cards,
                            messageVersion: 1
                        }
                    })
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

        return true;

    } catch (error) {
        return false;
    }
}

// ==================== ENVIO FALLBACK ====================
async function enviarVideoDireto(sock, chat, msg, videoData, videoBuffer, tempoBusca, CONFIG) {
    try {
        const legenda = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🎬 *INFORMAÇÕES*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 📺 *Título:*
┃ ${videoData.title}
┃
┃ 👤 *Canal:* ${videoData.author}
┃ ⚡ *Busca:* ${tempoBusca}s

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🔗 ${videoData.url}
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

        await sock.sendMessage(chat, {
            video: videoBuffer,
            caption: legenda,
            mimetype: 'video/mp4'
        }, { quoted: msg });

        return true;

    } catch (error) {
        return false;
    }
}

// ==================== FUNÇÃO PRINCIPAL ====================
async function cmdYt(sock, chat, sender, msg, args, enviarResposta, reagir, CONFIG) {
    if (!CONFIG.comandos?.yt) {
        await enviarResposta(chat, sock, '⛔ O comando °yt está desativado!', msg);
        return;
    }

    // 🔥 BLOQUEIA SE A JU API NÃO ESTIVER CONFIGURADA
    if (!(await verificarApiConfigurada(CONFIG, chat, sock, msg, enviarResposta, reagir))) return;

    const query = Array.isArray(args) ? args.join(' ').trim() : String(args || '').trim();
    if (!query) {
        await enviarResposta(chat, sock,
            `📹 Digite o nome do vídeo!\n` +
            `📌 Exemplo: ${CONFIG.prefix}yt montagem HAKARI`,
            msg
        );
        return;
    }

    await reagir(sock, chat, msg.key.id, '🎬');

    const inicio = Date.now();

    try {
        const pedido = parseYt(query);
        if (!pedido) {
            await enviarResposta(chat, sock, '❌ Comando inválido! Use °yt <vídeo>', msg);
            return;
        }

        const searchQuery = pedido.tipo === 'url' ? pedido.url : pedido.termo;

        await enviarResposta(chat, sock, `🔎 Buscando "${searchQuery}"...`, msg);

        // 🔥 BUSCA NA JU API
        const videoData = await buscarVideoAPI(searchQuery, CONFIG);

        // 🔥 BAIXA O VÍDEO DA URL RETORNADA
        const videoBuffer = await baixarVideoDaUrl(videoData.downloadUrl);

        // 🔥 TEMPO TOTAL
        const tempoBusca = ((Date.now() - inicio) / 1000).toFixed(1);

        // 🔥 TENTA ENVIAR EM CARROSSEL
        const carrosselEnviado = await enviarCarrosselYT(sock, chat, msg, videoData, videoBuffer, tempoBusca, CONFIG);

        if (!carrosselEnviado) {
            await enviarVideoDireto(sock, chat, msg, videoData, videoBuffer, tempoBusca, CONFIG);
        }

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        await enviarResposta(chat, sock, `❌ ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdYt,
    parseYt,
    buscarVideoAPI,
    baixarVideoDaUrl,
    extrairVideoId,
    enviarCarrosselYT,
    enviarVideoDireto
};