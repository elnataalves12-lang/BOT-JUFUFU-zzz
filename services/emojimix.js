// ==================== EMOJIMIX (Emoji Kitchen) ====================
// services/emojimix.js
//
// Combina 2 emojis usando o Emoji Kitchen do Google
// https://www.gstatic.com/android/keyboard/emojikitchen/
//
// Uso:
//   °emojimix 😖 + 💀
//   °emojimix 😖+💀
//   °emojimix 😖 💀
// ============================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

// ==================== TEMP DIR ====================
const TEMP_DIR = path.join(process.cwd(), 'temp', 'emojimix');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ==================== VERSÕES DO EMOJI KITCHEN ====================
// 🔥 Google tem várias versões. Testa as mais recentes primeiro
const VERSOES = [
    '20241023',
    '20240202',
    '20230803',
    '20230301',
    '20220506',
    '20211101',
    '20210831',
    '20210521',
    '20210220',
    '20201201'
];

// ==================== PEGAR CÓDIGO DO EMOJI ====================
function pegarCodigo(emoji) {
    try {
        // 🔥 Pega o codePoint e converte pra hex
        const codePoint = emoji.codePointAt(0);
        return codePoint.toString(16);
    } catch (e) {
        return null;
    }
}

// ==================== EXTRAIR EMOJIS DA MENSAGEM ====================
function extrairEmojis(texto) {
    if (!texto) return [];

    // 🔥 Regex pra pegar emojis (inclui emojis compostos)
    const regex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
    const emojis = [];

    const matches = texto.match(regex);

    if (!matches) return [];

    for (const m of matches) {
        // 🔥 Ignora números e # que o regex pega como emoji
        if (/[\d#*]/.test(m)) continue;

        // 🔥 Ignora variações que são combinação (skin tone, ZWJ)
        if (m.length > 4) continue;

        emojis.push(m);
    }

    return emojis;
}

// ==================== TENTAR BAIXAR DO GOOGLE ====================
async function tentarBaixar(codigo1, codigo2) {
    // 🔥 Tenta várias versões
    for (const versao of VERSOES) {
        const url = `https://www.gstatic.com/android/keyboard/emojikitchen/${versao}/u${codigo1}/u${codigo1}_u${codigo2}.png`;

        try {
            const res = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 8000,
                validateStatus: (s) => s === 200
            });

            if (res.data && res.data.length > 1000) {
                return {
                    buffer: Buffer.from(res.data),
                    url: url,
                    versao: versao
                };
            }
        } catch (e) {
            // 🔥 Se deu erro, tenta a próxima versão
            continue;
        }
    }

    return null;
}

// ==================== CONVERTER PNG → FIGURINHA ====================
async function converterParaFigurinha(pngBuffer) {
    const id = crypto.randomBytes(6).toString('hex');
    const inputPath = path.join(TEMP_DIR, `mix_${id}.png`);
    const outputPath = path.join(TEMP_DIR, `mix_${id}.webp`);

    try {
        fs.writeFileSync(inputPath, pngBuffer);

        // 🔥 CONVERTE COM cwebp (512x512, qualidade 90)
        await execPromise(`cwebp -q 90 -resize 512 512 -mt "${inputPath}" -o "${outputPath}"`);

        if (!fs.existsSync(outputPath)) {
            throw new Error('cwebp não gerou o arquivo');
        }

        const stats = fs.statSync(outputPath);
        if (stats.size < 100) {
            throw new Error('Figurinha inválida');
        }

        const buffer = fs.readFileSync(outputPath);

        // 🔥 Limpa
        try { fs.unlinkSync(inputPath); } catch (e) {}
        try { fs.unlinkSync(outputPath); } catch (e) {}

        return buffer;

    } catch (error) {
        try { fs.unlinkSync(inputPath); } catch (e) {}
        try { fs.unlinkSync(outputPath); } catch (e) {}
        throw error;
    }
}

// ==================== ADICIONAR EXIF (nome do pack) ====================
async function addExif(stickerBuffer, packName, author) {
    try {
        const webpmux = require('node-webpmux');

        const json = {
            'sticker-pack-id': `com.jufufu.emojimix.${Date.now()}`,
            'sticker-pack-name': packName,
            'sticker-pack-publisher': author,
            'emojis': ['🎨']
        };

        const exifAttr = Buffer.from([
            0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
            0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x16, 0x00, 0x00, 0x00
        ]);

        const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
        const exif = Buffer.concat([exifAttr, jsonBuff]);
        exif.writeUIntLE(jsonBuff.length, 14, 4);

        const img = new webpmux.Image();
        await img.load(stickerBuffer);
        img.exif = exif;
        const resultBuffer = await img.save(null);

        if (!resultBuffer || resultBuffer.length < 100) {
            return stickerBuffer;
        }

        return resultBuffer;

    } catch (error) {
        return stickerBuffer;
    }
}

// ==================== COMANDO PRINCIPAL ====================
async function cmdEmojiMix(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG) {
    // 🔥 PEGA O TEXTO (args ou mensagem respondida)
    let texto = args.join(' ').trim();

    if (!texto) {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
            texto = quoted.conversation ||
                    quoted.extendedTextMessage?.text ||
                    '';
        }
    }

    if (!texto) {
        await enviarResposta(chat, sock,
            `🎨 *EMOJIMIX*\n\n` +
            `📌 Use: ${CONFIG.prefix}emojimix <emoji1> <emoji2>\n` +
            `📌 Exemplo: ${CONFIG.prefix}emojimix 😖 💀\n\n` +
            `💡 Junta 2 emojis usando o Emoji Kitchen do Google!`,
            msg
        );
        return;
    }

    // 🔥 EXTRAI OS EMOJIS
    const emojis = extrairEmojis(texto);

    if (emojis.length < 2) {
        await enviarResposta(chat, sock,
            `❌ Preciso de *2 emojis*!\n\n` +
            `📌 Exemplo: ${CONFIG.prefix}emojimix 😖 💀`,
            msg
        );
        await reagir(sock, chat, msg.key.id, '❌');
        return;
    }

    const e1 = emojis[0];
    const e2 = emojis[1];

    const code1 = pegarCodigo(e1);
    const code2 = pegarCodigo(e2);

    if (!code1 || !code2) {
        await enviarResposta(chat, sock, '❌ Emojis inválidos!', msg);
        await reagir(sock, chat, msg.key.id, '❌');
        return;
    }

    await reagir(sock, chat, msg.key.id, '🎨');

    // 🔥 TENTA AS 2 ORDENS
    try {
        let resultado = await tentarBaixar(code1, code2);

        if (!resultado) {
            // 🔥 Tenta a ordem inversa
            resultado = await tentarBaixar(code2, code1);
        }

        if (!resultado) {
            await enviarResposta(chat, sock,
                `❌ *Combinação não encontrada!*\n\n` +
                `📌 Nem toda mistura existe no Emoji Kitchen.\n` +
                `🎨 Tente outra combinação.`,
                msg
            );
            await reagir(sock, chat, msg.key.id, '❌');
            return;
        }

        // 🔥 CONVERTE PRA FIGURINHA
        const stickerBuffer = await converterParaFigurinha(resultado.buffer);

        // 🔥 ADICIONA EXIF (nome do pack)
        const nomePack = `Mix ${e1}${e2}`;
        const autor = CONFIG.botNome || 'Jufufu Bot';
        const stickerComExif = await addExif(stickerBuffer, nomePack, autor);

        // 🔥 ENVIA
        await sock.sendMessage(chat, {
            sticker: stickerComExif
        }, { quoted: msg });

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdEmojiMix,
    extrairEmojis,
    pegarCodigo,
    tentarBaixar,
    converterParaFigurinha,
    addExif
};