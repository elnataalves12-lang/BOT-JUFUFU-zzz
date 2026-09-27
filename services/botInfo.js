// ==================== BOT INFO ====================
// services/botInfo.js
//
// Comando °bot — mostra informações do bot
// ============================================================

const fs = require('fs');
const path = require('path');
const os = require('os');

// ==================== VALORES FIXOS ====================
const NOME_CRIADOR = 'Аlves.com';
const NOME_ORIGINAL = '𝙹𝚄𝙵𝚄𝙵𝚄-ᵇᵒᵗ-𝑧𝑧𝑧';
const APP_LINK = 'https://teammita.lovable.app/';

// ==================== PASTAS IGNORADAS NO CÁLCULO ====================
const PASTAS_IGNORADAS = new Set([
    'node_modules',
    '.git',
    'auth',
    'auth_joe',
    'session',
    'temp',
    'cache',
    'musicas',
    'downloads_video'
]);

// ==================== CALCULAR TAMANHO DA PASTA ====================

function getFolderSize(folderPath, raiz = true) {
    let totalSize = 0;

    try {
        const files = fs.readdirSync(folderPath);

        for (const file of files) {
            if (raiz && PASTAS_IGNORADAS.has(file)) continue;

            const filePath = path.join(folderPath, file);

            try {
                const stats = fs.statSync(filePath);

                if (stats.isDirectory()) {
                    totalSize += getFolderSize(filePath, false);
                } else {
                    totalSize += stats.size;
                }
            } catch (e) {}
        }
    } catch (e) {}

    return totalSize;
}

// ==================== FORMATAR TAMANHO ====================

function formatarTamanho(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==================== CALCULAR TEMPO DE ATIVIDADE ====================

function calcularTempoAtivo(inicio) {
    const agora = Date.now();
    const diffMs = agora - inicio;

    const segundos = Math.floor(diffMs / 1000);
    const minutos = Math.floor(segundos / 60);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (dias > 0) {
        return `${dias}d ${horas % 24}h ${minutos % 60}m`;
    } else if (horas > 0) {
        return `${horas}h ${minutos % 60}m ${segundos % 60}s`;
    } else if (minutos > 0) {
        return `${minutos}m ${segundos % 60}s`;
    } else {
        return `${segundos}s`;
    }
}

// ==================== FORMATAR DATA ====================

function formatarData(data) {
    return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function cmdBotInfo(sock, chat, msg, CONFIG, db) {
    try {
        // 🔥 INFORMAÇÕES BÁSICAS (do config.js)
        const botNome = CONFIG.botNome || 'JUFUFU Bot';
        const versao = CONFIG.versao || '3.0';
        const prefixo = CONFIG.prefix || '°';
        const canalLink = CONFIG.canalLink || '';

        // 🔥 DONOS (do config.js)
        const donos = Array.isArray(CONFIG.donos) ? CONFIG.donos : [];
        const primeiroDono = donos.length > 0 ? donos[0] : 'N/A';

        // 🔥 HOSTNAME (SISTEMA)
        const hostname = os.hostname() || 'Desconhecido';

        // 🔥 TEMPO DE ATIVIDADE
        const tempoAtivo = calcularTempoAtivo(global.inicioBot || Date.now());

        // 🔥 GRUPOS QUE O BOT ESTÁ
        let totalGrupos = 0;
        try {
            const groups = await sock.groupFetchAllParticipating();
            totalGrupos = Object.keys(groups).length;
        } catch (e) {
            totalGrupos = 0;
        }

        // 🔥 TAMANHO DO BOT NO DISCO (sem node_modules)
        const botPath = path.join(__dirname, '..');
        const tamanhoBot = getFolderSize(botPath);
        const tamanhoFormatado = formatarTamanho(tamanhoBot);

        // 🔥 MEMÓRIA USADA
        const memoriaUsada = process.memoryUsage();
        const memoriaHeap = formatarTamanho(memoriaUsada.heapUsed);
        const memoriaRSS = formatarTamanho(memoriaUsada.rss);

        // 🔥 SISTEMA OPERACIONAL
        const sistema = os.type() + ' ' + os.release();
        const arquitetura = os.arch();
        const cores = os.cpus().length;
        const memoriaTotal = formatarTamanho(os.totalmem());
        const memoriaLivre = formatarTamanho(os.freemem());

        // 🔥 DATAS
        const dataInicio = formatarData(new Date(global.inicioBot || Date.now()));
        const dataAtual = formatarData(new Date());

        // ============================================================
        // CONSTRÓI A MENSAGEM
        // ============================================================

        let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🤖 **INFORMAÇÕES DO BOT**
╰━━━━━━━━━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 📛 **NOME:**
┃ ${botNome}
┃ 📛 **NOME ORIGINAL:**
┃ ${NOME_ORIGINAL}
┃ 📌 **VERSÃO:** ${versao}
┃ 🔖 **PREFIXO:** ${prefixo}
┃ 👑 **CRIADOR:** ${NOME_CRIADOR}
╰━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 👑 **DONOS DO BOT:**
${donos.length > 0 ? donos.map(d => `┃ 👤 ${d}`).join('\n') : '┃ 📌 Nenhum dono configurado'}
╰━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 👤 **DONO ATUAL:**
┃ 📱 ${primeiroDono}
┃ 💻 **SISTEMA:** ${hostname}
┃ 📅 **INICIADO EM:** ${dataInicio}
┃ ⏱️ **ATIVO HÁ:** ${tempoAtivo}
┃ 💾 **TAMANHO:** ${tamanhoFormatado}
╰━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 📊 **ESTATÍSTICAS:**
┃ 📱 **GRUPOS:** ${totalGrupos}
┃ 💻 **SISTEMA:** ${sistema}
┃ 🖥️ **ARQUITETURA:** ${arquitetura}
┃ 🧠 **CORES:** ${cores}
┃ 💾 **MEMÓRIA TOTAL:** ${memoriaTotal}
┃ 📦 **MEMÓRIA LIVRE:** ${memoriaLivre}
┃ 🧪 **HEAP USADO:** ${memoriaHeap}
┃ 📊 **RSS:** ${memoriaRSS}
╰━━━━━━━━━━━━━⬢\n`;

        // 🔥 ADICIONA OS LINKS (só se tiver canal configurado)
        if (canalLink || APP_LINK) {
            texto += `╭━━━━━━━━━━━━━⬢
┃ 🔗 **LINKS:**\n`;

            if (canalLink) {
                texto += `┃ 📢 **CANAL DO BOT:**
┃ ${canalLink}
┃\n`;
            }

            if (APP_LINK) {
                texto += `┃ 📱 **APLICATIVO:**
┃ ${APP_LINK}
┃\n`;
            }

            texto += `┃ ⚠️ *Siga o canal para ver as atualizações!*
╰━━━━━━━━━━━━━⬢\n\n`;
        }

        texto += `╭━━━━━━━━━━━━━⬢
┃ 📅 **DATA ATUAL:** ${dataAtual}
┃ 🤖 ${botNome}
┃ 👑 ${NOME_CRIADOR}
╰━━━━━━━━━━━━━⬢
『 ${botNome} 』`;

        // 🔥 MENCIONA TODOS OS DONOS
        // Suporta tanto número (@s.whatsapp.net) quanto LID (@lid)
        const mentions = [];
        for (const dono of donos) {
            if (!dono) continue;
            const donoStr = String(dono);

            if (donoStr.includes('@')) {
                mentions.push(donoStr);
            } else {
                mentions.push(donoStr + '@s.whatsapp.net');
            }
        }

        // 🔥 ENVIA A MENSAGEM
        await sock.sendMessage(chat, {
            text: texto,
            mentions: mentions
        }, { quoted: msg });

    } catch (error) {
        console.error('❌ Erro no botinfo:', error);
        await sock.sendMessage(chat, {
            text: `❌ Erro ao buscar informações: ${error.message}`
        }, { quoted: msg });
    }
}

// ==================== EXPORTAR ====================

module.exports = {
    cmdBotInfo
};