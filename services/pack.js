// ==================== PACK DE FIGURINHAS ====================
// services/pack.js
//
// Cria packs de figurinhas a partir de pesquisas do Pinterest
//
// Uso:
//   °pack <pesquisa>     → abre o menu de quantidade
//   (botão) 3/10/15      → escolhe quantas figurinhas
//
// Fluxo:
//   1. Busca imagens no Pinterest (Ju API)
//   2. Baixa cada imagem
//   3. Converte pra WebP 512x512 com cwebp
//   4. Envia como figurinhas
// ============================================================

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');  
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const { verificarApiConfigurada } = require('./apiError.js');

const execPromise = promisify(exec);

// ==================== TEMP DIR ====================
const TEMP_DIR = path.join(process.cwd(), 'temp', 'pack');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ==================== NOME DO PACK ====================
// 🔥 Vem do config.js — aparece no nome da figurinha
function pegarNomePack(CONFIG) {
    return CONFIG.botNome || 'Jufufu Bot';
}

// ==================== BUSCAR IMAGENS NO PINTEREST ====================
async function buscarImagensPinterest(query, quantidade, CONFIG) {
    const { baseUrl, apiKey, timeout } = CONFIG.jufufuAPI;

    // 🔥 BUSCA MAIS QUE O NECESSÁRIO (pra ter margem, caso algumas falhem)
    const limite = Math.min(quantidade + 5, 25);

    const url = `${baseUrl}/pinterest?q=${encodeURIComponent(query)}&count=${limite}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout || 60000);

    let response;
    try {
        response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal,
            timeout: timeout || 60000
        });
    } catch (e) {
        if (e.name === 'AbortError' || e.message?.includes('aborted')) {
            throw new Error('Pinterest demorou muito.');
        }
        throw e;
    } finally {
        clearTimeout(timer);
    }

    const data = response.data;

    if (!data.ok || !data.images || data.images.length === 0) {
        return [];
    }

    // 🔥 REMOVE DUPLICADAS (por URL)
    const vistos = new Set();
    const unicas = [];

    for (const img of data.images) {
        if (!img.url) continue;
        if (vistos.has(img.url)) continue;

        vistos.add(img.url);
        unicas.push(img);

        if (unicas.length >= quantidade) break;
    }

    return unicas;
}

// ==================== BAIXAR IMAGEM ====================
async function baixarImagem(url, destino) {
    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    fs.writeFileSync(destino, response.data);

    if (response.data.length < 5000) {
        throw new Error('Imagem muito pequena');
    }

    return destino;
}

// ==================== CONVERTER PRA FIGURINHA (cwebp) ====================
async function converterParaFigurinha(inputPath, outputPath) {
    // 🔥 COMANDO: cwebp -q 80 -resize 512 512 entrada.jpg -o saida.webp
    const comando = `cwebp -q 80 -resize 512 512 "${inputPath}" -o "${outputPath}"`;

    try {
        await execPromise(comando, { timeout: 30000 });
    } catch (error) {
        throw new Error(`Erro ao converter: ${error.message}`);
    }

    // 🔥 VERIFICA SE O ARQUIVO FOI CRIADO
    if (!fs.existsSync(outputPath)) {
        throw new Error('cwebp não gerou o arquivo');
    }

    const stats = fs.statSync(outputPath);

    if (stats.size < 100) {
        throw new Error('Figurinha inválida');
    }

    return outputPath;
}

// ==================== LIMPAR TEMP ====================
function limparArquivos(arquivos) {
    for (const arq of arquivos) {
        try {
            if (fs.existsSync(arq)) fs.unlinkSync(arq);
        } catch (e) {}
    }
}

// ==================== MENU DE QUANTIDADE ====================
async function enviarMenuQuantidade(sock, chat, msg, query, CONFIG) {
    const texto = `🎨 *PACK DE FIGURINHAS*\n\n🔍 Pesquisa: *${query}*\n\n📌 Quantas figurinhas você quer?`;

    const interactiveMessage = {
        body: { text: texto },
        footer: { text: CONFIG.botNome },
        nativeFlowMessage: {
            buttons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '📦 Escolher quantidade',
                        sections: [
                            {
                                title: 'Quantidade de figurinhas',
                                rows: [
                                    { title: '3️⃣ 3 Figurinhas', description: 'Pack pequeno', id: `pack_3_${query}` },
                                    { title: '🔟 10 Figurinhas', description: 'Pack médio', id: `pack_10_${query}` },
                                    { title: '1️⃣5️⃣ 15 Figurinhas', description: 'Pack grande', id: `pack_15_${query}` }
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

// ==================== COMANDO PRINCIPAL ====================
async function cmdPack(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG) {
    // 🔥 VERIFICA A API
    if (!(await verificarApiConfigurada(CONFIG, chat, sock, msg, enviarResposta, reagir))) return;

    const query = args.join(' ').trim();

    if (!query) {
        await enviarResposta(chat, sock,
            `🎨 *PACK DE FIGURINHAS*\n\n` +
            `📌 Use: ${CONFIG.prefix}pack <pesquisa>\n` +
            `📌 Exemplo: ${CONFIG.prefix}pack naruto`,
            msg
        );
        return;
    }

    await reagir(sock, chat, msg.key.id, '🎨');

    // 🔥 ENVIA O MENU DE QUANTIDADE
    try {
        await enviarMenuQuantidade(sock, chat, msg, query, CONFIG);
    } catch (e) {
        await enviarResposta(chat, sock, `❌ Erro: ${e.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== RESPONDER BOTÃO ====================
async function responderBotaoPack(sock, chat, sender, msg, buttonId, CONFIG, reagir) {
    try {
        if (!buttonId.startsWith('pack_')) return false;

        // 🔥 FORMATO: pack_<quantidade>_<query>
        const semPrefixo = buttonId.replace('pack_', '');
        const primeiroUnderscore = semPrefixo.indexOf('_');
        const quantidade = parseInt(semPrefixo.substring(0, primeiroUnderscore));
        const query = semPrefixo.substring(primeiroUnderscore + 1);

        if (!quantidade || !query) return false;

        // 🔥 AVISA QUE TÁ PROCESSANDO
        await reagir(sock, chat, msg.key.id, '⏳');

        const msgProcessando = await sock.sendMessage(chat, {
            text: `⏳ *Criando pack...*\n\n🔍 Pesquisa: *${query}*\n📦 Figurinhas: *${quantidade}*\n\n📥 Baixando imagens...`
        }, { quoted: msg });

        // 🔥 BUSCA AS IMAGENS
        const imagens = await buscarImagensPinterest(query, quantidade, CONFIG);

        if (imagens.length === 0) {
            await sock.sendMessage(chat, {
                text: `❌ Nenhuma imagem encontrada para: *${query}*`,
                edit: msgProcessando.key
            });
            await reagir(sock, chat, msg.key.id, '❌');
            return true;
        }

        const id = crypto.randomBytes(6).toString('hex');
        const arquivosTemp = [];

        // 🔥 PROCESSA CADA IMAGEM
        let processadas = 0;
        let falhas = 0;

        for (let i = 0; i < imagens.length; i++) {
            const img = imagens[i];

            try {
                // 🔥 ATUALIZA PROGRESSO
                if (i % 3 === 0) {
                    try {
                        await sock.sendMessage(chat, {
                            text: `⏳ *Criando pack...*\n\n🔍 Pesquisa: *${query}*\n📦 Figurinhas: *${quantidade}*\n\n📥 Processando ${i + 1}/${imagens.length}...`,
                            edit: msgProcessando.key
                        });
                    } catch (e) {}
                }

                // 🔥 BAIXA
                const imgPath = path.join(TEMP_DIR, `pack_${id}_${i}.jpg`);
                await baixarImagem(img.url, imgPath);
                arquivosTemp.push(imgPath);

                // 🔥 CONVERTE
                const stickerPath = path.join(TEMP_DIR, `pack_${id}_${i}.webp`);
                await converterParaFigurinha(imgPath, stickerPath);
                arquivosTemp.push(stickerPath);

                // 🔥 LÊ O BUFFER
                const stickerBuffer = fs.readFileSync(stickerPath);

                // 🔥 ENVIA
                await sock.sendMessage(chat, { sticker: stickerBuffer });

                processadas++;

                // 🔥 ESPERA 1 SEGUNDO ENTRE CADA ENVIO (evita flood)
                if (i < imagens.length - 1) {
                    await new Promise(r => setTimeout(r, 1000));
                }

            } catch (e) {
                falhas++;
            }
        }

        // 🔥 LIMPA OS ARQUIVOS TEMPORÁRIOS
        limparArquivos(arquivosTemp);

        // 🔥 MENSAGEM FINAL
        try {
            await sock.sendMessage(chat, {
                text: `✅ *PACK CRIADO!*\n\n📦 Total: ${processadas} figurinhas\n❌ Falhas: ${falhas}\n📌 Pesquisa: *${query}*`,
                edit: msgProcessando.key
            });
        } catch (e) {}

        await reagir(sock, chat, msg.key.id, '✅');
        return true;

    } catch (error) {
        await reagir(sock, chat, msg.key.id, '❌');
        return false;
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdPack,
    responderBotaoPack,
    buscarImagensPinterest,
    baixarImagem,
    converterParaFigurinha
};