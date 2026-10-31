// ==================== BOT INFO ====================
// services/botInfo.js
//
// Comando °bot — mostra informações do bot
// Envia como ENCAMINHADA do canal (forwarded newsletter)
// ============================================================

const fs = require('fs');
const path = require('path');
const os = require('os');
const { pegarJidCanal, montarContextoEncaminhamento } = require('./canal.js');

// ==================== VALORES FIXOS ====================
const NOME_CRIADOR = 'Alves';
const NUMERO_CRIADOR = '5591985500390';
const NOME_ORIGINAL = '𝙹𝚄𝙵𝚄𝙵𝚄-ᵇᵒᵗ-𝑧𝑧𝑧';

// ==================== LINKS ====================
const LINKS = {
    site_api: 'https://ju-api-web-app-dupli-k2zk.bolt.host/',
    site_oficial: 'https://animated-fun-guide.lovable.app/',
    site_menus: 'https://quick-menu-bot.lovable.app/',
    canal: 'https://whatsapp.com/channel/0029VbDHw0fAO7RBFTJ3rn1e',
    telegram: 'https://t.me/jufufu_zzz_u12_bot',
    github_whats: 'https://github.com/elnataalves12-lang/BOT-JUFUFU-zzz',
    github_insta: 'https://github.com/elnataalves12-lang/BOT-JUFUFU-Instagram-/tree/main'
};

// ==================== PASTAS IGNORADAS NO CÁLCULO ====================
const PASTAS_IGNORADAS = new Set([
    'node_modules', '.git', 'auth', 'auth_joe', 'session',
    'temp', 'cache', 'musicas', 'downloads_video'
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

    if (dias > 0) return `${dias}d ${horas % 24}h ${minutos % 60}m`;
    if (horas > 0) return `${horas}h ${minutos % 60}m ${segundos % 60}s`;
    if (minutos > 0) return `${minutos}m ${segundos % 60}s`;
    return `${segundos}s`;
}

// ==================== FORMATAR DATA ====================
function formatarData(data) {
    return data.toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ==================== FUNÇÃO PRINCIPAL ====================
async function cmdBotInfo(sock, chat, msg, CONFIG, db) {
    try {
        // 🔥 INFORMAÇÕES BÁSICAS
        const botNome = CONFIG.botNome || 'JUFUFU Bot';
        const versao = CONFIG.versao || '3.0';
        const prefixo = CONFIG.prefix || '°';

        // 🔥 DONOS
        const donos = Array.isArray(CONFIG.donos) ? CONFIG.donos : [];
        const primeiroDono = donos.length > 0 ? donos[0] : 'N/A';

        // 🔥 SISTEMA
        const hostname = os.hostname() || 'Desconhecido';
        const tempoAtivo = calcularTempoAtivo(global.inicioBot || Date.now());

        // 🔥 GRUPOS
        let totalGrupos = 0;
        try {
            const groups = await sock.groupFetchAllParticipating();
            totalGrupos = Object.keys(groups).length;
        } catch (e) {}

        // 🔥 TAMANHO DO BOT
        const botPath = path.join(__dirname, '..');
        const tamanhoBot = getFolderSize(botPath);
        const tamanhoFormatado = formatarTamanho(tamanhoBot);

        // 🔥 MEMÓRIA
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
┃ 🤖 *INFORMAÇÕES DO BOT*
╰━━━━━━━━━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 📛 *NOME:* ${botNome}
┃ 📛 *ORIGINAL:* ${NOME_ORIGINAL}
┃ 📌 *VERSÃO:* ${versao}
┃ 🔖 *PREFIXO:* ${prefixo}
┃ 👑 *CRIADOR:* ${NOME_CRIADOR}
┃ 📞 *CONTATO:* +${NUMERO_CRIADOR}
╰━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 👑 *DONOS DO BOT:*
${donos.length > 0 ? donos.map(d => `┃ 👤 +${d}`).join('\n') : '┃ 📌 Nenhum dono configurado'}
╰━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 💻 *SISTEMA:* ${hostname}
┃ 📅 *INICIADO EM:* ${dataInicio}
┃ ⏱️ *ATIVO HÁ:* ${tempoAtivo}
┃ 💾 *TAMANHO:* ${tamanhoFormatado}
╰━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 📊 *ESTATÍSTICAS:*
┃ 📱 *GRUPOS:* ${totalGrupos}
┃ 💻 *SISTEMA:* ${sistema}
┃ 🖥️ *ARQUITETURA:* ${arquitetura}
┃ 🧠 *CORES:* ${cores}
┃ 💾 *MEMÓRIA TOTAL:* ${memoriaTotal}
┃ 📦 *MEMÓRIA LIVRE:* ${memoriaLivre}
┃ 🧪 *HEAP USADO:* ${memoriaHeap}
┃ 📊 *RSS:* ${memoriaRSS}
╰━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 🔗 *LINKS OFICIAIS*
╰━━━━━━━━━━━━━⬢

┃ 🌐 *Site da Ju API:*
┃ ${LINKS.site_api}

┃ 📢 *Canal do WhatsApp:*
┃ ${LINKS.canal}

┃ 🤖 *Site Oficial do Bot:*
┃ ${LINKS.site_oficial}

┃ 📋 *API dos Menus:*
┃ ${LINKS.site_menus}

┃ ✈️ *Bot do Telegram:*
┃ ${LINKS.telegram}

┃ 📸 *GitHub (Bot Instagram):*
┃ ${LINKS.github_insta}

┃ 💬 *GitHub (Bot WhatsApp):*
┃ ${LINKS.github_whats}

╰━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 📅 *DATA ATUAL:* ${dataAtual}
┃ 🤖 ${botNome}
┃ 👑 ${NOME_CRIADOR}
╰━━━━━━━━━━━━━⬢
『 ${botNome} 』`;

        // 🔥 MENCIONA TODOS OS DONOS
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

        // ============================================================
        // 🔥 MONTAR CONTEXTO DE ENCAMINHAMENTO DO CANAL
        // ============================================================
        let contextInfo = {};

        try {
            const canalJid = await pegarJidCanal(sock);

            if (canalJid) {
                contextInfo = montarContextoEncaminhamento(canalJid, botNome);
                
            } else {
                console.log('⚠️ JID do canal não disponível, enviando normal');
            }
        } catch (e) {
            console.error('❌ Erro no contexto de encaminhamento:', e.message);
        }

        // ============================================================
        // 🔥 ENVIA (com contexto de encaminhamento, se disponível)
        // ============================================================
        await sock.sendMessage(chat, {
            text: texto,
            mentions: mentions,
            contextInfo: contextInfo
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
    cmdBotInfo,
    LINKS,
    NOME_CRIADOR,
    NUMERO_CRIADOR,
};