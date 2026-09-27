// ==================== SISTEMA DE RANKINGS ====================
// services/rankings.js

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// ==================== CONFIGURAÇÃO ====================
const RANKINGS_DIR = path.join(process.cwd(), 'assets', 'rankings');
if (!fs.existsSync(RANKINGS_DIR)) fs.mkdirSync(RANKINGS_DIR, { recursive: true });

// ==================== INICIALIZAR DADOS ====================
function initRankings(db) {
    if (!db.rankings) db.rankings = {};
    if (!db.rankings.feio) db.rankings.feio = {};
    if (!db.rankings.bonito) db.rankings.bonito = {};
    if (!db.rankings.corno) db.rankings.corno = {};
    if (!db.rankings.gay) db.rankings.gay = {};
    if (!db.rankings.fofo) db.rankings.fofo = {};
    if (!db.rankings.doido) db.rankings.doido = {};
    
    if (!db.rankings.imagens) {
        db.rankings.imagens = {
            feio: null,
            bonito: null,
            corno: null,
            gay: null,
            fofo: null,
            doido: null
        };
    }
    return db.rankings;
}

// ==================== SALVAR DB ====================
function salvarDB(db, DB_PATH) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    } catch (e) {
        console.error('❌ Erro ao salvar DB:', e.message);
    }
}

// ==================== BAIXAR IMAGEM DA URL ====================
async function baixarImagemUrl(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return Buffer.from(await response.arrayBuffer());
    } catch (error) {
        console.error('❌ Erro ao baixar imagem:', error.message);
        return null;
    }
}

// ==================== SALVAR IMAGEM LOCALMENTE ====================
async function salvarImagemRanking(buffer, tipo, db, DB_PATH) {
    const id = Date.now() + '_' + Math.random().toString(36).substring(7);
    const filePath = path.join(RANKINGS_DIR, `${tipo}_${id}.jpg`);
    fs.writeFileSync(filePath, buffer);
    
    db.rankings.imagens[tipo] = filePath;
    salvarDB(db, DB_PATH);
    
    return filePath;
}

// ==================== OBTER IMAGEM DO RANKING (COM DOWNLOAD AUTOMÁTICO) ====================
async function getRankingImage(db, tipo, CONFIG, DB_PATH) {
    initRankings(db);
    
    // 1. Verifica se já tem imagem salva localmente
    const imagemSalva = db.rankings.imagens?.[tipo];
    if (imagemSalva && fs.existsSync(imagemSalva)) {
        return imagemSalva;
    }
    
    // 2. Se não tem, tenta baixar da URL do config
    const url = CONFIG.rankings?.imagens?.[tipo];
    if (!url) {
        console.log(`⚠️ Nenhuma URL configurada para o ranking "${tipo}"`);
        return null;
    }
    
    const buffer = await baixarImagemUrl(url);
    if (!buffer) {
        console.log(`❌ Falha ao baixar imagem do ranking "${tipo}"`);
        return null;
    }
    
    // 3. Salva a imagem localmente
    const filePath = await salvarImagemRanking(buffer, tipo, db, DB_PATH);
    return filePath;
}

// ==================== FORÇAR BAIXAR TODAS AS IMAGENS ====================
async function baixarTodasImagensRankings(db, CONFIG, DB_PATH) {
    const tipos = ['feio', 'bonito', 'corno', 'gay', 'fofo', 'doido'];
    let baixadas = 0;
    
    for (const tipo of tipos) {
        const url = CONFIG.rankings?.imagens?.[tipo];
        if (!url) continue;
        
        // Verifica se já tem imagem salva
        const imagemSalva = db.rankings.imagens?.[tipo];
        if (imagemSalva && fs.existsSync(imagemSalva)) {
            continue;
        }
        
        const buffer = await baixarImagemUrl(url);
        if (buffer) {
            await salvarImagemRanking(buffer, tipo, db, DB_PATH);
            baixadas++;
        }
    }
    
    return baixadas;
}

// ==================== GERAR PONTUAÇÃO ALEATÓRIA ====================
function gerarPontuacao() {
    return Math.floor(Math.random() * 100) + 1;
}

// ==================== ATUALIZAR RANKING ====================
function atualizarRanking(db, chat, tipo, participantes) {
    initRankings(db);
    if (!db.rankings[tipo]) db.rankings[tipo] = {};
    if (!db.rankings[tipo][chat]) db.rankings[tipo][chat] = {};
    
    const ranking = db.rankings[tipo][chat];
    
    for (const id of participantes) {
        if (!ranking[id]) {
            ranking[id] = {
                pontos: gerarPontuacao(),
                ultimaVez: Date.now(),
                totalVezes: 1
            };
        } else {
            const novaPontuacao = gerarPontuacao();
            if (novaPontuacao > ranking[id].pontos) {
                ranking[id].pontos = novaPontuacao;
            }
            ranking[id].totalVezes += 1;
            ranking[id].ultimaVez = Date.now();
        }
    }
    
    return ranking;
}

// ==================== SELECIONAR 7 PESSOAS ALEATÓRIAS ====================
function selecionarAleatorios(participantes, quantidade = 7) {
    const shuffled = [...participantes].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(quantidade, shuffled.length));
}

// ==================== GERAR BARRA DE PROGRESSO ====================
function gerarBarra(pontos, maximo = 100, tamanho = 15) {
    const preenchido = Math.floor((pontos / maximo) * tamanho);
    let barra = '';
    for (let i = 0; i < tamanho; i++) {
        if (i < preenchido) {
            barra += '█';
        } else {
            barra += '░';
        }
    }
    return barra;
}

// ==================== FUNÇÃO GENÉRICA DE RANKING ====================
async function cmdRankGenerico(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, tipo, emoji, nomeDisplay, CONFIG) {
    if (!chat.endsWith('@g.us')) {
        await enviarResposta(chat, sock, '📌 Este comando só funciona em grupos!', msg);
        return;
    }

    await reagir(sock, chat, msg.key.id, '📊');

    try {
        const metadata = await sock.groupMetadata(chat);
        const participantes = metadata.participants.map(p => p.id);
        const participantesFiltrados = participantes.filter(id => id !== sock.user.id);
        
        const selecionados = selecionarAleatorios(participantesFiltrados, 7);
        const ranking = atualizarRanking(db, chat, tipo, selecionados);
        
        const ordenados = Object.entries(ranking)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.pontos - a.pontos)
            .slice(0, 7);
        
        // 🔥 PEGA A IMAGEM (BAIXA AUTOMATICAMENTE SE NÃO TIVER)
        const imagemPath = await getRankingImage(db, tipo, CONFIG, DB_PATH);
        
        const agora = new Date();
        const data = agora.toLocaleDateString('pt-BR');
        const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ${emoji} **RANKING ${nomeDisplay}**
╰━━━━━━━━━━━━━━━━━━━━━⬢

📅 ${data} | 🕐 ${hora}
👥 ${participantesFiltrados.length} participantes

╭━━━━━━━━━━━━━━━━━━━━━⬢\n`;

        const medals = ['👑', '🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣'];
        
        ordenados.forEach((user, index) => {
            const medalha = medals[index] || `${index+1}°`;
            const barra = gerarBarra(user.pontos, 100, 15);
            const nome = user.id.split('@')[0];
            texto += `┃ ${medalha} @${nome}
┃    💯 ${user.pontos}% ${barra}
┃    🎯 Vezes: ${user.totalVezes || 1}
┃ ──────────────────────────\n`;
        });

        texto += `╰━━━━━━━━━━━━━━━━━━━━━⬢
╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🤖 ${CONFIG.botNome}
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

        const mentions = ordenados.map(u => u.id);

        if (imagemPath && fs.existsSync(imagemPath)) {
            const imageBuffer = fs.readFileSync(imagemPath);
            await sock.sendMessage(chat, {
                image: imageBuffer,
                caption: texto,
                mentions: mentions
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chat, {
                text: texto,
                mentions: mentions
            }, { quoted: msg });
        }

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        console.error(`❌ Erro no ranking ${tipo}:`, error);
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== COMANDOS ====================
async function cmdRankFeio(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, CONFIG) {
    await cmdRankGenerico(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, 'feio', '👹', 'FEIO', CONFIG);
}

async function cmdRankBonito(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, CONFIG) {
    await cmdRankGenerico(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, 'bonito', '✨', 'BONITO', CONFIG);
}

async function cmdRankCorno(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, CONFIG) {
    await cmdRankGenerico(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, 'corno', '🦌', 'CORNO', CONFIG);
}

async function cmdRankGay(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, CONFIG) {
    await cmdRankGenerico(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, 'gay', '🏳️‍🌈', 'GAY', CONFIG);
}

async function cmdRankFofo(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, CONFIG) {
    await cmdRankGenerico(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, 'fofo', '🧸', 'FOFO', CONFIG);
}

async function cmdRankDoido(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, verificarAdmin, isDono, CONFIG) {
    await cmdRankGenerico(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, 'doido', '🤪', 'DOIDO', CONFIG);
}

// ==================== COMANDO: TROCAR IMAGEM MANUALMENTE ====================
async function cmdSetRankImage(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, downloadMediaMessage, P, verificarAdmin, isDono) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);
    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    const tipo = args[0]?.toLowerCase();
    if (!tipo || !['feio', 'bonito', 'corno', 'gay', 'fofo', 'doido'].includes(tipo)) {
        await enviarResposta(chat, sock, 
            `📌 Use: ${CONFIG.prefix}setrankimage <tipo> (respondendo imagem)\n` +
            `📌 Tipos: feio, bonito, corno, gay, fofo, doido`,
            msg
        );
        return;
    }

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted || !quoted.imageMessage) {
        await enviarResposta(chat, sock, `🖼️ Responda a uma imagem com °setrankimage ${tipo}`, msg);
        return;
    }

    await reagir(sock, chat, msg.key.id, '⏳');

    try {
        const target = { message: quoted, key: msg.key };
        const buffer = await downloadMediaMessage(target, 'buffer', {}, { logger: P({ level: 'silent' }) });
        
        if (!buffer || buffer.length < 100) {
            throw new Error('Imagem inválida');
        }

        await salvarImagemRanking(buffer, tipo, db, DB_PATH);

        await enviarResposta(chat, sock, `✅ Imagem do ranking "${tipo}" atualizada com sucesso!`, msg);
        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== COMANDO: BAIXAR TODAS AS IMAGENS ====================
async function cmdBaixarRankImages(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir, isDono, CONFIG) {
    if (!await isDono(sender)) {
        await enviarResposta(chat, sock, '🔒 Apenas o dono pode usar este comando!', msg);
        return;
    }

    await reagir(sock, chat, msg.key.id, '⏳');

    try {
        const baixadas = await baixarTodasImagensRankings(db, CONFIG, DB_PATH);
        await enviarResposta(chat, sock, `✅ ${baixadas} imagens baixadas com sucesso!`, msg);
        await reagir(sock, chat, msg.key.id, '✅');
    } catch (error) {
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdRankFeio,
    cmdRankBonito,
    cmdRankCorno,
    cmdRankGay,
    cmdRankFofo,
    cmdRankDoido,
    cmdSetRankImage,
    cmdBaixarRankImages,
    initRankings,
    getRankingImage,
    salvarImagemRanking,
    baixarTodasImagensRankings
};