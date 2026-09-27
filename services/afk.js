// ==================== SISTEMA AFK ====================
// services/afk.js
//
// Comandos: afk, afks/listafk
// ============================================================

// ==================== CONFIGURAÇÃO ====================
let db = null;
let CONFIG = null;
let enviarResposta = null;
let salvarDB = null;

// ==================== INICIALIZAR MÓDULO ====================
function initModule(dbInstance, configInstance, sendResponseFunction, saveFunction) {
    db = dbInstance;
    CONFIG = configInstance;
    enviarResposta = sendResponseFunction;
    salvarDB = saveFunction;
    console.log('✅ Módulo AFK inicializado!');
}

// ==================== SETAR AFK ====================
async function setAfk(chat, sender, motivo, sock, msg) {
    if (!db.afk) db.afk = {};
    if (!db.afk[chat]) db.afk[chat] = {};
    
    db.afk[chat][sender] = {
        motivo: motivo || "Não informado",
        timestamp: Date.now()
    };
    
    salvarDB();
    
    const nome = sender.split('@')[0];
    const texto = `开启 ${CONFIG.botNome} - AFK 〛
╭━━━━━━━━━━━━━⬢
┃ 👤 @${nome}
┃ 🔕 Está AFK
┃ 💬 ${motivo || "Não informado"}
╰━━━━━━━━━━━━━⬢`;
    
    await enviarResposta(chat, sock, texto, msg, [sender]);
}

// ==================== REMOVER AFK ====================
async function removerAfk(chat, sender, sock, msg) {
    if (!db.afk?.[chat]?.[sender]) return false;
    
    const tempoAfk = Date.now() - db.afk[chat][sender].timestamp;
    const minutos = Math.floor(tempoAfk / 60000);
    
    delete db.afk[chat][sender];
    if (Object.keys(db.afk[chat]).length === 0) delete db.afk[chat];
    salvarDB();
    
    const nome = sender.split('@')[0];
    const texto = `开启 ${CONFIG.botNome} 〛
╭━━━━━━━━━━━━━⬢
┃ 👤 @${nome}
┃ 🟢 Saiu do AFK
┃ ⏱️ ${minutos} minuto(s)
╰━━━━━━━━━━━━━⬢`;
    
    await enviarResposta(chat, sock, texto, msg, [sender]);
    return true;
}

// ==================== VERIFICAR AFK ====================
async function verificarAfk(chat, sender, mencionados, sock, msg) {
    if (!db.afk?.[chat]) return false;
    
    for (const mencionado of mencionados) {
        if (db.afk[chat][mencionado]) {
            const data = db.afk[chat][mencionado];
            const tempo = Math.floor((Date.now() - data.timestamp) / 60000);
            const nome = mencionado.split('@')[0];
            
            const texto = `开启 ${CONFIG.botNome} - AFK 〛
╭━━━━━━━━━━━━━⬢
┃ 👤 @${nome}
┃ 🔕 Ausente
┃ 💬 ${data.motivo}
┃ ⏰ ${tempo} minuto(s)
╰━━━━━━━━━━━━━⬢`;
            
            await enviarResposta(chat, sock, texto, msg, [mencionado]);
            return true;
        }
    }
    
    if (db.afk[chat][sender]) {
        await removerAfk(chat, sender, sock, msg);
    }
    
    return false;
}

// ==================== LISTAR AFKS ====================
async function listarAfks(chat, sock, msg) {
    if (!db.afk?.[chat] || Object.keys(db.afk[chat]).length === 0) {
        await enviarResposta(chat, sock, '📊 Ninguém AFK!', msg);
        return;
    }
    
    let texto = `开启 ${CONFIG.botNome} - AFKs 〛
╭━━━━━━━━━━━━━⬢\n`;
    
    for (const [id, data] of Object.entries(db.afk[chat])) {
        const tempo = Math.floor((Date.now() - data.timestamp) / 60000);
        texto += `┃ 👤 @${id.split('@')[0]} - ${data.motivo} (${tempo}m)\n`;
    }
    
    texto += `╰━━━━━━━━━━━━━⬢`;
    
    const mentions = Object.keys(db.afk[chat]);
    await sock.sendMessage(chat, { text: texto, mentions }, { quoted: msg });
}

// ==================== COMANDOS ====================
async function cmdAfk(chat, sock, sender, msg, args) {
    const motivo = args.join(' ').trim();
    await setAfk(chat, sender, motivo, sock, msg);
}

async function cmdAfks(chat, sock, msg) {
    await listarAfks(chat, sock, msg);
}

// ==================== EXPORTAR ====================
module.exports = {
    initModule,
    setAfk,
    removerAfk,
    verificarAfk,
    listarAfks,
    cmdAfk,
    cmdAfks
};