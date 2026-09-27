// ==================== PLAY - MÚSICAS ====================
// services/play.js
// ============================================================

const fetch = require('node-fetch');
const { play } = require('./spiderX.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

// ==================== TEMP DIR ====================

const TEMP_DIR = path.join(process.cwd(), 'temp');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ==================== FORMATAR DURAÇÃO ====================

function formatarDuracao(segundos) {
    if (!segundos || segundos <= 0) return '0:00';

    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const seg = Math.floor(segundos % 60);

    if (horas > 0) {
        return `${horas}:${String(minutos).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
    }

    return `${minutos}:${String(seg).padStart(2, '0')}`;
}

// ==================== FORMATAR DATA ====================

function formatarData(dataString) {
    if (!dataString) return 'N/A';

    try {
        const data = new Date(dataString);

        if (isNaN(data.getTime())) {
            return 'N/A';
        }

        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return 'N/A';
    }
}

// ==================== CRIAR BARRA DE PROGRESSO ====================

function criarBarra(duracao) {
    const total = duracao || 180;

    const progresso = Math.floor(Math.random() * 30) + 20;

    const progressoSegundos = Math.floor(
        (progresso / 100) * total
    );

    const tempoAtual = formatarDuracao(progressoSegundos);
    const duracaoFormatada = formatarDuracao(total);

    const estilos = [
        { filled: '━', empty: '━', dot: '❍' },
        { filled: '▰', empty: '▱', dot: '◈' },
        { filled: '═', empty: '═', dot: '●' },
        { filled: '♡', empty: '♡', dot: '》' },
        { filled: '✧', empty: '✧', dot: '❍' },
        { filled: '─', empty: '─', dot: '◇' }
    ];

    const estilo =
        estilos[Math.floor(Math.random() * estilos.length)];

    const tamanho = 20;

    const preenchido = Math.floor(
        (progresso / 100) * tamanho
    );

    let barra = '';

    for (let i = 0; i < tamanho; i++) {
        if (i < preenchido) {
            barra += estilo.filled;
        } else if (i === preenchido) {
            barra += estilo.dot;
        } else {
            barra += estilo.empty;
        }
    }

    return {
        barra,
        tempoAtual,
        duracaoFormatada,
        progresso
    };
}

// ==================== BAIXAR ÁUDIO ====================

async function baixarAudio(url, timeout = 30000) {
    let timeoutId;

    try {
        const controller = new AbortController();

        timeoutId = setTimeout(() => {
            controller.abort();
        }, timeout);

        const response = await fetch(url, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Erro ao baixar áudio: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();

        const buffer = Buffer.from(arrayBuffer);

        if (!buffer || buffer.length < 1000) {
            throw new Error('Áudio recebido está vazio ou inválido');
        }

        return buffer;

    } catch (error) {

        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        if (
            error.name === 'AbortError' ||
            error.name === 'AbortError: The operation was aborted'
        ) {
            throw new Error('Download do áudio expirou');
        }

        throw error;
    }
}

// ==================== CONVERTER PARA OPUS / PTT ====================
// WhatsApp PTT utiliza Opus.
// A API pode retornar MP3, M4A, WEBM etc.
// Por isso convertemos o buffer recebido para OGG/Opus.

async function converterParaAudioWhatsApp(inputBuffer) {
    const id = crypto.randomBytes(8).toString('hex');

    const inputPath = path.join(
        TEMP_DIR,
        `play-${id}.input`
    );

    const outputPath = path.join(
        TEMP_DIR,
        `play-${id}.ogg`
    );

    try {

        await fs.promises.writeFile(
            inputPath,
            inputBuffer
        );

        await new Promise((resolve, reject) => {

            const ffmpeg = spawn('ffmpeg', [
                '-y',

                '-hide_banner',
                '-loglevel',
                'error',

                '-i',
                inputPath,

                // =========================
                // CONFIGURAÇÃO PTT WHATSAPP
                // =========================

                '-c:a',
                'libopus',

                '-b:a',
                '48k',

                '-ar',
                '24000',

                '-ac',
                '1',

                '-application',
                'voip',

                outputPath
            ]);

            let stderr = '';

            ffmpeg.stderr.on('data', chunk => {
                stderr += chunk.toString();
            });

            ffmpeg.on('error', error => {
                reject(error);
            });

            ffmpeg.on('close', code => {

                if (code === 0) {
                    resolve();
                    return;
                }

                reject(
                    new Error(
                        stderr.trim() ||
                        `FFmpeg falhou com código ${code}`
                    )
                );
            });
        });

        const outputBuffer =
            await fs.promises.readFile(outputPath);

        if (!outputBuffer || outputBuffer.length < 100) {
            throw new Error(
                'FFmpeg não gerou um áudio válido'
            );
        }

        return outputBuffer;

    } finally {

        await Promise.allSettled([
            fs.promises.unlink(inputPath),
            fs.promises.unlink(outputPath)
        ]);
    }
}

// ==================== CRIAR PLAYER VISUAL ====================

function criarPlayerVisual(data, tempoBusca, sender, CONFIG) {

    const duracao =
        data.total_duration_in_seconds ||
        data.duration ||
        0;

    const {
        barra,
        tempoAtual,
        duracaoFormatada,
        progresso
    } = criarBarra(duracao);

    const botNome =
        CONFIG?.botNome ||
        'JUFUFU Bot';

    const emojis = [
        '🎵',
        '🎶',
        '🎧',
        '🎼',
        '🎹',
        '🎸',
        '🎺',
        '🎻',
        '🥁',
        '🎷'
    ];

    const emoji =
        emojis[Math.floor(Math.random() * emojis.length)];

    const cores = [
        '✨',
        '🌟',
        '💫',
        '⭐',
        '🌈',
        '🔥',
        '💎',
        '🌺'
    ];

    const cor =
        cores[Math.floor(Math.random() * cores.length)];

    const usuario =
        sender?.split('@')[0] || 'usuário';

    const dataLancamento =
        data.publishedAt ||
        data.published_at ||
        data.uploadDate ||
        data.upload_date ||
        'N/A';

    const titulo =
        data.title ||
        'Título desconhecido';

    const canal =
        data.channel?.name ||
        data.artist ||
        'Desconhecido';

    const descricao =
        data.description ||
        'Sem descrição';

    const descricaoCurta =
        descricao.length > 60
            ? descricao.substring(0, 60) + '...'
            : descricao;

    const youtubeUrl =
        data.youtube_video_url ||
        data.videoUrl ||
        'N/A';

    const texto =
`╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ${cor} **PLAYER DE MÚSICA**
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ ${emoji} **${titulo}**
┃ 👤 ${canal}

┃ ${tempoAtual} ${barra} ${duracaoFormatada}
┃ ${progresso}% ═══════════════════

┃ 👤 Pedido por: @${usuario}
┃ 📅 Lançamento: ${formatarData(dataLancamento)}
┃ 📡 Fonte: YouTube

┃ 📝 ${descricaoCurta}

┃ 🔗 ${youtubeUrl}
┃ ⏱️ Busca: ${tempoBusca}s

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${botNome} 』`;

    return texto;
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function cmdPlay(
    sock,
    chat,
    msg,
    args,
    enviarResposta,
    reagir,
    CONFIG
) {

    if (!CONFIG.comandos?.play) {

        await enviarResposta(
            chat,
            sock,
            '⛔ Comando desativado!',
            msg
        );

        return;
    }

    const query =
        Array.isArray(args)
            ? args.join(' ').trim()
            : String(args || '').trim();

    if (!query) {

        await enviarResposta(
            chat,
            sock,
            `🎵 Digite o nome da música!\n📌 Exemplo: ${CONFIG.prefix}play coldplay`,
            msg
        );

        return;
    }

    // =========================
    // NÃO ACEITAR LINKS
    // =========================

    if (
        query.includes('http://') ||
        query.includes('https://')
    ) {

        await enviarResposta(
            chat,
            sock,
            '❌ Use °play <nome da música> para pesquisar!',
            msg
        );

        return;
    }

    const sender =
        msg.key.participant ||
        msg.key.remoteJid;

    await reagir(
        sock,
        chat,
        msg.key.id,
        '🔍'
    );

    try {

        const inicioBusca = Date.now();

        // ==========================================
        // 1. API SPIDER X
        // ==========================================

        const data = await play(
            'audio',
            query
        );

        if (!data) {
            throw new Error(
                'A API não retornou nenhum resultado!'
            );
        }

        if (!data.url) {
            throw new Error(
                'A API não retornou a URL do áudio!'
            );
        }

        const tempoBusca =
            Math.floor(
                (Date.now() - inicioBusca) / 1000
            );

        // ==========================================
        // 2. BAIXA O ÁUDIO DA API
        // ==========================================

        const audioBuffer =
            await baixarAudio(
                data.url,
                CONFIG.spiderX?.timeout || 30000
            );

        // ==========================================
        // 3. CONVERTE PARA OPUS
        // ==========================================

        const audioPtt =
            await converterParaAudioWhatsApp(
                audioBuffer
            );

        // ==========================================
        // 4. PLAYER VISUAL
        // ==========================================

        const playerTexto =
            criarPlayerVisual(
                data,
                tempoBusca,
                sender,
                CONFIG
            );

        // ==========================================
        // 5. CAPA
        // ==========================================

        if (data.thumbnail) {

            try {

                const response =
                    await fetch(
                        data.thumbnail
                    );

                if (!response.ok) {
                    throw new Error(
                        `Thumbnail HTTP ${response.status}`
                    );
                }

                const thumbBuffer =
                    Buffer.from(
                        await response.arrayBuffer()
                    );

                await sock.sendMessage(
                    chat,
                    {
                        image: thumbBuffer,
                        caption: playerTexto,
                        mentions: [sender]
                    },
                    {
                        quoted: msg
                    }
                );

            } catch (e) {

                await sock.sendMessage(
                    chat,
                    {
                        text: playerTexto,
                        mentions: [sender]
                    },
                    {
                        quoted: msg
                    }
                );
            }

        } else {

            await sock.sendMessage(
                chat,
                {
                    text: playerTexto,
                    mentions: [sender]
                },
                {
                    quoted: msg
                }
            );
        }

        // ==========================================
        // 6. ENVIA ÁUDIO COMO PTT
        // ==========================================

        await sock.sendMessage(
            chat,
            {
                audio: audioPtt,

                // O arquivo gerado pelo FFmpeg
                // é OGG contendo Opus.

                mimetype: 'audio/ogg; codecs=opus',

                ptt: true
            },
            {
                quoted: msg
            }
        );

        // ==========================================
        // 7. SUCESSO
        // ==========================================

        await reagir(
            sock,
            chat,
            msg.key.id,
            '🎶'
        );

    } catch (error) {

        console.error(
            '❌ Erro no °play:',
            error
        );

        await enviarResposta(
            chat,
            sock,
            `❌ ${error.message || 'Erro desconhecido'}`,
            msg
        );

        await reagir(
            sock,
            chat,
            msg.key.id,
            '❌'
        );
    }
}

// ==================== EXPORTAR ====================

module.exports = {
    cmdPlay
};