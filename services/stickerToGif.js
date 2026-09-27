// ==================== STICKER → GIF ====================
// services/stickerToGif.js
// Compatível com Android + Termux
//
// Uso:
// Responda a uma figurinha com: °sticker2gif
//
// Fluxo:
// - Figurinha ESTÁTICA → FFmpeg local
// - Figurinha ANIMADA  → Ju API (/webp2gif)
// ======================================================

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const fetch = require('node-fetch');

// ==================== CONFIGURAÇÃO ====================
const TEMP_DIR = path.join(os.tmpdir(), 'jufufu_sticker_gif');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const MAX_GIF_SIZE = 15 * 1024 * 1024;
const MAX_DURATION = 15;
const MAX_FPS = 15;
const MAX_WIDTH = 480;

// ==================== VERIFICAR FFMPEG ====================
function verificarFFmpeg() {
    return new Promise((resolve) => {
        const ffmpeg = spawn('ffmpeg', ['-version']);
        let respondeu = false;

        ffmpeg.on('error', () => {
            if (!respondeu) {
                respondeu = true;
                resolve(false);
            }
        });

        ffmpeg.on('close', (code) => {
            if (!respondeu) {
                respondeu = true;
                resolve(code === 0);
            }
        });
    });
}

// ==================== EXECUTAR FFMPEG ====================
function executarFFmpeg(args) {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', args);
        let stderr = '';

        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ffmpeg.on('error', (error) => reject(error));

        ffmpeg.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`FFmpeg terminou com código ${code}`));
        });
    });
}

// ==================== VERIFICAR WEBP ====================
function isWebP(buffer) {
    if (!buffer || buffer.length < 12) return false;
    const riff = buffer.toString('ascii', 0, 4);
    const webp = buffer.toString('ascii', 8, 12);
    return riff === 'RIFF' && webp === 'WEBP';
}

// ==================== DETECTAR WEBP ANIMADO ====================
function isAnimatedWebP(buffer) {
    try {
        if (!isWebP(buffer)) return false;
        const header = buffer.toString('ascii');
        return header.includes('ANIM') || header.includes('ANMF');
    } catch (error) {
        return false;
    }
}

// ==================== UPLOAD TEMPORÁRIO (CATBOX) ====================
async function uploadTemporario(buffer) {
    const boundary = `----JufufuBoundary${crypto.randomBytes(8).toString('hex')}`;
    const filename = `sticker_${Date.now()}.webp`;

    const header = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="reqtype"\r\n\r\n` +
        `fileupload\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="fileToUpload"; filename="${filename}"\r\n` +
        `Content-Type: image/webp\r\n\r\n`,
        'utf-8'
    );

    const footer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    const body = Buffer.concat([header, buffer, footer]);

    const response = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length.toString()
        },
        body
    });

    if (!response.ok) {
        throw new Error(`Upload falhou: ${response.status}`);
    }

    const url = (await response.text()).trim();

    if (!url || !url.startsWith('http')) {
        throw new Error('Upload retornou URL inválida');
    }

    return url;
}

// ==================== CHAMAR A JU API (/webp2gif) ====================
async function converterViaJuApi(stickerUrl, CONFIG) {
    const { baseUrl, apiKey, timeout } = CONFIG.jufufuAPI;

    const url = `${baseUrl}/webp2gif?url=${encodeURIComponent(stickerUrl)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout || 60000);

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
    } catch (e) {
        if (e.name === 'AbortError' || e.message?.includes('aborted')) {
            throw new Error('Ju API demorou muito para responder. Tente novamente.');
        }
        throw e;
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) {
        if (response.status === 502 || response.status === 503) {
            throw new Error('Serviço de conversão temporariamente indisponível. Tente novamente em alguns minutos.');
        }
        if (response.status === 401 || response.status === 403) {
            throw new Error('Token da API inválido ou expirado.');
        }
        if (response.status === 429) {
            throw new Error('Muitas requisições. Aguarde alguns segundos.');
        }
        throw new Error(`API erro: ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok || !data.gifUrl) {
        throw new Error(data.error || 'API não retornou o GIF');
    }

    return data.gifUrl;
}

// ==================== BAIXAR GIF DA URL ====================
async function baixarGif(gifUrl) {
    const response = await fetch(gifUrl);

    if (!response.ok) {
        throw new Error(`Erro ao baixar GIF: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (!buffer || buffer.length < 100) {
        throw new Error('GIF retornado está vazio ou inválido');
    }

    return buffer;
}

// ==================== CONVERTER WEBP → GIF (LOCAL) ====================
async function converterWebPParaGifLocal(input, output) {
    const palette = path.join(
        TEMP_DIR,
        `palette_${Date.now()}_${Math.random().toString(36).slice(2)}.png`
    );

    try {
        await executarFFmpeg([
            '-y', '-i', input,
            '-t', String(MAX_DURATION),
            '-vf', `fps=${MAX_FPS},scale=${MAX_WIDTH}:-1:flags=lanczos,palettegen=stats_mode=diff`,
            palette
        ]);

        await executarFFmpeg([
            '-y', '-i', input, '-i', palette,
            '-t', String(MAX_DURATION),
            '-filter_complex', `[0:v]fps=${MAX_FPS},scale=${MAX_WIDTH}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=sierra2_4a:diff_mode=rectangle`,
            '-loop', '0',
            output
        ]);

        if (!fs.existsSync(output)) {
            throw new Error('O FFmpeg não criou o arquivo GIF.');
        }

        const stats = fs.statSync(output);
        if (stats.size < 100) {
            throw new Error('O GIF gerado ficou inválido ou vazio.');
        }

        return output;
    } finally {
        try {
            if (fs.existsSync(palette)) fs.unlinkSync(palette);
        } catch (error) {}
    }
}

// ==================== LIMPAR ARQUIVO ====================
function removerArquivo(file) {
    try {
        if (file && fs.existsSync(file)) fs.unlinkSync(file);
    } catch (error) {}
}

// ==================== LIMPAR TEMPORÁRIOS ANTIGOS ====================
function limparTemporarios() {
    try {
        if (!fs.existsSync(TEMP_DIR)) return;
        const agora = Date.now();
        const arquivos = fs.readdirSync(TEMP_DIR);

        for (const arquivo of arquivos) {
            const caminho = path.join(TEMP_DIR, arquivo);
            try {
                const stats = fs.statSync(caminho);
                if (agora - stats.mtimeMs > 30 * 60 * 1000) {
                    fs.unlinkSync(caminho);
                }
            } catch (_) {}
        }
    } catch (error) {}
}

// ==================== COMANDO PRINCIPAL ====================
async function cmdStickerToGif(
    sock, chat, sender, msg, args,
    enviarResposta, reagir, downloadMediaMessage, P, CONFIG
) {
    // VERIFICAR SE ESTÁ ATIVADO
    if (CONFIG.comandos?.stickerToGif === false) {
        await enviarResposta(chat, sock, '⛔ O comando °sticker2gif está desativado!', msg);
        return;
    }

    // PEGAR FIGURINHA RESPONDIDA
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted || !quoted.stickerMessage) {
        await enviarResposta(chat, sock,
            `📌 Responda a uma figurinha com ${CONFIG.prefix}sticker2gif`,
            msg
        );
        return;
    }

    await reagir(sock, chat, msg.key.id, '🔄');

    let inputFile = null;
    let outputFile = null;

    try {
        limparTemporarios();

        // BAIXAR FIGURINHA
        const target = { message: quoted, key: msg.key };
        const buffer = await downloadMediaMessage(
            target, 'buffer', {},
            { logger: P({ level: 'silent' }) }
        );

        if (!buffer || buffer.length < 100) {
            throw new Error('Não foi possível baixar a figurinha.');
        }

        if (!isWebP(buffer)) {
            throw new Error('O arquivo baixado não parece ser um WebP válido.');
        }

        const animado = isAnimatedWebP(buffer);

        // ============================================================
        // FIGURINHA ANIMADA → Ju API
        // ============================================================
        if (animado) {
            if (!CONFIG.jufufuAPI?.baseUrl || !CONFIG.jufufuAPI?.apiKey) {
                throw new Error(
                    'Ju API não configurada!\n\n' +
                    '📌 Figurinhas animadas precisam da Ju API.\n' +
                    '📌 Configure no config.js.'
                );
            }

            // 1. Upload temporário
            const stickerUrl = await uploadTemporario(buffer);

            // 2. Chama a Ju API
            const gifUrl = await converterViaJuApi(stickerUrl, CONFIG);

            // 3. Baixa o GIF
            const gifBuffer = await baixarGif(gifUrl);

            // 4. Envia
            const botNome = CONFIG?.botNome || 'JUFUFU Bot';

            await sock.sendMessage(chat, {
                video: gifBuffer,
                gifPlayback: true,
                caption:
                    `🎞️ Figurinha convertida para GIF!\n` +
                    `📦 ${(gifBuffer.length / 1024 / 1024).toFixed(2)} MB\n` +
                    `『 ${botNome} 』`
            }, { quoted: msg });

            await reagir(sock, chat, msg.key.id, '✅');
            return;
        }

        // ============================================================
        // FIGURINHA ESTÁTICA → FFmpeg local
        // ============================================================

        const ffmpegExiste = await verificarFFmpeg();

        if (!ffmpegExiste) {
            throw new Error('FFmpeg não foi encontrado no Termux.');
        }

        const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        inputFile = path.join(TEMP_DIR, `sticker_${id}.webp`);
        outputFile = path.join(TEMP_DIR, `sticker_${id}.gif`);

        fs.writeFileSync(inputFile, buffer);
        await converterWebPParaGifLocal(inputFile, outputFile);

        const gifStats = fs.statSync(outputFile);

        if (gifStats.size > MAX_GIF_SIZE) {
            const outputSmall = path.join(TEMP_DIR, `sticker_${id}_small.gif`);

            await executarFFmpeg([
                '-y', '-i', inputFile,
                '-t', String(MAX_DURATION),
                '-vf', 'fps=10,scale=360:-1:flags=lanczos',
                '-loop', '0',
                outputSmall
            ]);

            if (fs.existsSync(outputSmall)) {
                const smallStats = fs.statSync(outputSmall);
                if (smallStats.size < gifStats.size) {
                    removerArquivo(outputFile);
                    outputFile = outputSmall;
                } else {
                    removerArquivo(outputSmall);
                }
            }
        }

        const gifBuffer = fs.readFileSync(outputFile);

        if (!gifBuffer || gifBuffer.length < 100) {
            throw new Error('GIF inválido.');
        }

        const botNome = CONFIG?.botNome || 'JUFUFU Bot';

        await sock.sendMessage(chat, {
            video: gifBuffer,
            gifPlayback: true,
            caption:
                `🎞️ Figurinha convertida para GIF!\n` +
                `📦 ${(gifBuffer.length / 1024 / 1024).toFixed(2)} MB\n` +
                `『 ${botNome} 』`
        }, { quoted: msg });

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        await enviarResposta(chat, sock, `❌ ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');

    } finally {
        removerArquivo(inputFile);
        removerArquivo(outputFile);
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdStickerToGif,
    isAnimatedWebP,
    isWebP,
    verificarFFmpeg
};