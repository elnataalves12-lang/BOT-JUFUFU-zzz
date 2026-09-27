// ==================== STICKER COM NOME DO BOT E NICK ====================
// services/stickerGif.js
//
// Cria figurinhas mantendo o formato original (sem preencher)
// PackName = Nome do Bot | Author = Nick da pessoa
// ============================================================

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const { exec } = require('child_process');
const webp = require('node-webpmux');

// ==================== CONFIGURAÇÃO ====================
const TEMP_DIR = path.resolve(__dirname, '../temp');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ==================== FUNÇÕES AUXILIARES ====================

function getRandomName(extension = '') {
    return `${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
}

// ==================== PEGAR NOME DO WHATSAPP ====================

function getUserName(msg, sender) {
    try {
        // 🔥 PRIORIDADE 1: pushName do WhatsApp
        if (msg?.pushName) {
            const name = String(msg.pushName).trim();
            if (name && !/^[0-9]+$/.test(name) && !name.includes('@')) {
                return name;
            }
        }
        
        // 🔥 PRIORIDADE 2: Fallback para o número
        return sender.split('@')[0];
    } catch {
        return 'Usuário';
    }
}

// ==================== ADICIONAR METADADOS ====================

async function addStickerMetadata(webpBuffer, packName, author) {
    try {
        const inputPath = path.join(TEMP_DIR, getRandomName('webp'));
        const outputPath = path.join(TEMP_DIR, getRandomName('webp'));
        
        await fsPromises.writeFile(inputPath, webpBuffer);
        
        // 🔥 CRIA O EXIF
        const json = {
            "sticker-pack-id": `com.jufufu.sticker.${Date.now()}`,
            "sticker-pack-name": packName || 'Figurinha',
            "sticker-pack-publisher": author || '',
            "emojis": ["✨"]
        };
        
        const exifAttr = Buffer.from([
            0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
            0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x16, 0x00, 0x00, 0x00
        ]);
        
        const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
        const exif = Buffer.concat([exifAttr, jsonBuff]);
        exif.writeUIntLE(jsonBuff.length, 14, 4);
        
        const img = new webp.Image();
        await img.load(inputPath);
        img.exif = exif;
        await img.save(outputPath);
        
        const result = await fsPromises.readFile(outputPath);
        
        // LIMPEZA
        try { await fsPromises.unlink(inputPath); } catch (e) {}
        try { await fsPromises.unlink(outputPath); } catch (e) {}
        
        return result;
        
    } catch (error) {
        console.error('❌ Erro ao adicionar metadados:', error.message);
        return webpBuffer;
    }
}

// ==================== PROCESSAR IMAGEM (SEM PREENCHER) ====================

function processarImagem(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        // 🔥 MANTÉM O FORMATO ORIGINAL - SEM PAD, SEM CROP
        const cmd = `ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease" -f webp -quality 90 -compression_level 6 "${outputPath}" -y`;
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ FFmpeg erro imagem:', stderr);
                reject(new Error(`FFmpeg falhou: ${stderr || error.message}`));
            } else {
                resolve(outputPath);
            }
        });
    });
}

// ==================== PROCESSAR VÍDEO (SEM PREENCHER) ====================

function processarVideo(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        // 🔥 MANTÉM O FORMATO ORIGINAL - SEM PAD, SEM CROP
        const cmd = `ffmpeg -y -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15" -c:v libwebp -loop 0 -quality 80 -compression_level 6 -preset default -an -f webp "${outputPath}"`;
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ FFmpeg erro vídeo:', stderr);
                reject(new Error(`FFmpeg falhou: ${stderr || error.message}`));
            } else {
                resolve(outputPath);
            }
        });
    });
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function cmdGifSticker(sock, chat, sender, msg, enviarResposta, reagir, downloadMediaMessage, P, CONFIG) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    if (!quoted || (!quoted.imageMessage && !quoted.videoMessage)) {
        await enviarResposta(chat, sock, 
            `📌 Responda a uma imagem ou vídeo (até 10s) com °gif`,
            msg
        );
        return;
    }
    
    const isImage = !!quoted.imageMessage;
    const isVideo = !!quoted.videoMessage;
    
    if (isVideo) {
        const seconds = quoted.videoMessage?.seconds;
        if (seconds > 10) {
            await enviarResposta(chat, sock, '⚠️ O vídeo tem mais de 10 segundos!', msg);
            return;
        }
    }
    
    await reagir(sock, chat, msg.key.id, '⏳');
    
    const outputTempPath = path.join(TEMP_DIR, getRandomName('webp'));
    let inputPath = null;
    
    try {
        // 🔥 BAIXA A MÍDIA
        const target = { message: quoted, key: msg.key };
        const buffer = await downloadMediaMessage(target, 'buffer', {}, { logger: P({ level: 'silent' }) });
        
        if (!buffer || buffer.length < 100) {
            throw new Error('Mídia inválida!');
        }
        
        // 🔥 SALVA O INPUT
        const extension = isImage ? 'png' : 'mp4';
        inputPath = path.join(TEMP_DIR, getRandomName(extension));
        await fsPromises.writeFile(inputPath, buffer);
        
        // 🔥 PROCESSA
        if (isImage) {
            await processarImagem(inputPath, outputTempPath);
        } else {
            await processarVideo(inputPath, outputTempPath);
        }
        
        // 🔥 VERIFICA SAÍDA
        if (!fs.existsSync(outputTempPath)) {
            throw new Error('Arquivo de saída não foi criado');
        }
        
        // 🔥 LÊ O WEBP
        const webpBuffer = await fsPromises.readFile(outputTempPath);
        
        // 🔥 PEGA O NOME DO BOT E O NICK DA PESSOA
        const nomeBot = CONFIG.botNome || 'JUFUFU Bot';
        const nickPessoa = getUserName(msg, sender);
        
        
        // 🔥 ADICIONA METADADOS
        const stickerBuffer = await addStickerMetadata(webpBuffer, nomeBot, nickPessoa);
        
        // 🔥 ENVIA O STICKER
        await sock.sendMessage(chat, {
            sticker: stickerBuffer
        }, { quoted: msg });
        
        await reagir(sock, chat, msg.key.id, '✅');
        
    } catch (error) {
        console.error('❌ Erro na figurinha:', error.message);
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    } finally {
        // 🔥 LIMPEZA
        const filesToClean = [inputPath, outputTempPath];
        for (const file of filesToClean) {
            if (file && fs.existsSync(file)) {
                try {
                    await fsPromises.unlink(file);
                } catch (e) {}
            }
        }
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdGifSticker,
    getUserName,
    addStickerMetadata
};