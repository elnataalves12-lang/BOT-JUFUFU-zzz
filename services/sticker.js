// ==================== SISTEMA DE STICKER COMPLETO ====================
// services/sticker.js

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const { exec } = require('child_process');
const webp = require('node-webpmux');
const CONFIG = require('../config.js');  

// ==================== CONFIGURAÇÃO ====================
const CONFIG_STICKER = {
    maxVideoDuration: 10,
    maxAttempts: 3,
    qualityImage: 90,
    qualityVideo: 8,
    fps: 15,
    scaleImage: 512,
    scaleVideo: 350,
    tempDir: path.resolve(__dirname, '../temp'),
    packName: "꧁༺ 𝑱𝒖𝒇𝒖𝒇𝒖 𝑩𝑶𝑻 ༻꧂\n✦ 𝒁𝒆𝒏𝒍𝒆𝒔𝒔 𝒁𝒐𝒏𝒆 𝒁𝒆𝒓𝒐 ✦\n𓆩⚡𓆪 𝑰𝒏𝒕𝒆𝒓-𝑲𝒏𝒐𝒕 𓆩⚡𓆪\n✧ 𝑺𝒕𝒊𝒄𝒌𝒆𝒓 𝑷𝒂𝒄𝒌 ✧\n╰┈➤ 𝑱𝒖𝒇𝒖𝒇𝒖 𝑪𝒐𝒎𝒎𝒖𝒏𝒊𝒕𝒚",
    author: "jufufu • +55 91 8445-7350"
};

// ==================== FUNÇÕES AUXILIARES ====================

function getRandomName(extension = '') {
    return `${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
}

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomCategories() {
    const categories = ['😂', '😅', '🤔', '😳', '🙄', '😊', '🤭', '😮', '😏', '👀', '💀', '🔥', '✨', '💅', '😎'];
    const count = Math.floor(Math.random() * 3) + 1;
    const selected = [];
    for (let i = 0; i < count; i++) {
        selected.push(categories[Math.floor(Math.random() * categories.length)]);
    }
    return selected;
}

// ==================== PEGAR NOME DO WHATSAPP ====================
function getUserName(msg, sender) {
    try {
        if (msg?.pushName) {
            const name = String(msg.pushName).trim();
            if (name && !/^[0-9]+$/.test(name) && !name.includes('@')) {
                return name;
            }
        }
        return sender.split('@')[0];
    } catch {
        return 'Usuário';
    }
}

async function addStickerMetadata(media, metadata = {}) {
    const tmpFileIn = path.join(CONFIG_STICKER.tempDir, getRandomName('webp'));
    const tmpFileOut = path.join(CONFIG_STICKER.tempDir, getRandomName('webp'));
    
    try {
        await fsPromises.writeFile(tmpFileIn, media);
        
        const img = new webp.Image();
        const json = {
            "sticker-pack-id": String(getRandomNumber(10000, 99999)),
           "sticker-pack-name": `꧁༺ ${metadata.packName || CONFIG.botNome || "BOT---"} ༻꧂\n✦ 𝒁𝒆𝒏𝒍𝒆𝒔𝒔 𝒁𝒐𝒏𝒆 𝒁𝒆𝒓𝒐 ✦\n𓆩⚡𓆪 𝑰𝒏𝒕𝒆𝒓-𝑲𝒏𝒐𝒕 𓆩⚡𓆪\n✧ 𝑺𝒕𝒊𝒄𝒌𝒆𝒓 𝑷𝒂𝒄𝒌 ✧\n╰┈➤ 𝑪𝒐𝒎𝒎𝒖𝒏𝒊𝒕𝒚`,
            "sticker-pack-publisher": metadata.author || "",  
            emojis: metadata.categories || getRandomCategories()
        };
        
        const exifAttr = Buffer.from([
            0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
            0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x16, 0x00, 0x00, 0x00
        ]);
        
        const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
        const exif = Buffer.concat([exifAttr, jsonBuff]);
        exif.writeUIntLE(jsonBuff.length, 14, 4);
        
        await img.load(tmpFileIn);
        await fsPromises.unlink(tmpFileIn);
        img.exif = exif;
        await img.save(tmpFileOut);
        
        return tmpFileOut;
        
    } catch (err) {
        console.error('❌ Erro ao adicionar metadados:', err.message);
        throw err;
    }
}

// ==================== PROCESSAR IMAGEM ====================

function processarImagem(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const cmd = `ffmpeg -i "${inputPath}" -vf "scale=${CONFIG_STICKER.scaleImage}:${CONFIG_STICKER.scaleImage}:force_original_aspect_ratio=decrease" -f webp -quality ${CONFIG_STICKER.qualityImage} "${outputPath}"`;
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ FFmpeg erro:', stderr);
                reject(new Error(`FFmpeg falhou: ${stderr || error.message}`));
            } else {
                resolve(outputPath);
            }
        });
    });
}

// ==================== PROCESSAR VÍDEO ====================

function processarVideo(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const cmd = `ffmpeg -y -i "${inputPath}" -vf "scale=${CONFIG_STICKER.scaleVideo}:${CONFIG_STICKER.scaleVideo},fps=${CONFIG_STICKER.fps}" -c:v libwebp -loop 0 -quality ${CONFIG_STICKER.qualityVideo} -compression_level 6 -method 6 -preset picture -an -f webp "${outputPath}"`;
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ FFmpeg erro:', stderr);
                reject(new Error(`FFmpeg falhou: ${stderr || error.message}`));
            } else {
                resolve(outputPath);
            }
        });
    });
}

// ==================== DOWNLOAD COM RETRY ====================

async function downloadComRetry(downloadFn, webMessage, maxAttempts = CONFIG_STICKER.maxAttempts) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const result = await downloadFn(webMessage, getRandomName);
            return result;
        } catch (error) {
            lastError = error;
            console.error(`❌ Tentativa ${attempt}/${maxAttempts} falhou:`, error.message);
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            }
        }
    }
    
    throw new Error(`Falha após ${maxAttempts} tentativas: ${lastError?.message || 'Erro desconhecido'}`);
}

// ==================== ENVIAR STICKER COM RETRY ====================

async function enviarStickerComRetry(sendFn, filePath, maxAttempts = CONFIG_STICKER.maxAttempts) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await sendFn(filePath, true);
            return true;
        } catch (error) {
            lastError = error;
            console.error(`❌ Tentativa ${attempt}/${maxAttempts} de envio falhou:`, error.message);
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
    
    throw new Error(`Falha ao enviar após ${maxAttempts} tentativas: ${lastError?.message || 'Erro desconhecido'}`);
}

// ==================== FUNÇÃO PRINCIPAL CREATE STICKER ====================

async function createSticker({
    isImage,
    isVideo,
    downloadImage,
    downloadVideo,
    webMessage,
    sendStickerFromFile,
    userLid,
    msg,  
    metadataCustom = {}
}) {
    // 🔥 VERIFICA SE OS VALORES ESTÃO CORRETOS
    
    if (!isImage && !isVideo) {
        throw new Error("Nenhuma mídia válida foi enviada.");
    }
    
    const outputTempPath = path.join(CONFIG_STICKER.tempDir, getRandomName('webp'));
    let inputPath = null;
    let stickerPath = null;
    
    try {
        // ============================================
        // ===== PROCESSAMENTO DE IMAGEM =====
        // ============================================
        if (isImage) {
            inputPath = await downloadComRetry(downloadImage, webMessage);
            
            if (!fs.existsSync(inputPath)) {
                throw new Error("Arquivo de entrada não foi criado");
            }
            
            await processarImagem(inputPath, outputTempPath);
        }
        
        // ============================================
        // ===== PROCESSAMENTO DE VÍDEO =====
        // ============================================
        else if (isVideo) {
            
            // 🔥 PEGA A DURAÇÃO CORRETAMENTE
            const seconds = webMessage.message?.videoMessage?.seconds ||
                          webMessage.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage?.seconds;
            
            
            if (seconds && seconds > CONFIG_STICKER.maxVideoDuration) {
                throw new Error(`O vídeo tem mais de ${CONFIG_STICKER.maxVideoDuration} segundos! Envie um vídeo menor.`);
            }
            
            inputPath = await downloadComRetry(downloadVideo, webMessage);
            
            if (!fs.existsSync(inputPath)) {
                throw new Error("Arquivo de entrada não foi criado");
            }
            
            await processarVideo(inputPath, outputTempPath);
        }
        
        // ===== VERIFICA SAÍDA =====
        if (!fs.existsSync(outputTempPath)) {
            throw new Error("Arquivo de saída não foi criado pelo FFmpeg");
        }
        
        // ===== ADICIONA METADADOS ====

// 🔥 PEGA O NOME DO BOT DO CONFIG
const nomeBot = CONFIG.botNome || 'BOT---';

// 🔥 PEGA O NICK DA PESSOA
const nickPessoa = metadataCustom.creator || getUserName(msg, userLid);

const metadata = {
    packName: nomeBot,
    author: nickPessoa,
    categories: metadataCustom.categories || getRandomCategories()
};
        
        stickerPath = await addStickerMetadata(
            await fsPromises.readFile(outputTempPath),
            metadata
        );
 
        // ===== ENVIA A FIGURINHA =====
        await enviarStickerComRetry(sendStickerFromFile, stickerPath);
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao criar sticker:', error.message);
        throw error;
        
    } finally {
        // ===== LIMPEZA =====
        const filesToClean = [inputPath, outputTempPath, stickerPath];
        for (const file of filesToClean) {
            if (file && fs.existsSync(file)) {
                try {
                    await fsPromises.unlink(file);
                } catch (e) {
                    console.log('⚠️ Erro ao limpar:', path.basename(file));
                }
            }
        }
    }
}

// ==================== EXPORTAR ====================

module.exports = {
    createSticker,
    addStickerMetadata,
    processarImagem,
    processarVideo,
    getRandomName,
    getRandomNumber,
    getRandomCategories,
    getUserName,
    CONFIG_STICKER
};