// ==================== SISTEMA PINTEREST (VIA API JUFUFU) ====================
// services/pinterest.js
//
// Botão de lista (1-5) + Carrossel de imagens
// API: Ju API (Supabase Functions)
// ============================================================

const fetch = require('node-fetch');
const { generateWAMessageContent, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const { verificarApiConfigurada } = require('./apiError.js');

// ==================== BUSCAR IMAGENS NO PINTEREST ====================
async function buscarPinterest(query, limite = 1, CONFIG) {
    try {
        const { baseUrl, apiKey, timeout } = CONFIG.jufufuAPI;

        if (!baseUrl || !apiKey) {
            throw new Error('Ju API não configurada');
        }

        const url = `${baseUrl}/pinterest?q=${encodeURIComponent(query)}&count=${limite}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout || 30000);

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
            throw new Error(`Erro na API: ${response.status}`);
        }

        const data = await response.json();

        if (!data.ok || !data.images || data.images.length === 0) {
            return [];
        }

        return data.images.map(img => ({
            url: img.url,
            title: img.title || 'Sem título',
            link: img.link || ''
        }));

    } catch (err) {
        return [];
    }
}

// ==================== CRIAR CARD ====================
async function makeCard(sock, img, title, texto, link) {
    const media = await generateWAMessageContent(
        { image: { url: img } },
        { upload: sock.waUploadToServer }
    );

    const botoes = [];

    if (link && link.startsWith('http')) {
        botoes.push({
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: '🔗 Abrir no Pinterest',
                url: link
            })
        });
    }

    return {
        body: proto.Message.InteractiveMessage.Body.create({ text: texto }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: title }),
        header: proto.Message.InteractiveMessage.Header.create({
            hasMediaAttachment: true,
            ...media
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: botoes
        })
    };
}

// ==================== ENVIAR BOTÃO DE QUANTIDADE ====================
async function enviarBotaoQuantidade(chat, sock, msg, query, CONFIG) {
    const texto = `🎨 *PINTEREST*\n\n🔍 Pesquisa: "${query}"\n\n📌 Quantas imagens você quer?`;

    const interactiveMessage = {
        body: { text: texto },
        footer: { text: CONFIG.botNome },
        nativeFlowMessage: {
            buttons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '📸 Escolher quantidade',
                        sections: [
                            {
                                title: 'Quantidade de imagens',
                                rows: [
                                    { title: '1️⃣ 1 Imagem', description: 'Buscar 1 imagem', id: `pin_1_${query}` },
                                    { title: '2️⃣ 2 Imagens', description: 'Buscar 2 imagens', id: `pin_2_${query}` },
                                    { title: '3️⃣ 3 Imagens', description: 'Buscar 3 imagens', id: `pin_3_${query}` },
                                    { title: '4️⃣ 4 Imagens', description: 'Buscar 4 imagens', id: `pin_4_${query}` },
                                    { title: '5️⃣ 5 Imagens', description: 'Buscar 5 imagens', id: `pin_5_${query}` }
                                ]
                            }
                        ]
                    })
                }
            ]
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
}

// ==================== ENVIAR CARROSSEL DE IMAGENS ====================
async function enviarCarrosselImagens(sock, chat, msg, imagens, query, CONFIG) {
    try {
        const cards = [];
        for (let i = 0; i < imagens.length; i++) {
            const img = imagens[i];
            const texto = `📝 ${img.title || 'Imagem'}\n🔗 ${img.link || 'Sem link'}`;

            const card = await makeCard(
                sock,
                img.url,
                `🖼️ ${i + 1}/${imagens.length}`,
                texto,
                img.link
            );
            cards.push(card);
        }

        const msgContent = generateWAMessageFromContent(chat, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: { text: `🎨 *PINTEREST: ${query}*` },
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

// ==================== ENVIAR IMAGENS SEPARADAS (FALLBACK) ====================
async function enviarImagensSeparadas(sock, chat, msg, imagens, CONFIG) {
    for (let i = 0; i < imagens.length; i++) {
        const img = imagens[i];
        const legenda = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🖼️ PINTEREST
┃ 📝 ${img.title || 'Sem título'}
┃ 🔗 ${img.link || ''}
┃ 📌 ${i + 1}/${imagens.length}
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

        try {
            const response = await fetch(img.url);
            const buffer = Buffer.from(await response.arrayBuffer());

            await sock.sendMessage(chat, {
                image: buffer,
                caption: legenda
            }, { quoted: msg });

            if (i < imagens.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (err) {}
    }
}

// ==================== COMANDO PINTEREST ====================
async function cmdPinterest(sock, chat, msg, args, enviarResposta, reagir, CONFIG) {
    if (!CONFIG.comandos.pinterest) {
        await enviarResposta(chat, sock, `⛔ O comando °pinterest está desativado!`, msg);
        return;
    }

    // 🔥 VERIFICA A JU API
    if (!(await verificarApiConfigurada(CONFIG, chat, sock, msg, enviarResposta, reagir))) return;

    const query = args.join(' ').trim();

    if (!query) {
        await enviarResposta(chat, sock,
            `📌 Use: ${CONFIG.prefix}pinterest <pesquisa>\n` +
            `📌 Exemplo: ${CONFIG.prefix}pinterest gatos fofos`,
            msg
        );
        return;
    }

    await reagir(sock, chat, msg.key.id, '🔍');

    try {
        await enviarBotaoQuantidade(chat, sock, msg, query, CONFIG);
    } catch (err) {
        await enviarResposta(chat, sock, `❌ Erro: ${err.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== RESPONDER BOTÃO DO PINTEREST ====================
async function responderBotaoPinterest(sock, chat, sender, msg, buttonId, CONFIG, reagir) {
    try {
        if (buttonId.startsWith('pin_')) {
            const semPrefixo = buttonId.replace('pin_', '');
            const primeiroUnderscore = semPrefixo.indexOf('_');
            const quantidade = parseInt(semPrefixo.substring(0, primeiroUnderscore));
            const query = semPrefixo.substring(primeiroUnderscore + 1);

            const imagens = await buscarPinterest(query, quantidade, CONFIG);

            if (imagens.length === 0) {
                await sock.sendMessage(chat, {
                    text: `❌ Nenhuma imagem encontrada para: "${query}"`
                }, { quoted: msg });
                return true;
            }

            const enviado = await enviarCarrosselImagens(sock, chat, msg, imagens, query, CONFIG);

            if (!enviado) {
                await enviarImagensSeparadas(sock, chat, msg, imagens, CONFIG);
            }

            return true;
        }

        return false;

    } catch (error) {
        return false;
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdPinterest,
    responderBotaoPinterest,
    buscarPinterest
};