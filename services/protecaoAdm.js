// ==================== PROTEÇÃO DE ADM ====================
// services/protecaoAdm.js
//
// Protege ADMs de outros ADMs mal-intencionados.
//
// Regras (quando ativado):
//   1. ADM rebaixa outro ADM → rebaixado volta + quem rebaixou perde ADM
//   2. ADM bane outro ADM    → quem baniu é banido
//   3. ADM promove membro    → os 2 perdem ADM
//   4. ADM bane membro       → tudo bem, não faz nada
//
// Exceções (podem fazer tudo sem punição):
//   - Dono do bot
//   - Criador do grupo (superadmin)
//   - ADMs na lista permitida
// ============================================================

// ==================== AVISOS DE SPAM ====================
// 🔥 Guarda avisos já enviados pra não spammar
const avisosEnviados = new Set();

// ==================== LIMPAR ID ====================
function limparId(jid) {
    if (!jid) return '';
    return String(jid).split('@')[0].split(':')[0];
}

// ==================== COMPARAR IDs ====================
function mesmoId(a, b) {
    if (!a || !b) return false;
    return limparId(a) === limparId(b);
}

// ==================== VERIFICAR SE É DONO DO BOT ====================
async function isDonoBot(jid, CONFIG, db) {
    const id = limparId(jid);

    if (!Array.isArray(CONFIG.donos)) CONFIG.donos = [];
    if (!Array.isArray(db?.donos)) db.donos = [];

    const todos = [...CONFIG.donos, ...db.donos];

    for (const dono of todos) {
        if (mesmoId(dono, id)) return true;
    }

    return false;
}

// ==================== VERIFICAR SE É CRIADOR DO GRUPO ====================
async function isCriadorGrupo(sock, chat, jid) {
    try {
        const metadata = await sock.groupMetadata(chat);

        // 🔥 O criador é o "superadmin" (owner)
        // O Baileys não tem um campo "owner" direto em alguns casos
        // Mas o `superadmin` geralmente é o criador

        const idLimpo = limparId(jid);

        for (const p of metadata.participants) {
            const pId = limparId(p.id);
            const pLid = limparId(p.lid);
            const pJid = limparId(p.jid || p.phoneNumber);

            const ehEle = pId === idLimpo || pLid === idLimpo || pJid === idLimpo;

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
    if (!db.admPermitidos) return false;
    if (!db.admPermitidos[chat]) return false;

    const lista = db.admPermitidos[chat];
    const idLimpo = limparId(jid);

    for (const adm of lista) {
        if (mesmoId(adm, idLimpo)) return true;
    }

    return false;
}

// ==================== ADICIONAR À LISTA PERMITIDA ====================
function adicionarAdmPermitido(jid, chat, db) {
    if (!db.admPermitidos) db.admPermitidos = {};
    if (!db.admPermitidos[chat]) db.admPermitidos[chat] = [];

    const idLimpo = limparId(jid);

    if (!db.admPermitidos[chat].some(d => mesmoId(d, idLimpo))) {
        db.admPermitidos[chat].push(idLimpo);
        return true;
    }

    return false;
}

// ==================== REMOVER DA LISTA PERMITIDA ====================
function removerAdmPermitido(jid, chat, db) {
    if (!db.admPermitidos) return false;
    if (!db.admPermitidos[chat]) return false;

    const idLimpo = limparId(jid);
    const antes = db.admPermitidos[chat].length;

    db.admPermitidos[chat] = db.admPermitidos[chat].filter(d => !mesmoId(d, idLimpo));

    return db.admPermitidos[chat].length !== antes;
}

// ==================== VERIFICAR SE O BOT É ADMIN ====================
async function botEhAdmin(sock, chat) {
    try {
        const metadata = await sock.groupMetadata(chat);
        const botId = limparId(sock.user.id);

        for (const p of metadata.participants) {
            const pId = limparId(p.id);
            const pLid = limparId(p.lid);
            const pJid = limparId(p.jid || p.phoneNumber);

            if (pId === botId || pLid === botId || pJid === botId) {
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
    // 🔥 SÓ AVISA UMA VEZ POR GRUPO
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
// 🔥 Chamado quando alguém é promovido ou rebaixado
async function processarMudancaAdm(sock, chat, quemFez, quemSofreu, acao, db, salvarDB, CONFIG) {
    try {
        // 🔥 VERIFICA SE A PROTEÇÃO TÁ ATIVA NESSE GRUPO
        if (!db.protecaoAdm?.[chat]) return false;

        // 🔥 VERIFICA SE O BOT É ADMIN
        const botAdmin = await botEhAdmin(sock, chat);
        if (!botAdmin) {
            await avisarBotNaoEhAdm(sock, chat, db, salvarDB);
            return false;
        }

        // 🔥 VERIFICA AS EXCEÇÕES (quem fez a ação)
        if (await isDonoBot(quemFez, CONFIG, db)) return false;
        if (await isCriadorGrupo(sock, chat, quemFez)) return false;
        if (isAdmPermitido(quemFez, chat, db)) return false;

        // 🔥 VERIFICA SE ELE TÁ AGINDO CONTRA OUTRO ADM
        const metadata = await sock.groupMetadata(chat);

        let quemFezEhAdmin = false;
        let quemSofreuEhAdmin = false;

        for (const p of metadata.participants) {
            const pId = limparId(p.id);
            const pLid = limparId(p.lid);
            const pJid = limparId(p.jid || p.phoneNumber);

            const ehQuemFez = pId === limparId(quemFez) || pLid === limparId(quemFez) || pJid === limparId(quemFez);
            const ehQuemSofreu = pId === limparId(quemSofreu) || pLid === limparId(quemSofreu) || pJid === limparId(quemSofreu);

            if (ehQuemFez) quemFezEhAdmin = p.admin === 'admin' || p.admin === 'superadmin';
            if (ehQuemSofreu) quemSofreuEhAdmin = p.admin === 'admin' || p.admin === 'superadmin';
        }

        // ============================================================
        // 🔥 CASO 1: PROMOÇÃO (alguém promoveu um membro comum)
        // ============================================================
        if (acao === 'promote') {
            // 🔥 SÓ PUNE SE PROMOVEU UM MEMBRO COMUM (não-ADM)
            if (!quemFezEhAdmin) return false;

            // 🔥 QUEM FOI PROMOVIDO NÃO ERA ADM
            if (!quemSofreuEhAdmin || acao === 'promote') {
                // 🔥 PUNIÇÃO: remove ADM dos dois
                try {
                    // Rebaixa quem promoveu
                    await sock.groupParticipantsUpdate(chat, [quemFez], 'demote');
                } catch (e) {}

                try {
                    // Rebaixa quem foi promovido
                    await sock.groupParticipantsUpdate(chat, [quemSofreu], 'demote');
                } catch (e) {}

                return true;
            }
        }

        // ============================================================
        // 🔥 CASO 2: REBAIXAMENTO (ADM rebaixou outro ADM)
        // ============================================================
        if (acao === 'demote') {
            // 🔥 SÓ PUNE SE QUEM FEZ É ADM E QUEM SOFREU ERA ADM
            if (!quemFezEhAdmin) return false;

            // 🔥 REPROMOVE QUEM FOI REBAIXADO
            try {
                await sock.groupParticipantsUpdate(chat, [quemSofreu], 'promote');
            } catch (e) {}

            // 🔥 REBAIXA QUEM REBAIXOU
            try {
                await sock.groupParticipantsUpdate(chat, [quemFez], 'demote');
            } catch (e) {}

            return true;
        }

        return false;

    } catch (error) {
        return false;
    }
}

// ==================== PROCESSAR BAN ====================
// 🔥 Chamado quando alguém foi removido do grupo
async function processarBan(sock, chat, quemFez, quemSofreu, db, salvarDB, CONFIG) {
    try {
        // 🔥 VERIFICA SE A PROTEÇÃO TÁ ATIVA
        if (!db.protecaoAdm?.[chat]) return false;

        // 🔥 VERIFICA SE O BOT É ADMIN
        const botAdmin = await botEhAdmin(sock, chat);
        if (!botAdmin) {
            await avisarBotNaoEhAdm(sock, chat, db, salvarDB);
            return false;
        }

        // 🔥 VERIFICA SE O BOT FEZ A AÇÃO (não pune a si mesmo)
        if (mesmoId(quemFez, sock.user.id)) return false;

        // 🔥 VERIFICA AS EXCEÇÕES
        if (await isDonoBot(quemFez, CONFIG, db)) return false;
        if (await isCriadorGrupo(sock, chat, quemFez)) return false;
        if (isAdmPermitido(quemFez, chat, db)) return false;

        // 🔥 VERIFICA SE QUEM SOFREU ERA ADM
        // ⚠️ Como a pessoa já saiu, precisamos checar pelo cache ou assumir
        // Vou verificar pelo metadata (pode estar lá ainda)

        let quemSofreuEraAdmin = false;

        try {
            const metadata = await sock.groupMetadata(chat);

            for (const p of metadata.participants) {
                const pId = limparId(p.id);
                const pLid = limparId(p.lid);
                const pJid = limparId(p.jid || p.phoneNumber);

                const ehEle = pId === limparId(quemSofreu) || pLid === limparId(quemSofreu) || pJid === limparId(quemSofreu);

                if (ehEle) {
                    quemSofreuEraAdmin = p.admin === 'admin' || p.admin === 'superadmin';
                    break;
                }
            }
        } catch (e) {}

        // 🔥 SE NÃO SABEMOS SE ERA ADM, PUNE POR SEGURANÇA
        // (só se quem fez é ADM)
        let quemFezEhAdmin = false;

        try {
            const metadata = await sock.groupMetadata(chat);

            for (const p of metadata.participants) {
                const pId = limparId(p.id);
                const pLid = limparId(p.lid);
                const pJid = limparId(p.jid || p.phoneNumber);

                const ehEle = pId === limparId(quemFez) || pLid === limparId(quemFez) || pJid === limparId(quemFez);

                if (ehEle) {
                    quemFezEhAdmin = p.admin === 'admin' || p.admin === 'superadmin';
                    break;
                }
            }
        } catch (e) {}

        // 🔥 SE QUEM FEZ NÃO É ADM, NÃO FAZ NADA
        if (!quemFezEhAdmin) return false;

        // 🔥 SE QUEM SOFREU ERA ADM, PUNE QUEM BANIU
        if (quemSofreuEraAdmin) {
            try {
                await sock.groupParticipantsUpdate(chat, [quemFez], 'remove');
            } catch (e) {}

            return true;
        }

        // 🔥 SE NÃO SABEMOS SE ERA ADM, NÃO PUNE (fica mais seguro)
        return false;

    } catch (error) {
        return false;
    }
}

// ==================== COMANDO PROTEÇÃO ADM ====================
async function cmdProtecaoAdm(chat, sock, sender, msg, args, enviarResposta, reagir, verificarAdmin, isDono, db, salvarDB, CONFIG) {
    // 🔥 SÓ ADM
    const isAdmin = await verificarAdmin(sock, chat, sender);
    if (!isAdmin) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    // 🔥 VERIFICA AS EXCEÇÕES
    const donoBot = await isDonoBot(sender, CONFIG, db);
    const criador = await isCriadorGrupo(sock, chat, sender);

    if (!donoBot && !criador) {
        await enviarResposta(chat, sock,
            `🔒 Apenas o *dono do bot* ou o *criador do grupo* podem usar este comando!`,
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

    // 🔥 STATUS
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
        await enviarResposta(chat, sock, '🔒 Apenas o *dono do bot* ou o *criador do grupo*!', msg);
        return;
    }

    const sub = args[0]?.toLowerCase();

    // 🔥 LIST
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

    // 🔥 PEGA O ALVO
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

    // 🔥 REMOVE
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

    // 🔥 ADD (padrão)
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
    limparId,
    mesmoId
};