// ==================== COMANDO NOTÍCIAS ====================
// services/news.js
//
// Busca notícias do mundo todo via Ju API (endpoint /news)
// - Busca por categoria ou palavra-chave
// - Envia em carrossel com 2 botões por card:
//     📖 Ler notícia + 📢 Canal do Bot
// - Cache interno de 5 minutos
//
// Uso:
//   °noticias                  → notícias gerais
//   °noticias tech             → notícias de tecnologia
//   °noticias esporte          → notícias de esporte
//   °noticias bitcoin          → busca por palavra-chave
//
// ============================================================

const fetch = require('node-fetch');
const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const CONFIG = require('../config.js');
const { verificarApiConfigurada } = require('./apiError.js');

// ==================== IMAGEM PADRÃO ====================
const IMAGEM_PADRAO = 'https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/5c38be3e-73d0-4bfe-aa22-3341788535cd/icone-de-imagem-sem-foto-ou-em-branco-carregamento-imagens-ausencia-marca-nao-disponivel-sinal-breve-silhueta-natureza-simples-215973362.jpg?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzLzVjMzhiZTNlLTczZDAtNGJmZS1hYTIyLTMzNDE3ODg1MzVjZC9pY29uZS1kZS1pbWFnZW0tc2VtLWZvdG8tb3UtZW0tYnJhbmNvLWNhcnJlZ2FtZW50by1pbWFnZW5zLWF1c2VuY2lhLW1hcmNhLW5hby1kaXNwb25pdmVsLXNpbmFsLWJyZXZlLXNpbGh1ZXRhLW5hdHVyZXphLXNpbXBsZXMtMjE1OTczMzYyLmpwZyIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3OTA3Mzc3OTEsImV4cCI6MjEwNjczNzc5MX0.T_KiK7isgWRxxlO_5PHPXcWR1yfYf1o89LHf3htuGqxatM-u_8JOHVLbNzJxva50rdNTsbZy7xbuEYw5j4Inzg';

// ==================== CACHE DA IMAGEM PADRÃO ====================
let _cacheImagemPadrao = null;

async function obterImagemPadrao() {
    if (_cacheImagemPadrao) return _cacheImagemPadrao;
    const buf = await baixarImagem(IMAGEM_PADRAO);
    if (buf) _cacheImagemPadrao = buf;
    return buf;
}

// ==================== CATEGORIAS VÁLIDAS ====================
const CATEGORIAS_VALIDAS = [
    'geral',
    'mundo',
    'negocios',
    'tech',
    'tecnologia',
    'entretenimento',
    'esporte',
    'esportes',
    'ciencia',
    'saude'
];

// ==================== CHAMADA À JU API ====================
async function chamarJuApiNews(params = {}) {
    const { baseUrl, apiKey, timeout } = CONFIG.jufufuAPI;

    const queryString = new URLSearchParams(params).toString();
    const url = `${baseUrl}/news${queryString ? '?' + queryString : ''}`;

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
            throw new Error('A API demorou muito para responder. Tente novamente.');
        }
        throw e;
    } finally {
        clearTimeout(timer);
    }

    if (!res.ok) {
        if (res.status === 404) throw new Error('Endpoint /news não encontrado na API');
        if (res.status === 401 || res.status === 403) throw new Error('Token da API inválido ou expirado');
        if (res.status === 429) throw new Error('Muitas requisições. Aguarde alguns segundos.');
        if (res.status >= 500) throw new Error(`API offline (${res.status})`);
        throw new Error(`Erro ${res.status}`);
    }

    const data = await res.json();

    if (!data.ok) {
        throw new Error(data.error || 'API não retornou sucesso');
    }

    return data;
}

// ==================== BAIXAR IMAGEM ====================
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

async function baixarImagemComFallback(url) {
    let buf = await baixarImagem(url);
    if (!buf) buf = await obterImagemPadrao();
    return buf;
}

// ==================== COMANDO °noticias ====================
async function cmdNews(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG) {
    // 🔥 VERIFICA A JU API
    if (!(await verificarApiConfigurada(CONFIG, chat, sock, msg, enviarResposta, reagir))) return;

    // 🔥 PEGA OS ARGUMENTOS
    const arg0 = (args[0] || '').toLowerCase().trim();

    let categoria = 'geral';
    let query = '';

    // 🔥 SE PASSOU UMA CATEGORIA VÁLIDA → USA COMO CATEGORIA
    if (arg0 && CATEGORIAS_VALIDAS.includes(arg0)) {
        categoria = arg0;
    }
    // 🔥 SENÃO → USA COMO BUSCA (palavra-chave)
    else if (args.length > 0) {
        query = args.join(' ').trim();
    }

    // 🔥 VALIDA (se for categoria vazia e query vazia → geral)
    if (!categoria && !query) {
        categoria = 'geral';
    }

    // 🔥 PEGA O CANAL DO CONFIG
    const canalLink = CONFIG.canalLink || '';

    await reagir(sock, chat, msg.key.id, '📰');

    try {
        // 🔥 MONTA OS PARÂMETROS DA API
        const params = {
            count: 5,
            lang: 'pt',
            country: 'br'
        };

        if (query) {
            params.q = query;
        } else if (categoria) {
            params.category = categoria;
        }

        // 🔥 CHAMA A API
        const data = await chamarJuApiNews(params);

        if (!data.news || data.news.length === 0) {
            await enviarResposta(chat, sock,
                `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📭 *SEM NOTÍCIAS*
╰━━━━━━━━━━━━━━━━━━━━━⬢

📌 Não encontrei notícias para:
┃ ${query ? `Busca: *${query}*` : `Categoria: *${categoria}*`}

💡 Tente:
┃ ${CONFIG.prefix}noticias
┃ ${CONFIG.prefix}noticias tech
┃ ${CONFIG.prefix}noticias bitcoin

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
                msg
            );
            return;
        }

        const noticias = data.news;

        // ============================================================
        // 🔥 MONTA OS CARDS DO CARROSSEL
        // ============================================================
        const cards = [];

        for (let i = 0; i < noticias.length; i++) {
            const n = noticias[i];

            // 🔥 BAIXA A IMAGEM (com fallback garantido)
            const imgBuffer = await baixarImagemComFallback(n.image);

            // 🔥 GERA O MEDIA CONTENT
            let mediaContent = {};
            if (imgBuffer) {
                try {
                    mediaContent = await generateWAMessageContent(
                        { image: imgBuffer },
                        { upload: sock.waUploadToServer }
                    );
                } catch (e) {}
            }

            // 🔥 TEXTO DO CARD (TEMA ANTIGO)
            const textoCard = `╭━━━━━━━━━━━━━⬢
┃ 📅 *${n.dateFormatted || 'Agora'}*
┃ 📡 *${n.source || 'Desconhecido'}*
╰━━━━━━━━━━━━━⬢

📝 ${(n.description || 'Clique no botão para ler a notícia completa.').slice(0, 200)}

『 ${CONFIG.botNome} 』`;

            // 🔥 BOTÕES DO CARD
            const botoes = [];

            // 🔥 BOTÃO 1: LER NOTÍCIA
            if (n.url && n.url.startsWith('http')) {
                botoes.push({
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📖 Ler notícia',
                        url: n.url
                    })
                });
            }

            // 🔥 BOTÃO 2: CANAL DO BOT
            if (canalLink && canalLink.startsWith('http')) {
                botoes.push({
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📢 Canal do Bot',
                        url: canalLink
                    })
                });
            }

            // 🔥 MONTA O CARD
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
        // 🔥 TEXTO INICIAL DO CARROSSEL (TEMA ANTIGO)
        // ============================================================
        const textoCarrossel = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📰 *NOTÍCIAS DO MUNDO*
╰━━━━━━━━━━━━━━━━━━━━━⬢`;

        // ============================================================
        // 🔥 ENVIA O CARROSSEL
        // ============================================================
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
        console.error('❌ Erro no comando noticias:', error.message);

        // 🔥 MENSAGEM DE ERRO (TEMA ANTIGO)
        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ❌ *ERRO AO BUSCAR NOTÍCIAS*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 📌 ${error.message}

┃ 💡 Tente novamente em
┃ alguns instantes.

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
            msg
        );

        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdNews,
    CATEGORIAS_VALIDAS
};