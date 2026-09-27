// ==================== TTS - TEXTO EM ÁUDIO ====================
// services/tts.js
//
// API: Ju API (/tts) - Google Translate TTS
// Converte MP3 → OGG/Opus pra virar PTT (ondinhas do WhatsApp)
// ============================================================

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { verificarApiConfigurada } = require('./apiError.js');

// ==================== TEMP DIR ====================
const TEMP_DIR = path.join(process.cwd(), 'temp');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ==================== IDIOMAS SUPORTADOS ====================
const IDIOMAS = {
    'pt-br': { nome: 'Português (BR)', emoji: '🇧🇷' },
    'pt':    { nome: 'Português',      emoji: '🇵🇹' },
    'en':    { nome: 'Inglês',         emoji: '🇺🇸' },
    'es':    { nome: 'Espanhol',       emoji: '🇪🇸' },
    'fr':    { nome: 'Francês',        emoji: '🇫🇷' },
    'it':    { nome: 'Italiano',       emoji: '🇮🇹' },
    'de':    { nome: 'Alemão',         emoji: '🇩🇪' },
    'ja':    { nome: 'Japonês',        emoji: '🇯🇵' },
    'ko':    { nome: 'Coreano',        emoji: '🇰🇷' },
    'zh':    { nome: 'Chinês',         emoji: '🇨🇳' },
    'ru':    { nome: 'Russo',          emoji: '🇷🇺' },
    'ar':    { nome: 'Árabe',          emoji: '🇸🇦' },
    'hi':    { nome: 'Hindi',          emoji: '🇮🇳' }
};

const MAX_CHARS = 500;

// ==================== CONVERTER MP3 → OGG/OPUS (PTT) ====================
async function converterParaPtt(inputBuffer) {
    const id = crypto.randomBytes(8).toString('hex');

    const inputPath = path.join(TEMP_DIR, `tts-${id}.mp3`);
    const outputPath = path.join(TEMP_DIR, `tts-${id}.ogg`);

    try {
        await fs.promises.writeFile(inputPath, inputBuffer);

        await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-y',
                '-hide_banner',
                '-loglevel', 'error',
                '-i', inputPath,
                '-c:a', 'libopus',
                '-b:a', '48k',
                '-ar', '24000',
                '-ac', '1',
                '-application', 'voip',
                outputPath
            ]);

            let stderr = '';

            ffmpeg.stderr.on('data', chunk => {
                stderr += chunk.toString();
            });

            ffmpeg.on('error', reject);

            ffmpeg.on('close', code => {
                if (code === 0) {
                    resolve();
                    return;
                }
                reject(new Error(stderr.trim() || `FFmpeg falhou (${code})`));
            });
        });

        const outputBuffer = await fs.promises.readFile(outputPath);

        if (!outputBuffer || outputBuffer.length < 100) {
            throw new Error('FFmpeg não gerou um áudio válido');
        }

        return outputBuffer;

    } finally {
        await Promise.allSettled([
            fs.promises.unlink(inputPath),
            fs.promises.unlink(outputPath)
        ]);
    }
}

// ==================== COMANDO TTS ====================
async function cmdTts(chat, sock, msg, args, enviarResposta, reagir, CONFIG) {
    // 🔥 VERIFICA A JU API
    if (!(await verificarApiConfigurada(CONFIG, chat, sock, msg, enviarResposta, reagir))) return;

    const texto = args.join(' ').trim();

    // 🔥 SEM TEXTO → MOSTRA AJUDA
    if (!texto) {
        let ajuda = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🔊 *TEXTO EM ÁUDIO (TTS)*
╰━━━━━━━━━━━━━━━━━━━━━⬢

📌 Use: ${CONFIG.prefix}tts <texto>

📌 *Exemplos:*
┃ ${CONFIG.prefix}tts Olá, tudo bem?
┃ ${CONFIG.prefix}tts en Hello world
┃ ${CONFIG.prefix}tts es Hola mundo

🌍 *Idiomas disponíveis:*\n\n`;

        for (const [code, info] of Object.entries(IDIOMAS)) {
            ajuda += `┃ ${info.emoji} ${code} — ${info.nome}\n`;
        }

        ajuda += `\n📏 Máximo: ${MAX_CHARS} caracteres
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

        await enviarResposta(chat, sock, ajuda, msg);
        return;
    }

    // 🔥 VERIFICA SE O PRIMEIRO ARG É UM IDIOMA
    let lang = 'pt-br';
    let textoFinal = texto;

    const primeiroArg = args[0]?.toLowerCase();
    if (primeiroArg && IDIOMAS[primeiroArg]) {
        lang = primeiroArg;
        textoFinal = args.slice(1).join(' ').trim();
    }

    if (!textoFinal) {
        await enviarResposta(chat, sock, `📌 Digite o texto! Exemplo: ${CONFIG.prefix}tts Olá mundo`, msg);
        return;
    }

    // 🔥 VERIFICA O LIMITE DE CARACTERES
    if (textoFinal.length > MAX_CHARS) {
        await enviarResposta(chat, sock,
            `❌ Texto muito longo! (${textoFinal.length}/${MAX_CHARS} caracteres)`,
            msg
        );
        return;
    }

    await reagir(sock, chat, msg.key.id, '🔊');

    try {
        const { baseUrl, apiKey, timeout } = CONFIG.jufufuAPI;

        const apiUrl = `${baseUrl}/tts?text=${encodeURIComponent(textoFinal)}&lang=${encodeURIComponent(lang)}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout || 60000);

        let response;
        try {
            response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });
        } catch (e) {
            if (e.name === 'AbortError' || e.message?.includes('aborted')) {
                throw new Error('API demorou muito para responder. Tente novamente.');
            }
            throw e;
        } finally {
            clearTimeout(timer);
        }

        if (!response.ok) {
            throw new Error(`API erro: ${response.status}`);
        }

        const data = await response.json();

        if (!data.ok || !data.audioUrl) {
            throw new Error(data.error || 'API não retornou o áudio');
        }

        // 🔥 BAIXA O MP3
        const audioResponse = await fetch(data.audioUrl);

        if (!audioResponse.ok) {
            throw new Error(`Erro ao baixar áudio: ${audioResponse.status}`);
        }

        const mp3Buffer = Buffer.from(await audioResponse.arrayBuffer());

        if (!mp3Buffer || mp3Buffer.length < 100) {
            throw new Error('Áudio retornado está vazio ou inválido');
        }

        // 🔥 CONVERTE PARA OGG/OPUS (PTT DO WHATSAPP)
        const pttBuffer = await converterParaPtt(mp3Buffer);

        // 🔥 ENVIA COMO PTT (COM AS ONDINHAS)
        await sock.sendMessage(chat, {
            audio: pttBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        }, { quoted: msg });

        await reagir(sock, chat, msg.key.id, '🔊');

    } catch (error) {
        await enviarResposta(chat, sock, `❌ ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdTts,
    IDIOMAS
};