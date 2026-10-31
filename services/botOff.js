// ==================== BOT OFF (por grupo) ====================
// services/botOff.js
//
// Comando °botoff — desativa o bot NO GRUPO
// Comando °boton  — reativa o bot NO GRUPO
//
// Regras:
//   • °botoff → só ADM ou dono
//   • °boton  → só ADM ou dono
//   • Quando OFF: NINGUÉM (nem dono) usa comandos
//   • Só °boton funciona
//   • Anti-link, anti-palavrão, etc CONTINUAM funcionando
// ============================================================

// ==================== VARIÁVEIS ====================
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
    console.log('✅ Módulo BotOff inicializado!');
}

// ==================== VERIFICAR SE TÁ OFF ====================
function isBotOff(chat) {
    return db.botOff?.[chat] === true;
}

// ==================== COMANDO °BOTOFF / °BOTON ====================
async function cmdBotOff(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG_) {
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
    if (!db.botOff) db.botOff = {};

    // ============================================================
    // 🔥 °BOTOFF (desativar)
    // ============================================================
    if (acao === 'off' || acao === 'desativar' || acao === '0') {
        if (db.botOff[chat] === true) {
            await enviarResposta(chat, sock, '⚠️ O bot já está *DESATIVADO* neste grupo!', msg);
            return;
        }

        db.botOff[chat] = true;
        salvarDB();

        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🔴 *BOT DESATIVADO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ ⚠️ O bot foi *desativado*
┃ neste grupo.

┃ 📌 *Ninguém* pode usar
┃ comandos (nem dono).

┃ ✅ *Apenas* o comando:
┃ ▸ ${cfg.prefix}boton

┃ ...vai funcionar enquanto
┃ o bot estiver desativado.

┃ 💡 *Anti-link, anti-palavrão*
┃ *e outras proteções*
┃ *continuam ativas.*

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${cfg.botNome} 』`,
            msg
        );
        await reagir(sock, chat, msg.key.id, '🔴');
        return;
    }

    // ============================================================
    // 🔥 °BOTON (reativar)
    // ============================================================
    if (acao === 'on' || acao === 'ativar' || acao === '1') {
        if (db.botOff[chat] !== true) {
            await enviarResposta(chat, sock, '⚠️ O bot já está *ATIVADO* neste grupo!', msg);
            return;
        }

        delete db.botOff[chat];
        salvarDB();

        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🟢 *BOT REATIVADO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ ✅ O bot voltou a funcionar
┃ neste grupo!

┃ 📌 Todos os comandos estão
┃ liberados novamente.

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${cfg.botNome} 』`,
            msg
        );
        await reagir(sock, chat, msg.key.id, '🟢');
        return;
    }

    // ============================================================
    // 🔥 SEM ARGUMENTO: MOSTRA STATUS
    // ============================================================
    const ativo = db.botOff[chat] !== true;

    await enviarResposta(chat, sock,
        `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🤖 *STATUS DO BOT*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 📊 Status: ${ativo ? '🟢 *ATIVADO*' : '🔴 *DESATIVADO*'}

┃ 📌 *Comandos:*
┃ ${cfg.prefix}botoff - Desativar
┃ ${cfg.prefix}boton  - Reativar

┃ ⚠️ Quando *DESATIVADO*:
┃ ▸ Ninguém usa comandos
┃   (nem dono)
┃ ▸ Só ${cfg.prefix}boton funciona
┃ ▸ Anti-link, anti-palavrão
┃   continuam ativos

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${cfg.botNome} 』`,
        msg
    );
    await reagir(sock, chat, msg.key.id, '🤖');
}

// ==================== PROCESSAR BLOQUEIO ====================
// 🔥 Retorna TRUE se deve bloquear o comando
async function deveBloquear(chat, comando) {
    try {
        // 🔥 SÓ EM GRUPOS
        if (!chat.endsWith('@g.us')) return false;

        // 🔥 SÓ SE TÁ OFF
        if (!isBotOff(chat)) return false;

        // 🔥 SE É O COMANDO °BOTON, DEIXA PASSAR
        const cmd = String(comando || '').toLowerCase();
        if (cmd === 'boton' || cmd === 'bot' || cmd === 'ligar') {
            return false;
        }

        // 🔥 QUALQUER OUTRO COMANDO → BLOQUEIA
        return true;

    } catch (e) {
        return false;
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    initModule,
    cmdBotOff,
    deveBloquear,
    isBotOff
};