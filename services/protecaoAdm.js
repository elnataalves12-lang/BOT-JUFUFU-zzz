// ==================== PROTEÇÃO DE ADM ====================
// services/protecaoAdm.js
//
// Regras (quando ativado):
//   1. ADM rebaixa outro ADM → rebaixado volta + quem rebaixou perde ADM
//   2. ADM bane outro ADM    → quem baniu é banido
//   3. ADM promove membro    → os 2 perdem ADM
//
// Exceções (podem fazer tudo sem punição):
//   - Dono do bot
//   - Criador do grupo (superadmin)
//   - ADMs na lista permitida
//
// ⚠️ O BOT NUNCA SE PUNE SOZINHO
// ============================================================

// ==================== VARIÁVEIS ====================
let dbGlobal = null;
let sockGlobal = null;
let CONFIG_GLOBAL = null;

// ==================== AVISOS DE SPAM ====================
const avisosEnviados = new Set();

// ==================== INICIALIZAR ====================
function initModule(dbInstance, configInstance, sockInstance) {
    dbGlobal = dbInstance;
    CONFIG_GLOBAL = configInstance;
    if (sockInstance) sockGlobal = sockInstance;
    console.log('✅ Módulo ProtecaoAdm inicializado!');
}

// ==================== SETAR SOCK ====================
function setSock(sockInstance) {
    sockGlobal = sockInstance;
}

// ==================== LIMPAR ID (só números) ====================
function limparId(jid) {
    if (!jid) return '';
    return String(jid).replace(/\D/g, '');
}

// ==================== COMPARAR 2 IDs ====================
function mesmoId(a, b) {
    if (!a || !b) return false;

    const aNum = limparId(a);
    const bNum = limparId(b);

    if (!aNum || !bNum) return false;

    // 🔥 Compara direto
    if (aNum === bNum) return true;

    // 🔥 Compara últimos 8 dígitos (evita +55, 0, etc)
    if (aNum.length >= 8 && bNum.length >= 8) {
        if (aNum.slice(-8) === bNum.slice(-8)) return true;
    }

    return false;
}

// ==================== VERIFICAR SE É O BOT ====================
function ehBot(jid) {
    if (!sockGlobal?.user) return false;
    if (!jid) return false;

    const botIds = [
        sockGlobal.user.id,
        sockGlobal.user.lid,
        sockGlobal.user.jid
    ].filter(Boolean);

    return botIds.some(botId => mesmoId(botId, jid));
}

// ==================== VERIFICAR SE É DONO DO BOT ====================
async function isDonoBot(jid, CONFIG, db) {
    try {
        const cfg = CONFIG || CONFIG_GLOBAL;
        const database = db || dbGlobal;

        if (!cfg || !database) return false;

        if (!Array.isArray(cfg.donos)) cfg.donos = [];
        if (!Array.isArray(database.donos)) database.donos = [];

        const todos = [...cfg.donos, ...database.donos];

        // 🔥 Se o jid for LID, tenta resolver via groupMetadata
        let jidResolvido = jid;

        if (String(jid).includes('@lid') && sockGlobal) {
            try {
                const groups = await sockGlobal.groupFetchAllParticipating();
                for (const group of Object.values(groups)) {
                    if (!group?.participants) continue;
                    for (const p of group.participants) {
                        const pLid = String(p.lid || '');
                        const pJid = String(p.jid || p.phoneNumber || '');

                        if (mesmoId(pLid, jid) && pJid) {
                            jidResolvido = pJid;
                            break;
                        }
                    }
                }
            } catch (e) {}
        }

        for (const dono of todos) {
            if (!dono) continue;
            if (mesmoId(dono, jidResolvido)) return true;
            if (mesmoId(dono, jid)) return true;
        }

        return false;
    } catch (e) {
        return false;
    }
}

// ==================== VERIFICAR SE É CRIADOR DO GRUPO ====================
async function isCriadorGrupo(sock, chat, jid) {
    try {
        const metadata = await sock.groupMetadata(chat);

        const idLimpo = limparId(jid);

        for (const p of metadata.participants) {
            const pId = String(p.id || '');
            const pLid = String(p.lid || '');
            const pJid = String(p.jid || p.phoneNumber || '');

            const pIdNum = limparId(pId);
            const pLidNum = limparId(pLid);
            const pJidNum = limparId(pJid);

            const ehEle =
                pIdNum === idLimpo ||
                pLidNum === idLimpo ||
                pJidNum === idLimpo ||
                mesmoId(pId, jid) ||
                mesmoId(pLid, jid) ||
                mesmoId(pJid, jid);

            if (ehEle && p.admin === 'superadmin') {
                return true;
            }
        }

        return false;
    } catch (e) {
        return false;
    }
}

// ==================== VERIFICAR SE TÁ NA LISTA PERMITIDA ====================
function isAdmPermitido(jid, chat, db) {
    const database = db || dbGlobal;
    if (!database?.admPermitidos) return false;
    if (!database.admPermitidos[chat]) return false;

    const lista = database.admPermitidos[chat];

    for (const adm of lista) {
        if (mesmoId(adm, jid)) return true;
    }

    return false;
}

// ==================== ADICIONAR À LISTA PERMITIDA ====================
function adicionarAdmPermitido(jid, chat, db) {
    const database = db || dbGlobal;
    if (!database.admPermitidos) database.admPermitidos = {};
    if (!database.admPermitidos[chat]) database.admPermitidos[chat] = [];

    const idLimpo = limparId(jid);

    if (!database.admPermitidos[chat].some(d => mesmoId(d, idLimpo))) {
        database.admPermitidos[chat].push(idLimpo);
        return true;
    }

    return false;
}

// ==================== REMOVER DA LISTA PERMITIDA ====================
function removerAdmPermitido(jid, chat, db) {
    const database = db || dbGlobal;
    if (!database?.admPermitidos) return false;
    if (!database.admPermitidos[chat]) return false;

    const antes = database.admPermitidos[chat].length;

    database.admPermitidos[chat] = database.admPermitidos[chat].filter(d => !mesmoId(d, jid));

    return database.admPermitidos[chat].length !== antes;
}

// ==================== VERIFICAR SE O BOT É ADMIN ====================
async function botEhAdmin(sock, chat) {
    try {
        const metadata = await sock.groupMetadata(chat);

        const botIds = [
            sock.user.id,
            sock.user.lid,
            sock.user.jid
        ].filter(Boolean);

        for (const p of metadata.participants) {
            const pId = String(p.id || '');
            const pLid = String(p.lid || '');
            const pJid = String(p.jid || p.phoneNumber || '');

            const ehBot = botIds.some(botId =>
                mesmoId(botId, pId) ||
                mesmoId(botId, pLid) ||
                mesmoId(botId, pJid)
            );

            if (ehBot) {
                return p.admin === 'admin' || p.admin === 'superadmin';
            }
        }

        return false;
    } catch (e) {
        return false;
    }
}

// ==================== AVISAR QUE O BOT NÃO É ADM ====================
async function avisarBotNaoEhAdm(sock, chat, db, salvarDB) {
    const chave = `bot_nao_adm_${chat}`;
    if (avisosEnviados.has(chave)) return;
    avisosEnviados.add(chave);

    try {
        await sock.sendMessage(chat, {
            text: `⚠️ *PROTEÇÃO DE ADM*\n\nO bot *precisa ser administrador* para proteger os ADMs deste grupo.\n\n📌 Promova o bot para admin.`
        });
    } catch (e) {}
}

// ==================== PROCESSAR MUDANÇA DE ADM ====================
async function processarMudancaAdm(sock, chat, quemFez, quemSofreu, acao, db, salvarDB, CONFIG) {
    try {
        // 🔥 VERIFICA SE A PROTEÇÃO TÁ ATIVA
        if (!db?.protecaoAdm?.[chat]) return false;

        // ============================================================
        // 🔥 SE QUEM FEZ A AÇÃO FOI O PRÓPRIO BOT → IGNORA
        // ============================================================
        if (ehBot(quemFez)) return false;

        // 🔥 VERIFICA SE O BOT É ADMIN
        const botAdmin = await botEhAdmin(sock, chat);
        if (!botAdmin) {
            await avisarBotNaoEhAdm(sock, chat, db, salvarDB);
            return false;
        }

        // 🔥 VERIFICA AS EXCEÇÕES
        if (await isDonoBot(quemFez, CONFIG, db)) return false;
        if (await isCriadorGrupo(sock, chat, quemFez)) return false;
        if (isAdmPermitido(quemFez, chat, db)) return false;

        // 🔥 VERIFICA SE QUEM SOFREU É O BOT → IGNORA
        if (ehBot(quemSofreu)) return false;

        // 🔥 VERIFICA SE É ADM
        const metadata = await sock.groupMetadata(chat);

        let quemFezEhAdmin = false;
        let quemSofreuEhAdmin = false;

        for (const p of metadata.participants) {
            const pId = String(p.id || '');
            const pLid = String(p.lid || '');
            const pJid = String(p.jid || p.phoneNumber || '');

            const ehQuemFez =
                mesmoId(pId, quemFez) ||
                mesmoId(pLid, quemFez) ||
                mesmoId(pJid, quemFez);

            const ehQuemSofreu =
                mesmoId(pId, quemSofreu) ||
                mesmoId(pLid, quemSofreu) ||
                mesmoId(pJid, quemSofreu);

            if (ehQuemFez) quemFezEhAdmin = p.admin === 'admin' || p.admin === 'superadmin';
            if (ehQuemSofreu) quemSofreuEhAdmin = p.admin === 'admin' || p.admin === 'superadmin';
        }

        // ============================================================
        // 🔥 CASO 1: PROMOÇÃO
        // ============================================================
        if (acao === 'promote') {
            if (!quemFezEhAdmin) return false;

            // 🔥 Se quem sofreu JÁ era admin, não é promoção real
            if (quemSofreuEhAdmin) return false;

            // 🔥 PUNIÇÃO: remove ADM dos dois
            try { await sock.groupParticipantsUpdate(chat, [quemFez], 'demote'); } catch (e) {}
            try { await sock.groupParticipantsUpdate(chat, [quemSofreu], 'demote'); } catch (e) {}

            return true;
        }

        // ============================================================
        // 🔥 CASO 2: REBAIXAMENTO
        // ============================================================
        if (acao === 'demote') {
            if (!quemFezEhAdmin) return false;
            if (!quemSofreuEhAdmin) return false;

            // 🔥 Repromove quem foi rebaixado
            try { await sock.groupParticipantsUpdate(chat, [quemSofreu], 'promote'); } catch (e) {}

            // 🔥 Rebaixa quem rebaixou
            try { await sock.groupParticipantsUpdate(chat, [quemFez], 'demote'); } catch (e) {}

            return true;
        }

        return false;

    } catch (error) {
        console.error('❌ Erro em processarMudancaAdm:', error.message);
        return false;
    }
}

// ==================== PROCESSAR BAN ====================
async function processarBan(sock, chat, quemFez, quemSofreu, db, salvarDB, CONFIG) {
    try {
        if (!db?.protecaoAdm?.[chat]) return false;

        // 🔥 SE QUEM FEZ FOI O BOT → IGNORA
        if (ehBot(quemFez)) return false;

        // 🔥 SE QUEM SOFREU FOI O BOT → IGNORA
        if (ehBot(quemSofreu)) return false;

        // 🔥 VERIFICA SE O BOT É ADMIN
        const botAdmin = await botEhAdmin(sock, chat);
        if (!botAdmin) {
            await avisarBotNaoEhAdm(sock, chat, db, salvarDB);
            return false;
        }

        // 🔥 VERIFICA AS EXCEÇÕES
        if (await isDonoBot(quemFez, CONFIG, db)) return false;
        if (await isCriadorGrupo(sock, chat, quemFez)) return false;
        if (isAdmPermitido(quemFez, chat, db)) return false;

        // 🔥 VERIFICA SE QUEM FEZ É ADM
        let quemFezEhAdmin = false;
        let quemSofreuEraAdmin = false;

        try {
            const metadata = await sock.groupMetadata(chat);

            for (const p of metadata.participants) {
                const pId = String(p.id || '');
                const pLid = String(p.lid || '');
                const pJid = String(p.jid || p.phoneNumber || '');

                const ehQuemFez =
                    mesmoId(pId, quemFez) ||
                    mesmoId(pLid, quemFez) ||
                    mesmoId(pJid, quemFez);

                const ehQuemSofreu =
                    mesmoId(pId, quemSofreu) ||
                    mesmoId(pLid, quemSofreu) ||
                    mesmoId(pJid, quemSofreu);

                if (ehQuemFez) quemFezEhAdmin = p.admin === 'admin' || p.admin === 'superadmin';
                if (ehQuemSofreu) quemSofreuEraAdmin = p.admin === 'admin' || p.admin === 'superadmin';
            }
        } catch (e) {}

        // 🔥 Se quem fez não é admin, não faz nada
        if (!quemFezEhAdmin) return false;

        // 🔥 Se quem sofreu era admin, pune quem baniu
        if (quemSofreuEraAdmin) {
            try { await sock.groupParticipantsUpdate(chat, [quemFez], 'remove'); } catch (e) {}
            return true;
        }

        return false;

    } catch (error) {
        console.error('❌ Erro em processarBan:', error.message);
        return false;
    }
}

// ==================== COMANDO PROTEÇÃO ADM ====================
async function cmdProtecaoAdm(chat, sock, sender, msg, args, enviarResposta, reagir, verificarAdmin, isDono, db, salvarDB, CONFIG) {
    // 🔥 VERIFICA AS EXCEÇÕES (dono OU criador do grupo)
    const donoBot = await isDonoBot(sender, CONFIG, db);
    const criador = await isCriadorGrupo(sock, chat, sender);

    if (!donoBot && !criador) {
        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🔒 *ACESSO NEGADO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ Apenas o *dono do bot* ou
┃ o *criador do grupo* podem
┃ usar este comando.

┃ ⚠️ Outros ADMs não contam.

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
            msg
        );
        return;
    }

    const acao = args[0]?.toLowerCase();

    if (!db.protecaoAdm) db.protecaoAdm = {};

    if (acao === 'on') {
        db.protecaoAdm[chat] = true;
        salvarDB();
        await enviarResposta(chat, sock, '🛡️ *PROTEÇÃO DE ADM ATIVADA!*', msg);
        await reagir(sock, chat, msg.key.id, '🛡️');
        return;
    }

    if (acao === 'off') {
        db.protecaoAdm[chat] = false;
        salvarDB();
        await enviarResposta(chat, sock, '🔓 *PROTEÇÃO DE ADM DESATIVADA!*', msg);
        await reagir(sock, chat, msg.key.id, '🔓');
        return;
    }

    const ativa = db.protecaoAdm[chat] === true;

    await enviarResposta(chat, sock,
        `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🛡️ *PROTEÇÃO DE ADM*
╰━━━━━━━━━━━━━━━━━━━━━⬢

📊 Status: ${ativa ? '✅ ATIVA' : '❌ DESATIVADA'}

📌 *Comandos:*
┃ ${CONFIG.prefix}protecaoadm on - Ativar
┃ ${CONFIG.prefix}protecaoadm off - Desativar

┃ ${CONFIG.prefix}admallowed @user - Permitir
┃ ${CONFIG.prefix}admallowed remove @user - Remover
┃ ${CONFIG.prefix}admallowed list - Listar

💡 *O que faz:*
┃ Se um ADM rebaixar outro ADM,
┃ o bot restaura o rebaixado e
┃ rebaixa quem rebaixou.

┃ Se um ADM banir outro ADM,
┃ o bot bane quem baniu.

┃ Se um ADM promover um membro,
┃ o bot remove ADM dos dois.

⚠️ *O bot NUNCA se pune sozinho.*

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
        msg
    );
}

// ==================== COMANDO ADMALLOWED ====================
async function cmdAdmAllowed(chat, sock, sender, msg, args, enviarResposta, reagir, verificarAdmin, isDono, db, salvarDB, CONFIG) {
    // 🔥 SÓ DONO OU CRIADOR
    const donoBot = await isDonoBot(sender, CONFIG, db);
    const criador = await isCriadorGrupo(sock, chat, sender);

    if (!donoBot && !criador) {
        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🔒 *ACESSO NEGADO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ Apenas o *dono do bot* ou
┃ o *criador do grupo* podem
┃ usar este comando.

┃ ⚠️ Outros ADMs não contam.

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
            msg
        );
        return;
    }

    const sub = args[0]?.toLowerCase();

    if (sub === 'list' || sub === 'lista') {
        const lista = db.admPermitidos?.[chat] || [];

        if (lista.length === 0) {
            await enviarResposta(chat, sock, '📋 Nenhum ADM permitido na lista!', msg);
            return;
        }

        let texto = `🛡️ *ADMs PERMITIDOS (${lista.length}):*\n\n`;
        for (const id of lista) {
            texto += `┃ • @${id}\n`;
        }

        const mentions = lista.map(id => `${id}@s.whatsapp.net`);
        await sock.sendMessage(chat, { text: texto, mentions }, { quoted: msg });
        return;
    }

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const alvo = mentioned[0] || quoted;

    if (!alvo) {
        await enviarResposta(chat, sock,
            `📌 Use:\n` +
            `▸ ${CONFIG.prefix}admallowed @user\n` +
            `▸ ${CONFIG.prefix}admallowed remove @user\n` +
            `▸ ${CONFIG.prefix}admallowed list`,
            msg
        );
        return;
    }

    if (sub === 'remove' || sub === 'remover') {
        const ok = removerAdmPermitido(alvo, chat, db);
        salvarDB();

        if (ok) {
            await enviarResposta(chat, sock, `⬜ @${limparId(alvo)} removido dos permitidos!`, msg, [alvo]);
            await reagir(sock, chat, msg.key.id, '⬜');
        } else {
            await enviarResposta(chat, sock, `⚠️ @${limparId(alvo)} não tá na lista!`, msg, [alvo]);
        }
        return;
    }

    const ok = adicionarAdmPermitido(alvo, chat, db);
    salvarDB();

    if (ok) {
        await enviarResposta(chat, sock, `🛡️ @${limparId(alvo)} agora é permitido!\n📌 Ele pode promover/rebaixar/banir sem punição.`, msg, [alvo]);
        await reagir(sock, chat, msg.key.id, '🛡️');
    } else {
        await enviarResposta(chat, sock, `⚠️ @${limparId(alvo)} já tá na lista!`, msg, [alvo]);
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    initModule,
    setSock,
    processarMudancaAdm,
    processarBan,
    cmdProtecaoAdm,
    cmdAdmAllowed,
    isDonoBot,
    isCriadorGrupo,
    isAdmPermitido,
    adicionarAdmPermitido,
    removerAdmPermitido,
    botEhAdmin,
    ehBot,
    limparId,
    mesmoId
};