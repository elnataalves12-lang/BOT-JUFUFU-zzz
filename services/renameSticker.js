// ==================== SISTEMA DE RENOMEAR FIGURINHA ====================
// services/renameSticker.js
//
// APENAS RENOMEIA FIGURINHAS EXISTENTES
// NÃO CRIA FIGURINHAS NOVAS
// ============================================================

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

// ==================== CONFIGURAÇÃO ====================
const TEMP_DIR = path.resolve(__dirname, '../temp');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ==================== FUNÇÕES AUXILIARES ====================

function getRandomName(extension = '') {
    return `${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
}

// ==================== ADICIONAR METADADOS (EXIF) ====================

async function addStickerMetadata(webpBuffer, packName, author = '') {
    try {
        const inputPath = path.join(TEMP_DIR, getRandomName('webp'));
        const outputPath = path.join(TEMP_DIR, getRandomName('webp'));
        
        await fsPromises.writeFile(inputPath, webpBuffer);
        
        // 🔥 CRIA O EXIF COM O NOVO NOME
        const json = {
            "sticker-pack-id": `com.jufufu.rename.${Date.now()}`,
            "sticker-pack-name": packName,
            "emojis": ["✨"]
        };
        
        // 🔥 SÓ ADICIONA O AUTOR SE EXISTIR
        if (author && author.trim() !== '') {
            json["sticker-pack-publisher"] = author;
        }
        
        const exifAttr = Buffer.from([
            0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
            0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x16, 0x00, 0x00, 0x00
        ]);
        
        const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
        const exif = Buffer.concat([exifAttr, jsonBuff]);
        exif.writeUIntLE(jsonBuff.length, 14, 4);
        
        // 🔥 USA O node-webpmux PARA ADICIONAR EXIF
        try {
            const webp = require('node-webpmux');
            const img = new webp.Image();
            await img.load(inputPath);
            img.exif = exif;
            await img.save(outputPath);
            
            const result = await fsPromises.readFile(outputPath);
            
            // LIMPEZA
            try { await fsPromises.unlink(inputPath); } catch (e) {}
            try { await fsPromises.unlink(outputPath); } catch (e) {}
            
            return result;
        } catch (webpError) {
            console.log('⚠️ node-webpmux falhou:', webpError.message);
            try { await fsPromises.unlink(inputPath); } catch (e) {}
            try { await fsPromises.unlink(outputPath); } catch (e) {}
            return webpBuffer;
        }
        
    } catch (error) {
        console.error('❌ Erro ao renomear:', error.message);
        return webpBuffer;
    }
}

// ==================== FUNÇÃO PRINCIPAL: RENOMEAR ====================

async function renomearFigurinha(stickerBuffer, nome, autor = '') {
    // 🔥 VALIDAÇÕES
    if (!stickerBuffer || stickerBuffer.length < 100) {
        throw new Error('Figurinha inválida!');
    }
    
    if (!nome || nome.trim() === '') {
        throw new Error('Digite um nome para a figurinha!');
    }

    
    // 🔥 ADICIONA O NOVO METADADO
    const novoSticker = await addStickerMetadata(stickerBuffer, nome.trim(), autor);
    
    if (!novoSticker || novoSticker.length < 100) {
        throw new Error('Falha ao renomear figurinha!');
    }
    
    return novoSticker;
}

// ==================== EXPORTAR ====================

module.exports = {
    renomearFigurinha,
    addStickerMetadata,
};