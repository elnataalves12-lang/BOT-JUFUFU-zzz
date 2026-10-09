// ==================== MORIE - VIA JU API ====================
// services/morie.js
//
// Comandos:
//   °anime <nome>   → Info de anime com botões
//   °animenews      → Notícias de anime em carrossel
//
// Tudo via Ju API. Fallback de imagem garantido.
// ============================================================

const fetch = require('node-fetch');
const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const CONFIG = require('../config.js');
const { verificarApiConfigurada } = require('./apiError.js');

// ==================== IMAGEM PADRÃO (SEM FOTO) ====================
const IMAGEM_PADRAO = 'https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/5c38be3e-73d0-4bfe-aa22-3341788535cd/icone-de-imagem-sem-foto-ou-em-branco-carregamento-imagens-ausencia-marca-nao-disponivel-sinal-breve-silhueta-natureza-simples-215973362.jpg?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzLzVjMzhiZTNlLTczZDAtNGJmZS1hYTIyLTMzNDE3ODg1MzVjZC9pY29uZS1kZS1pbWFnZW0tc2VtLWZvdG8tb3UtZW0tYnJhbmNvLWNhcnJlZ2FtZW50by1pbWFnZW5zLWF1c2VuY2lhLW1hcmNhLW5hby1kaXNwb25pdmVsLXNpbmFsLWJyZXZlLXNpbGh1ZXRhLW5hdHVyZXphLXNpbXBsZXMtMjE1OTczMzYyLmpwZyIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3OTEzNzc3OTEsImV4cCI6MjEwNjczNzc5MX0.T_KiK7isgWRxxlO_5PHPXcWR1yfYf1o89LHf3htuGqxatM-u_8JOHVLbNzJxva50rdNTsbZy7xbuEYw5j4Inzg';

// ==================== CACHE DA IMAGEM PADRÃO ====================
let _cacheImagemPadrao = null;

async function obterImagemPadrao() {
    if (_cacheImagemPadrao) return _cacheImagemPadrao;

    const buf = await baixarImagem(IMAGEM_PADRAO);
    if (buf) _cacheImagemPadrao = buf;
    return buf;
}

// ==================== CHAMADA PADRÃO À JU API ====================
async function chamarJuApi(endpoint, params = {}) {
    const { baseUrl, apiKey, timeout } = CONFIG.jufufuAPI;

    const queryString = new URLSearchParams(params).toString();
    const url = `${baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout || 60000);

    let res;
    try {
        res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            signal: controller.signal
        });
    } catch (e) {
        if (e.name === 'AbortError') {
            throw new Error('API demorou muito para responder. Tente novamente.');
        }
        throw e;
    } finally {
        clearTimeout(timer);
    }

    if (!res.ok) {
        if (res.status === 404) throw new Error('Não encontrado');
        if (res.status === 401 || res.status === 403) throw new Error('Token da API inválido ou expirado');
        if (res.status === 429) throw new Error('Muitas requisições. Aguarde alguns segundos.');
        throw new Error(`API erro ${res.status}`);
    }

    const data = await res.json();

    if (!data.ok) {
        throw new Error(data.error || 'API não retornou sucesso');
    }

    return data;
}

// ==================== BAIXAR IMAGEM COMO BUFFER ====================
async function baixarImagem(url, tentativas = 2) {
    if (!url) return null;

    for (let i = 0; i < tentativas; i++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);

        try {
            const res = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!res.ok) {
                clearTimeout(timer);
                if (i < tentativas - 1) continue;
                return null;
            }

            const buffer = Buffer.from(await res.arrayBuffer());
            clearTimeout(timer);

            if (buffer.length < 500) {
                if (i < tentativas - 1) continue;
                return null;
            }

            return buffer;

        } catch (e) {
            clearTimeout(timer);
            if (i < tentativas - 1) continue;
            return null;
        }
    }

    return null;
}

// ==================== BAIXAR IMAGEM COM FALLBACK ====================
async function baixarImagemComFallback(url) {
    // 1) Tenta baixar a imagem original
    let buf = await baixarImagem(url);

    // 2) Se falhar, usa a padrão
    if (!buf) {
        buf = await obterImagemPadrao();
    }

    return buf;
}

// ============================================================
// 1. ANIME
// ============================================================
async function cmdAnime(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG) {
    if (!(await verificarApiConfigurada(CONFIG, chat, sock, msg, enviarResposta, reagir))) return;

    const busca = args.join(' ').trim();

    if (!busca) {
        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🎌 *ANIME*
╰━━━━━━━━━━━━━━━━━━━━━⬢

📌 *Como usar:*
┃ ${CONFIG.prefix}anime <nome>

📌 *Exemplo:*
┃ ${CONFIG.prefix}anime naruto

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
            msg
        );
        return;
    }

    await reagir(sock, chat, msg.key.id, '⏳');

    try {
        const data = await chamarJuApi('/anime', { q: busca });

        // ============================================================
        // 🔥 MONTA A LEGENDA (TEMA ANTIGO)
        // ============================================================
        let legenda = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🎌 *ANIME INFO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 📝 *Título:*
┃ ${data.title || 'Sem título'}\n`;

        if (data.titleNative) {
            legenda += `┃ 🇯🇵 ${data.titleNative}\n`;
        }
        if (data.titleRomaji && data.titleRomaji !== data.title) {
            legenda += `┃ 🔤 ${data.titleRomaji}\n`;
        }

        legenda += `┃ 📺 *Tipo:* ${data.format || 'N/A'}
┃ 📊 *Status:* ${data.status || 'N/A'}
┃ 🎬 *Episódios:* ${data.episodes || '?'}
┃ ⏱️ *Duração:* ${data.duration || 'N/A'}
┃ ⭐ *Score:* ${data.score || 'N/A'}
┃ 📅 *Ano:* ${data.year || 'N/A'}
┃ 🏢 *Estúdio:* ${data.studio || 'N/A'}
┃ 🎭 *Gêneros:* ${data.genres || 'N/A'}
╰━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 📖 *Sinopse:*
┃ ${(data.synopsis || 'Sem sinopse').slice(0, 500)}
╰━━━━━━━━━━━━━⬢

『 ${CONFIG.botNome} 』`;

        // ============================================================
        // 🔥 MONTA OS BOTÕES
        // ============================================================
        const botoes = [];

        if (data.siteUrl) {
            botoes.push({
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '🎌 Ver no site',
                    url: data.siteUrl
                })
            });
        }

        const canalLink = CONFIG.canalLink || '';
        if (canalLink && canalLink.startsWith('http')) {
            botoes.push({
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '📢 Canal do Bot',
                    url: canalLink
                })
            });
        }

        // ============================================================
        // 🔥 BAIXA A CAPA (COM FALLBACK GARANTIDO)
        // ============================================================
        const imgBuffer = await baixarImagemComFallback(data.coverImage);

        // ============================================================
        // 🔥 TENTA ENVIAR COMO CARD INTERATIVO
        // ============================================================
        if (imgBuffer && botoes.length > 0) {
            try {
                const mediaContent = await generateWAMessageContent(
                    { image: imgBuffer },
                    { upload: sock.waUploadToServer }
                );

                const interactiveMessage = {
                    body: { text: legenda },
                    footer: { text: CONFIG.botNome },
                    header: {
                        title: (data.title || 'Anime').slice(0, 60),
                        hasMediaAttachment: true,
                        ...mediaContent
                    },
                    nativeFlowMessage: {
                        buttons: botoes
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

                await reagir(sock, chat, msg.key.id, '✅');
                return;

            } catch (e) {
                // Fallback se o card falhar
            }
        }

        // ============================================================
        // 🔥 FALLBACK 1: Imagem + legenda + links no texto
        // ============================================================
        let legendaFinal = legenda;
        if (botoes.length > 0) {
            const links = botoes.map(b => {
                const params = JSON.parse(b.buttonParamsJson);
                return `┃ 🔗 *${params.display_text}:*\n┃ ${params.url}`;
            }).join('\n');

            legendaFinal = legenda.replace('『 ' + CONFIG.botNome + ' 』',
                `╭━━━━━━━━━━━━━⬢\n${links}\n╰━━━━━━━━━━━━━⬢\n\n『 ${CONFIG.botNome} 』`);
        }

        if (imgBuffer) {
            try {
                await sock.sendMessage(chat, {
                    image: imgBuffer,
                    caption: legendaFinal
                }, { quoted: msg });
                await reagir(sock, chat, msg.key.id, '✅');
                return;
            } catch (e) {}
        }

        // ============================================================
        // 🔥 FALLBACK 2: Só texto
        // ============================================================
        await enviarResposta(chat, sock, legendaFinal, msg);
        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ❌ *ERRO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ ${error.message}

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
            msg
        );
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ============================================================
// 2. ANIME NEWS
// ============================================================
async function cmdAnimeNews(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG) {
    if (!(await verificarApiConfigurada(CONFIG, chat, sock, msg, enviarResposta, reagir))) return;

    await reagir(sock, chat, msg.key.id, '📰');

    try {
        const data = await chamarJuApi('/animenews', { count: 8 });

        if (!data.news || data.news.length === 0) {
            throw new Error('Nenhuma notícia encontrada');
        }

        const noticias = data.news;

        // ============================================================
        // 🔥 MONTA OS CARDS DO CARROSSEL
        // ============================================================
        const cards = [];

        for (let i = 0; i < noticias.length; i++) {
            const n = noticias[i];

            // 🔥 BAIXA A IMAGEM (COM FALLBACK GARANTIDO)
            const imgBuffer = await baixarImagemComFallback(n.image);

            // 🔥 GERA O MEDIA CONTENT (SEMPRE VAI TER IMAGEM)
            let mediaContent = {};
            if (imgBuffer) {
                try {
                    mediaContent = await generateWAMessageContent(
                        { image: imgBuffer },
                        { upload: sock.waUploadToServer }
                    );
                } catch (e) {}
            }

            // ============================================================
            // 🔥 TEXTO DO CARD (TEMA ANTIGO)
            // ============================================================
            const textoCard = `╭━━━━━━━━━━━━━⬢
┃ 📅 *Data:* ${n.dateFormatted || 'N/A'}
╰━━━━━━━━━━━━━⬢

📝 ${(n.description || 'Clique para ler a notícia completa.').slice(0, 200)}

『 ${CONFIG.botNome} 』`;

            // 🔥 BOTÕES
            const botoes = [];
            if (n.link && n.link.startsWith('http')) {
                botoes.push({
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📖 Ler notícia',
                        url: n.link
                    })
                });
            }

            const card = {
                body: proto.Message.InteractiveMessage.Body.create({
                    text: textoCard
                }),
                footer: proto.Message.InteractiveMessage.Footer.create({
                    text: `📰 ${i + 1}/${noticias.length} • ${CONFIG.botNome}`
                }),
                header: proto.Message.InteractiveMessage.Header.create({
                    title: (n.title || 'Sem título').slice(0, 60),
                    hasMediaAttachment: Object.keys(mediaContent).length > 0,
                    ...mediaContent
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                    buttons: botoes
                })
            };

            cards.push(card);
        }

        // ============================================================
        // 🔥 ENVIA O CARROSSEL
        // ============================================================
        const textoCarrossel = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📰 *NOTÍCIAS DE ANIME*
╰━━━━━━━━━━━━━━━━━━━━━⬢

📌 Deslize para ver as últimas ${noticias.length} notícias!
🎯 Use os botões para ler cada uma.

『 ${CONFIG.botNome} 』`;

        const msgContent = generateWAMessageFromContent(chat, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: { text: textoCarrossel },
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

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ❌ *ERRO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ ${error.message}

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
            msg
        );
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdAnime,
    cmdAnimeNews
};