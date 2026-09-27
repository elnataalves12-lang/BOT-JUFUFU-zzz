// ==================== SISTEMA DE ÁUDIO SIMPLES ====================
// services/audioEffects.js

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// ==================== CONFIGURAÇÃO ====================
const TEMP_DIR = path.join(process.cwd(), 'temp', 'audio_effects');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ==================== FUNÇÕES AUXILIARES ====================

function formatarTempo(segundos) {
    if (!segundos || isNaN(segundos)) return '0:00';
    const min = Math.floor(segundos / 60);
    const sec = Math.floor(segundos % 60);
    return `${min}:${String(sec).padStart(2, '0')}`;
}

function formatarTamanho(bytes) {
    if (!bytes) return 'Desconhecido';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(1) + ' GB';
}

// ==================== MAPA DE EFEITOS ====================

function getFiltroEfeito(efeito) {
    const filtros = {
        // ===== VOZ/PITCH =====
        'grave': 'asetrate=44100*0.7,aresample=44100,volume=1.5',
        'grave2': 'asetrate=44100*0.6,aresample=44100,bass=g=20,volume=2',
        'agudo': 'asetrate=44100*1.4,aresample=44100,volume=1.3',
        'agudo2': 'asetrate=44100*1.6,aresample=44100,atempo=0.85,volume=1.4',
        'demonio': 'asetrate=44100*0.6,aresample=44100,aecho=0.8:0.9:500:0.2,volume=1.8',
        'demonio2': 'asetrate=44100*0.5,aresample=44100,aecho=0.8:0.9:300|600:0.4|0.2,volume=2',
        'anjo': 'asetrate=44100*1.5,aresample=44100,atempo=0.75,treble=g=15,volume=1.5',
        'chipmunk': 'asetrate=44100*1.8,aresample=44100,atempo=0.7,volume=1.5',

        // ===== VELOCIDADE =====
        'lento': 'atempo=0.7,aresample=44100',
        'lento2': 'atempo=0.5,aresample=44100',
        'acelerar': 'atempo=1.5,aresample=44100',
        'acelerar2': 'atempo=2.0,aresample=44100',

        // ===== EFEITOS DE ÁUDIO =====
        'eco': 'aecho=0.8:0.9:1000:0.3',
        'eco2': 'aecho=0.9:0.9:1000|500|2000:0.5|0.3|0.2',
        'reverso': 'areverse',
        'reverb': 'aecho=0.9:0.88:80|160|320|640:0.8|0.6|0.4|0.2',
        'caverna': 'aecho=0.8:0.9:1000:0.6,volume=1.5',

        // ===== ROBÔ =====
        'robot': 'aecho=0.5:0.5:50:0.5,asetrate=44100*0.9,aresample=44100',
        'robot2': 'chorus=0.7:0.9:50|60|40:0.4|0.32|0.3:0.25|0.4|0.3:2|2.3|1.3,asetrate=44100*1.2,aresample=44100,volume=1.5',

        // ===== RÁDIO/TELEFONE =====
        'radio': 'highpass=f=300,lowpass=f=3000,volume=1.8',
        'radio2': 'highpass=f=450,lowpass=f=2800,aecho=0.6:0.5:120:0.25,volume=2',
        'telefone': 'highpass=f=400,lowpass=f=3000,acompressor=threshold=-15dB:ratio=6,volume=1.8',
        'walkie': 'highpass=f=400,lowpass=f=3000,aecho=0.6:0.5:150:0.25,volume=2',

        // ===== MEGAFONE =====
        'megafone': 'highpass=f=350,lowpass=f=4200,volume=2.5',
        'megafone2': 'highpass=f=300,lowpass=f=4500,aecho=0.8:0.9:500|1000:0.3|0.2,volume=2.5',

        // ===== GLITCH/BUG =====
        'glitch': 'acrusher=bits=4:mode=lin,aresample=8000,atempo=1.3,volume=2',
        'glitch2': 'acrusher=bits=3:mode=lin,aresample=6000,atempo=1.5,aecho=0.7:0.7:300|600:0.3|0.2,volume=2.5',
        'bugado': 'acrusher=bits=6:mode=lin,aresample=16000,atempo=0.5,volume=1.8',

        // ===== DEEP FRY =====
        'fry': 'acrusher=bits=4:mode=lin,volume=2.8,highpass=f=180,lowpass=f=6000',
        'fry2': 'acrusher=bits=3:mode=lin,volume=3,highpass=f=150,lowpass=f=5000,aecho=0.6:0.5:200:0.2',

        // ===== ZUMBI =====
        'zumbi': 'atempo=0.5,aresample=44100,aecho=0.8:0.7:300:0.3,volume=1.8',

        // ===== 8D/ESPACIAL =====
        '8d': 'extrastereo=2,apulsator=hz=0.08,volume=1.5',
        'space': 'flanger=delay=30:depth=5:regen=0.8:width=0.8:speed=0.5,aecho=0.8:0.9:1000|2000:0.4|0.2,volume=1.8',
        'fantasma': 'aecho=0.9:0.8:120|240|480:0.7|0.5|0.3,volume=1.8',

        // ===== DISTORÇÃO =====
        'distorcao': 'overdrive=20:6:0.05,volume=2',
        'metal': 'overdrive=35:8:0.1,highpass=f=200,volume=2.5',

        // ===== RETRÔ =====
        'vhs': 'highpass=f=200,lowpass=f=4000,aecho=0.7:0.7:500|1000:0.3|0.15,volume=2',
        'gameboy': 'acrusher=bits=4:mode=lin,aresample=8000,highpass=f=300,lowpass=f=4000,volume=1.5',
        'cassete': 'highpass=f=200,lowpass=f=3500,aecho=0.6:0.6:300|600:0.3|0.15,volume=1.8',

        // ===== SHOW/AO VIVO =====
        'show': 'aecho=0.8:0.9:500|1000|2000:0.4|0.3|0.2,volume=2',
        'estadio': 'aecho=0.9:0.9:1000|2000|4000:0.5|0.3|0.15,volume=2.5',

        // ===== ESTOURAR/VOLUME =====
        'estourar': 'volume=15,acompressor=threshold=-10dB:ratio=10',
        'estourar2': 'volume=20,acompressor=threshold=-8dB:ratio=12,highpass=f=100,lowpass=f=8000',

        // ===== NIGHTCORE =====
        'nightcore': 'asetrate=44100*1.25,aresample=44100,atempo=1.1,treble=g=10,volume=1.5',
        'nightcore2': 'asetrate=44100*1.35,aresample=44100,atempo=1.05,treble=g=15,volume=1.6',

        // ===== PITCH =====
        'pitch': 'asetrate=44100*0.7,aresample=44100,volume=1.5',
        'pitch2': 'asetrate=44100*0.55,aresample=44100,volume=1.8'
    };

    return filtros[efeito] || null;
}

// ==================== LISTA DE EFEITOS ====================

const EFEITOS = {
    // VOZ/PITCH
    'grave': { nome: 'Grave', emoji: '🔊', descricao: 'Voz mais grave' },
    'grave2': { nome: 'Grave Pesado', emoji: '🎵', descricao: 'Voz extremamente grave' },
    'agudo': { nome: 'Agudo', emoji: '🔊', descricao: 'Voz mais aguda' },
    'agudo2': { nome: 'Agudo Extremo', emoji: '🐿️', descricao: 'Voz extremamente aguda' },
    'demonio': { nome: 'Demônio', emoji: '👹', descricao: 'Voz demoníaca' },
    'demonio2': { nome: 'Demônio Pesado', emoji: '😈', descricao: 'Voz demoníaca pesada' },
    'anjo': { nome: 'Anjo', emoji: '👼', descricao: 'Voz angelical' },
    'chipmunk': { nome: 'Chipmunk', emoji: '🐿️', descricao: 'Voz de esquilo' },

    // VELOCIDADE
    'lento': { nome: 'Lento', emoji: '🐢', descricao: 'Áudio mais lento' },
    'lento2': { nome: 'Lento Extremo', emoji: '🦥', descricao: 'Áudio extremamente lento' },
    'acelerar': { nome: 'Acelerar', emoji: '🐇', descricao: 'Áudio mais rápido' },
    'acelerar2': { nome: 'Acelerar 2x', emoji: '⚡', descricao: 'Áudio 2x mais rápido' },

    // EFEITOS DE ÁUDIO
    'eco': { nome: 'Eco', emoji: '🗣️', descricao: 'Adiciona eco' },
    'eco2': { nome: 'Eco Forte', emoji: '🔊', descricao: 'Eco múltiplo' },
    'reverso': { nome: 'Reverso', emoji: '🔄', descricao: 'Áudio ao contrário' },
    'reverb': { nome: 'Reverb', emoji: '⛪', descricao: 'Reverberação' },
    'caverna': { nome: 'Caverna', emoji: '🕳️', descricao: 'Som de caverna' },

    // ROBÔ
    'robot': { nome: 'Robô', emoji: '🤖', descricao: 'Voz robótica' },
    'robot2': { nome: 'Robô Forte', emoji: '🦾', descricao: 'Voz robótica forte' },

    // RÁDIO/TELEFONE
    'radio': { nome: 'Rádio', emoji: '📻', descricao: 'Efeito de rádio' },
    'radio2': { nome: 'Rádio Antigo', emoji: '📻', descricao: 'Rádio com chiado' },
    'telefone': { nome: 'Telefone', emoji: '📞', descricao: 'Efeito de telefone' },
    'walkie': { nome: 'Walkie Talkie', emoji: '📻', descricao: 'Rádio comunicador' },

    // MEGAFONE
    'megafone': { nome: 'Megafone', emoji: '📢', descricao: 'Voz amplificada' },
    'megafone2': { nome: 'Megafone Forte', emoji: '📣', descricao: 'Megafone potente' },

    // GLITCH/BUG
    'glitch': { nome: 'Glitch', emoji: '💥', descricao: 'Áudio corrompido' },
    'glitch2': { nome: 'Glitch Extremo', emoji: '🤯', descricao: 'Áudio destruído' },
    'bugado': { nome: 'Bugado', emoji: '🐛', descricao: 'Áudio com falhas' },

    // DEEP FRY
    'fry': { nome: 'Deep Fry', emoji: '🔥', descricao: 'Áudio "frito"' },
    'fry2': { nome: 'Deep Fry 2026', emoji: '💀', descricao: 'Áudio super frito' },

    // ZUMBI
    'zumbi': { nome: 'Zumbi', emoji: '🧟', descricao: 'Voz de zumbi' },

    // 8D/ESPACIAL
    '8d': { nome: '8D Áudio', emoji: '🌌', descricao: 'Som girando (use fones)' },
    'space': { nome: 'Espaço', emoji: '🚀', descricao: 'Efeito espacial' },
    'fantasma': { nome: 'Fantasma', emoji: '👻', descricao: 'Áudio fantasmagórico' },

    // DISTORÇÃO
    'distorcao': { nome: 'Distorção', emoji: '🎸', descricao: 'Guitarra distorcida' },
    'metal': { nome: 'Metal', emoji: '🤘', descricao: 'Metal pesado' },

    // RETRÔ
    'vhs': { nome: 'VHS', emoji: '📼', descricao: 'Fita VHS antiga' },
    'gameboy': { nome: 'Game Boy', emoji: '🎮', descricao: 'Som 8-bit' },
    'cassete': { nome: 'Cassete', emoji: '📻', descricao: 'Fita cassete' },

    // SHOW/AO VIVO
    'show': { nome: 'Show ao Vivo', emoji: '🎤', descricao: 'Concerto ao vivo' },
    'estadio': { nome: 'Estádio', emoji: '🏟️', descricao: 'Estádio lotado' },

    // ESTOURAR/VOLUME
    'estourar': { nome: 'Estourar', emoji: '💥', descricao: 'Áudio estourado' },
    'estourar2': { nome: 'Estourar 2', emoji: '💀', descricao: 'Áudio super estourado' },

    // NIGHTCORE
    'nightcore': { nome: 'Nightcore', emoji: '🎵', descricao: 'Nightcore clássico' },
    'nightcore2': { nome: 'Nightcore+', emoji: '⚡', descricao: 'Nightcore acelerado' },

    // PITCH
    'pitch': { nome: 'Pitch Grave', emoji: '🎵', descricao: 'Tom grave' },
    'pitch2': { nome: 'Pitch Grave+', emoji: '🎵', descricao: 'Tom extremamente grave' }
};

// ==================== FUNÇÃO PRINCIPAL ====================

async function aplicarEfeitoAudio(buffer, efeito) {
    const timestamp = Date.now();
    const inputPath = path.join(TEMP_DIR, `input_${timestamp}.ogg`);
    const outputPath = path.join(TEMP_DIR, `output_${timestamp}.ogg`);

    // Salva áudio original
    fs.writeFileSync(inputPath, buffer);

    const filtro = getFiltroEfeito(efeito);
    if (!filtro) {
        throw new Error(`Efeito "${efeito}" não encontrado`);
    }

    // 🔥 ALTA QUALIDADE: 128kbps, 48kHz, Estéreo
    const cmd = `ffmpeg -i "${inputPath}" -filter:a "${filtro}" -c:a libopus -b:a 128k -ar 48000 -ac 2 -y "${outputPath}"`;

    await new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Falha ao aplicar efeito: ${stderr || error.message}`));
            } else {
                resolve();
            }
        });
    });

    const outputBuffer = fs.readFileSync(outputPath);

    // Limpeza
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    return outputBuffer;
}

// ==================== FUNÇÃO PARA PROCESSAR NO BOT ====================

async function processarAudio(chat, sock, msg, efeitoNome, sender, enviarResposta, reagir, downloadMediaMessage, P, CONFIG) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) {
        await enviarResposta(chat, sock, '⚠️ Responda a um áudio, vídeo ou arquivo MP3!', msg);
        return;
    }

    const isAudio = !!quoted.audioMessage;
    const isVideo = !!quoted.videoMessage;
    const isDocument = !!quoted.documentMessage;
    const isImage = !!quoted.imageMessage;

    if (!isAudio && !isVideo && !isDocument && !isImage) {
        await enviarResposta(chat, sock, '⚠️ Responda a um áudio, vídeo ou arquivo MP3!', msg);
        return;
    }

    const efeitoInfo = EFEITOS[efeitoNome];
    if (!efeitoInfo) {
        const lista = Object.keys(EFEITOS).join(', ');
        await enviarResposta(chat, sock, `❌ Efeito "${efeitoNome}" não existe!\n📌 Efeitos disponíveis: ${lista}`, msg);
        return;
    }

    await enviarResposta(chat, sock, `🎛️ Aplicando: ${efeitoInfo.emoji} ${efeitoInfo.nome}...`, msg);
    await reagir(sock, chat, msg.key.id, '⏳');

    try {
        const target = { message: quoted, key: msg.key };
        const buffer = await downloadMediaMessage(target, 'buffer', {}, { logger: P({ level: 'silent' }) });

        // Se for vídeo, converte para áudio primeiro
        let audioBuffer = buffer;
        if (isVideo || isImage) {
            // Converte vídeo para áudio temporariamente
            const tempInput = path.join(TEMP_DIR, `video_${Date.now()}.mp4`);
            const tempOutput = path.join(TEMP_DIR, `audio_${Date.now()}.ogg`);
            
            fs.writeFileSync(tempInput, buffer);
            
            const cmd = `ffmpeg -i "${tempInput}" -vn -c:a libopus -b:a 128k -ar 48000 -ac 2 -y "${tempOutput}"`;
            await new Promise((resolve, reject) => {
                exec(cmd, (error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });
            
            audioBuffer = fs.readFileSync(tempOutput);
            fs.unlinkSync(tempInput);
            fs.unlinkSync(tempOutput);
        }

        // Aplica o efeito
        const resultBuffer = await aplicarEfeitoAudio(audioBuffer, efeitoNome);

        // Pega duração
        let duracao = '0:00';
        try {
            const tempFile = path.join(TEMP_DIR, `temp_${Date.now()}.ogg`);
            fs.writeFileSync(tempFile, resultBuffer);
            const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempFile}"`);
            duracao = formatarTempo(parseFloat(stdout));
            fs.unlinkSync(tempFile);
        } catch (e) {}

        const legenda = `╭━━━━━━━━━━━━━⬢
┃ 🎛️ ${efeitoInfo.emoji} ${efeitoInfo.nome}
┃ 📝 ${efeitoInfo.descricao}
┃ ⏱️ ${duracao}
┃ 📦 ${formatarTamanho(resultBuffer.length)}
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

        await sock.sendMessage(chat, {
            audio: resultBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        }, { quoted: msg });

        await sock.sendMessage(chat, { text: legenda }, { quoted: msg });

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        await enviarResposta(chat, sock, `❌ ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== CONVERTER VÍDEO PARA ÁUDIO ====================

async function cmdVideoToAudio(chat, sock, msg, sender, enviarResposta, reagir, downloadMediaMessage, P, CONFIG) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) {
        await enviarResposta(chat, sock, '⚠️ Responda a um vídeo!', msg);
        return;
    }

    const isVideo = !!quoted.videoMessage;
    const isImage = !!quoted.imageMessage;

    if (!isVideo && !isImage) {
        await enviarResposta(chat, sock, '⚠️ Responda a um vídeo ou imagem!', msg);
        return;
    }

    await enviarResposta(chat, sock, '🎵 Convertendo vídeo para áudio...', msg);
    await reagir(sock, chat, msg.key.id, '⏳');

    try {
        const target = { message: quoted, key: msg.key };
        const buffer = await downloadMediaMessage(target, 'buffer', {}, { logger: P({ level: 'silent' }) });

        const tempInput = path.join(TEMP_DIR, `video_${Date.now()}.mp4`);
        const tempOutput = path.join(TEMP_DIR, `audio_${Date.now()}.ogg`);
        
        fs.writeFileSync(tempInput, buffer);
        
        const cmd = `ffmpeg -i "${tempInput}" -vn -c:a libopus -b:a 128k -ar 48000 -ac 2 -y "${tempOutput}"`;
        await new Promise((resolve, reject) => {
            exec(cmd, (error) => {
                if (error) reject(error);
                else resolve();
            });
        });
        
        const audioBuffer = fs.readFileSync(tempOutput);
        
        let duracao = '0:00';
        try {
            const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempOutput}"`);
            duracao = formatarTempo(parseFloat(stdout));
        } catch (e) {}

        const legenda = `╭━━━━━━━━━━━━━⬢
┃ 🎵 ÁUDIO EXTRAÍDO
┃ ⏱️ ${duracao}
┃ 📦 ${formatarTamanho(audioBuffer.length)}
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

        await sock.sendMessage(chat, {
            audio: audioBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        }, { quoted: msg });

        await sock.sendMessage(chat, { text: legenda }, { quoted: msg });

        fs.unlinkSync(tempInput);
        fs.unlinkSync(tempOutput);

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        await enviarResposta(chat, sock, `❌ ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== LISTAR EFEITOS ====================

async function cmdListarEfeitos(chat, sock, msg, enviarResposta, CONFIG) {
    let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🎛️ EFEITOS DE ÁUDIO
╰━━━━━━━━━━━━━━━━━━━━━⬢\n\n`;

    const categorias = {
        '🔊 Voz/Pitch': ['grave', 'grave2', 'agudo', 'agudo2', 'demonio', 'demonio2', 'anjo', 'chipmunk'],
        '🐢 Velocidade': ['lento', 'lento2', 'acelerar', 'acelerar2'],
        '🗣️ Eco/Reverb': ['eco', 'eco2', 'reverso', 'reverb', 'caverna'],
        '🤖 Robô': ['robot', 'robot2'],
        '📻 Rádio': ['radio', 'radio2', 'telefone', 'walkie'],
        '📢 Megafone': ['megafone', 'megafone2'],
        '💥 Glitch': ['glitch', 'glitch2', 'bugado'],
        '🔥 Deep Fry': ['fry', 'fry2'],
        '🧟 Zumbi': ['zumbi'],
        '🌌 Espacial': ['8d', 'space', 'fantasma'],
        '🎸 Distorção': ['distorcao', 'metal'],
        '🎮 Retrô': ['vhs', 'gameboy', 'cassete'],
        '🎤 Ao Vivo': ['show', 'estadio'],
        '💥 Estourar': ['estourar', 'estourar2'],
        '🎵 Nightcore': ['nightcore', 'nightcore2'],
        '🎵 Pitch': ['pitch', 'pitch2']
    };

    for (const [categoria, chaves] of Object.entries(categorias)) {
        texto += `┃ 📂 ${categoria}\n`;
        for (const chave of chaves) {
            if (EFEITOS[chave]) {
                texto += `┃   ${EFEITOS[chave].emoji} °${chave} - ${EFEITOS[chave].nome}\n`;
            }
        }
        texto += `┃ ──────────────────────────\n`;
    }

    texto += `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📌 Use: °audio <efeito> (respondendo áudio/vídeo)
┃ 📌 Exemplo: °audio grave
┃ 📌 °videoaudio - Converte vídeo para áudio
┃ 📌 Total: ${Object.keys(EFEITOS).length} efeitos
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

    await sock.sendMessage(chat, { text: texto }, { quoted: msg });
}

// ==================== EXPORTAR ====================

module.exports = {
    aplicarEfeitoAudio,
    processarAudio,
    cmdVideoToAudio,
    cmdListarEfeitos,
    EFEITOS,
    getFiltroEfeito,
    formatarTempo,
    formatarTamanho,
    TEMP_DIR
};