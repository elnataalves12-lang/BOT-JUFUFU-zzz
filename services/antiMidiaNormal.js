// ==================== ANTI-MÍDIA NORMAL ====================
// services/antiMidiaNormal.js
//
// Regras:
//   • ADM/dono → pode enviar foto/vídeo normal
//   • Membro comum → SÓ pode enviar em visualização única
//   • Membro comum mandando normal → o bot APAGA
//
// Comando:
//   °visuunica on/off
// ============================================================

// ==================== VARIÁVEIS GLOBAIS ====================
let db = null;
let salvarDB = null;
let verificarAdmin = null;
let isDono = null;
let CONFIG = null;

// ==================== INICIALIZAR ====================
function initModule(dbInstance, salvarDBFn, verificarAdminFn, isDonoFn, configInstance) {
    db = dbInstance;
    salvarDB = salvarDBFn;
    verificarAdmin = verificarAdminFn;
    isDono = isDonoFn;
    CONFIG = configInstance || require('../config.js');
    console.log('✅ Módulo AntiMídiaNormal inicializado!');
}

// ==================== VERIFICAR SE TÁ ATIVO ====================
function isVisuUnicaAtivo(chat) {
    return db.visuUnica?.[chat] === true;
}

// ==================== PROCESSAR MENSAGEM ====================
async function processarVisuUnica(sock, chat, sender, msg) {
    try {
        // 🔥 SÓ EM GRUPOS
        if (!chat.endsWith('@g.us')) return false;

        // 🔥 SÓ SE TÁ ATIVO
        if (!isVisuUnicaAtivo(chat)) return false;

        // 🔥 VERIFICA SE É FOTO OU VÍDEO NORMAL
        const isFoto = !!msg.message?.imageMessage;
        const isVideo = !!msg.message?.videoMessage;

        if (!isFoto && !isVideo) return false;

        // 🔥 VERIFICA SE É VISUALIZAÇÃO ÚNICA
        // (viewOnceMessage / viewOnceMessageV2 / viewOnceMessageV2Extension)
        const isViewOnce = !!(
            msg.message?.viewOnceMessage ||
            msg.message?.viewOnceMessageV2 ||
            msg.message?.viewOnceMessageV2Extension
        );

        // 🔥 SE JÁ É VISUALIZAÇÃO ÚNICA, DEIXA PASSAR
        if (isViewOnce) return false;

        // 🔥 VERIFICA SE É ADM OU DONO
        const isAdmin = await verificarAdmin(sock, chat, sender);
        const isDonoBot = await isDono(sender);

        // 🔥 ADM/DONO PODE MANDAR NORMAL
        if (isAdmin || isDonoBot) return false;

        // ============================================================
        // 🔥 MEMBRO COMUM MANDOU NORMAL → APAGA
        // ============================================================
        const tipo = isFoto ? 'foto' : 'vídeo';

        try {
            // Apaga a mensagem
            await sock.sendMessage(chat, {
                delete: msg.key
            });
        } catch (e) {
            console.error('❌ Erro ao apagar mídia:', e.message);
        }

        // Avisa no grupo
        try {
            await sock.sendMessage(chat, {
                text: `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ⚠️ *MÍDIA APAGADA*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 👤 @${sender.split('@')[0]}
┃ 📸 Tipo: ${tipo}

┃ 📌 Este grupo exige que
┃ *fotos e vídeos* sejam
┃ enviados apenas em
┃ *VISUALIZAÇÃO ÚNICA*.

┃ 💡 Use o botão "Ver uma vez"
┃ ao enviar a mídia.

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
                mentions: [sender]
            });
        } catch (e) {}

        return true;

    } catch (e) {
        console.error('❌ Erro no visuunica:', e.message);
        return false;
    }
}

// ==================== COMANDO °VISUUNICA ====================
async function cmdVisuUnica(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG_) {
    const cfg = CONFIG_ || CONFIG;

    // 🔥 SÓ EM GRUPOS
    if (!chat.endsWith('@g.us')) {
        await enviarResposta(chat, sock, '📌 Este comando só funciona em grupos!', msg);
        return;
    }

    // 🔥 SÓ ADM OU DONO
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores ou dono!', msg);
        return;
    }

    const acao = args[0]?.toLowerCase();

    // 🔥 GARANTE QUE EXISTE
    if (!db.visuUnica) db.visuUnica = {};

    // ============================================================
    // 🔥 ATIVAR
    // ============================================================
    if (acao === 'on' || acao === 'ativar' || acao === '1') {
        db.visuUnica[chat] = true;
        salvarDB();

        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ✅ *VISUALIZAÇÃO ÚNICA ATIVADA*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 📸 A partir de agora, *fotos*
┃ e *vídeos* enviados neste grupo
┃ precisam ser em
┃ *VISUALIZAÇÃO ÚNICA*.

┃ ⚠️ Mídias normais de membros
┃ comuns serão *apagadas*.

┃ 👑 ADMs e dono podem enviar
┃ mídias normais sem problema.

┃ 📌 Para desativar:
┃ ${cfg.prefix}visuunica off

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
            msg
        );
        await reagir(sock, chat, msg.key.id, '✅');
        return;
    }

    // ============================================================
    // 🔥 DESATIVAR
    // ============================================================
    if (acao === 'off' || acao === 'desativar' || acao === '0') {
        db.visuUnica[chat] = false;
        salvarDB();

        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ❌ *VISUALIZAÇÃO ÚNICA DESATIVADA*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ ✅ Fotos e vídeos voltaram
┃ ao normal, sem restrição.

┃ 📌 Para reativar:
┃ ${cfg.prefix}visuunica on

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
            msg
        );
        await reagir(sock, chat, msg.key.id, '❌');
        return;
    }

    // ============================================================
    // 🔥 SEM ARGUMENTO: MOSTRA STATUS
    // ============================================================
    const ativo = isVisuUnicaAtivo(chat);

    await enviarResposta(chat, sock,
        `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📸 *VISUALIZAÇÃO ÚNICA*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 📊 Status: ${ativo ? '✅ *ATIVADO*' : '❌ *DESATIVADO*'}

┃ 📌 *Como usar:*
┃ ${cfg.prefix}visuunica on - Ativar
┃ ${cfg.prefix}visuunica off - Desativar

┃ 💡 *Quando ativado:*
┃ ▸ Membros comuns só podem
┃   mandar fotos/vídeos em
┃   *visualização única*
┃ ▸ Fotos/vídeos normais de
┃   membros serão apagados
┃ ▸ ADMs e dono podem mandar
┃   normal sem problema

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
        msg
    );
    await reagir(sock, chat, msg.key.id, '📸');
}

// ==================== EXPORTAR ====================
module.exports = {
    initModule,
    cmdVisuUnica,
    processarVisuUnica,
    isVisuUnicaAtivo
};