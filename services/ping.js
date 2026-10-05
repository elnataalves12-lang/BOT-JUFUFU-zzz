// ==================== COMANDO PING ====================
// services/ping.js
//
// Ping completo:
//   - Latência em ms
//   - Tempo ativo (bot + sistema)
//   - Memória
//   - CPU
//   - Sistema
//   - Data e hora
// ============================================================

const os = require('os');

// ==================== FORMATAR TEMPO ====================
function formatarTempo(ms) {
    const segundos = Math.floor(ms / 1000);
    const minutos = Math.floor(segundos / 60);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    const partes = [];
    if (dias > 0) partes.push(`${dias}d`);
    if (horas % 24 > 0) partes.push(`${horas % 24}h`);
    if (minutos % 60 > 0) partes.push(`${minutos % 60}m`);
    partes.push(`${segundos % 60}s`);

    return partes.join(' ') || '0s';
}

// ==================== FORMATAR BYTES ====================
function formatarBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ==================== STATUS POR LATÊNCIA ====================
function getStatusLatencia(ms) {
    if (ms <= 200) return { emoji: '🟢', texto: 'Excelente' };
    if (ms <= 500) return { emoji: '🟡', texto: 'Bom' };
    if (ms <= 1000) return { emoji: '🟠', texto: 'Regular' };
    return { emoji: '🔴', texto: 'Ruim' };
}

// ==================== COMANDO PING ====================
async function cmdPing(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG) {
    try {
        // ============================================================
        // 🔥 MEDE A LATÊNCIA
        // ============================================================
        const inicio = Date.now();

        const msgEnviada = await sock.sendMessage(chat, {
            text: '🏓 Pingando...'
        }, { quoted: msg });

        const latencia = Date.now() - inicio;
        const status = getStatusLatencia(latencia);

        // ============================================================
        // 🔥 COLETA OS DADOS
        // ============================================================

        // TEMPO ATIVO
        const tempoAtivo = global.inicioBot ? Date.now() - global.inicioBot : 0;
        const tempoFormatado = formatarTempo(tempoAtivo);
        const uptimeSistema = os.uptime() * 1000;
        const uptimeFormatado = formatarTempo(uptimeSistema);

        // MEMÓRIA
        const memoriaUsada = process.memoryUsage();
        const memoriaRSS = formatarBytes(memoriaUsada.rss);
        const memoriaHeap = formatarBytes(memoriaUsada.heapUsed);
        const memoriaTotal = formatarBytes(os.totalmem());
        const memoriaLivre = formatarBytes(os.freemem());
        const memoriaUsoPorcento = Math.floor(
            ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
        );

        // CPU
        const cpuModelo = os.cpus()?.[0]?.model || 'Desconhecido';
        const cpuNucleos = os.cpus()?.length || 0;
        const cpuVelocidade = os.cpus()?.[0]?.speed || 0;

        // SISTEMA
        const plataforma = os.platform();
        const arquitetura = os.arch();
        const tipo = os.type();
        const release = os.release();

        let emojiSO = '💻';
        if (plataforma === 'android') emojiSO = '📱';
        else if (plataforma === 'linux') emojiSO = '🐧';
        else if (plataforma === 'win32') emojiSO = '🪟';
        else if (plataforma === 'darwin') emojiSO = '🍎';

        // DATA/HORA
        const agora = new Date();
        const horaAtual = agora.toLocaleTimeString('pt-BR');
        const dataAtual = agora.toLocaleDateString('pt-BR');

        const botNome = CONFIG?.botNome || 'JUFUFU Bot';

        // ============================================================
        // 🔥 APAGA A MENSAGEM "PINGANDO"
        // ============================================================
        try {
            await sock.sendMessage(chat, {
                delete: msgEnviada.key
            });
        } catch (e) {}

        // ============================================================
        // 🔥 MONTA A MENSAGEM FINAL
        // ============================================================
        const texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🏓 *PONG!*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ ${status.emoji} *Latência:* ${latencia}ms
┃ 📊 *Status:* ${status.texto}

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ⏱️ *TEMPO ATIVO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 🤖 *Bot:* ${tempoFormatado}
┃ 💻 *Sistema:* ${uptimeFormatado}

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 💾 *MEMÓRIA*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 📊 *Uso:* ${memoriaUsoPorcento}%
┃ 🔋 *Total:* ${memoriaTotal}
┃ 🟢 *Livre:* ${memoriaLivre}
┃ 📦 *RSS:* ${memoriaRSS}
┃ 🧪 *Heap:* ${memoriaHeap}

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🖥️ *CPU*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ ⚙️ *Núcleos:* ${cpuNucleos}
┃ 💨 *Velocidade:* ${cpuVelocidade} MHz
┃ 📛 *Modelo:*
┃ ${cpuModelo.slice(0, 40)}${cpuModelo.length > 40 ? '...' : ''}

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ${emojiSO} *SISTEMA*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 💻 *Plataforma:* ${tipo}
┃ 🏗️ *Arquitetura:* ${arquitetura}
┃ 📦 *Versão:* ${release}

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📅 *DATA E HORA*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 📅 *Data:* ${dataAtual}
┃ 🕐 *Hora:* ${horaAtual}

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${botNome} 』`;

        // ============================================================
        // 🔥 ENVIA COM A FUNÇÃO enviarResposta (com botão do canal)
        // ============================================================
        await enviarResposta(chat, sock, texto, msg);

        // ============================================================
        // 🔥 REAGE COM EMOJI BASEADO NA LATÊNCIA
        // ============================================================
        if (reagir) {
            await reagir(sock, chat, msg.key.id, status.emoji);
        }

    } catch (error) {
        console.error('❌ Erro no ping:', error.message);
        try {
            await enviarResposta(chat, sock, `❌ Erro no ping: ${error.message}`, msg);
        } catch (e) {}
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdPing,
    formatarTempo,
    formatarBytes,
    getStatusLatencia
};