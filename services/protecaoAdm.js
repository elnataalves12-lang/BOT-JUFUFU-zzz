// ==================== PROTEÇÃO DE ADM ====================
// services/protecaoAdm.js
//
// Regras (quando ativado):
//   1. ADM rebaixa outro ADM → repromove o rebaixado + rebaixa quem rebaixou
//   2. ADM bane outro ADM    → rebaixa quem baniu (não bane ninguém)
//   3. ADM promove alguém    → rebaixa quem promoveu + rebaixa quem foi promovido
//
// Exceções (não são punidos):
//   - Dono do bot
//   - Criador do grupo (superadmin OU metadata.owner)
//   - ADMs na lista permitida
//   - O próprio bot
//
// ⚠️ O BOT NUNCA SE PUNE (nem rebaixa, nem promove)
// ============================================================

// ==================== VARIÁVEIS ====================
let dbGlobal = null;
let sockGlobal = null;
let CONFIG_GLOBAL = null;

// ==================== AVISOS DE SPAM ====================
const avisosEnviados = new Set();

// ==================== CACHE DO BOT ADMIN ====================
const _cacheBotAdmin = new Map();
const CACHE_TTL = 30 * 1000;

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

// ==================== NORMALIZAR ID ====================
function normalizarId(id) {
    if (!id) return '';
    return String(id).split(':')[0];
}

// ==================== IDS DO PARTICIPANTE ====================
function idsDoParticipante(p) {
    if (!p) return [];
    return [p.id, p.jid, p.lid, p.phoneNumber]
        .filter(Boolean)
        .map(normalizarId)
        .filter(Boolean);
}

// ==================== MESMO PARTICIPANTE ====================
function mesmoParticipante(jid, p) {
    if (!jid || !p) return false;
    const alvo = normalizarId(jid);
    const ids = idsDoParticipante(p);

    if (ids.includes(alvo)) return true;

    // 🔥 Fallback por número
    const alvoNumero = alvo.split('@')[0].replace(/\D/g, '');
    if (alvoNumero.length >= 10) {
        for (const id of ids) {
            const idNumero = id.split('@')[0].replace(/\D/g, '');
            if (idNumero === alvoNumero) return true;
        }
    }

    return false;
}

// ==================== É O BOT? ====================
function ehBot(jid) {
    if (!sockGlobal?.user || !jid) return false;

    const botIds = [
        sockGlobal.user.id,
        sockGlobal.user.lid,
        sockGlobal.user.jid,
        sockGlobal.user.phoneNumber
    ]
        .filter(Boolean)
        .map(normalizarId)
        .filter(Boolean);

    const alvo = normalizarId(jid);

    if (botIds.includes(alvo)) return true;

    // 🔥 Fallback por número
    const alvoNumero = alvo.split('@')[0].replace(/\D/g, '');
    if (alvoNumero.length >= 10) {
        for (const botId of botIds) {
            const botNumero = botId.split('@')[0].replace(/\D/g, '');
            if (botNumero === alvoNumero) return true;
        }
    }

    return false;
}

// ==================== É DONO DO BOT? ====================
// ==================== É DONO DO BOT? ====================
async function isDonoBot(jid, CONFIG, db) {
    try {
        // 🔧 resolve config/db com fallback seguro
        const cfg      = CONFIG || (typeof CONFIG_GLOBAL !== 'undefined' ? CONFIG_GLOBAL : null);
        const database = db     || (typeof dbGlobal     !== 'undefined' ? dbGlobal     : null);

        if (!cfg || !database || !jid) return false;

        if (!Array.isArray(cfg.donos))      cfg.donos = [];
        if (!Array.isArray(database.donos)) database.donos = [];

        // 🔧 helper: só dígitos
        const soDigitos = (s) => String(s || '').replace(/\D/g, '');

        // 🔧 helper: normaliza JID (remove @s.whatsapp.net, @lid, @c.us, etc.)
        const normJid = (id) => {
            if (!id) return '';
            if (typeof normalizarId === 'function') {
                try { return normalizarId(id); } catch (_) {}
            }
            // fallback: mantém o @domain
            return String(id);
        };

        // 🔧 normaliza número BR (remove o 9 extra de celular)
        // ex: 5511999999999 (13) → 551199999999 (12)
        const normNumBR = (num) => {
            const n = soDigitos(num);
            if (n.length === 13 && n.startsWith('55') && n[4] === '9') {
                return n.slice(0, 4) + n.slice(5);
            }
            return n;
        };

        // 🔧 pré-processa donos uma única vez (evita recalcular)
        const todos = [...cfg.donos, ...database.donos].filter(Boolean);
        const donosNorm = todos.map(d => {
            const jidLimpo = normJid(d);
            const numBruto = soDigitos(String(jidLimpo).split('@')[0]);
            return {
                jid: jidLimpo,
                num: numBruto,
                numBR: normNumBR(numBruto),
            };
        }).filter(d => d.jid || d.num);

        const alvo       = normJid(jid);
        const alvoNum    = soDigitos(String(alvo).split('@')[0]);
        const alvoNumBR  = normNumBR(alvoNum);

        // 🔥 1. COMPARAÇÃO DIRETA (JID completo)
        for (const d of donosNorm) {
            if (d.jid && d.jid === alvo) return true;
        }

        // 🔥 2. COMPARAÇÃO POR NÚMERO (com e sem o 9º dígito)
        if (alvoNum.length >= 10) {
            for (const d of donosNorm) {
                if (!d.num) continue;
                // compara exato
                if (d.num === alvoNum) return true;
                // compara normalizado BR (ignora o 9 extra)
                if (d.numBR && d.numBR === alvoNumBR) return true;
            }
        }

        // 🔥 3. SE O ALVO FOR @lid → descobre o número real (com cache)
        if (String(alvo).includes('@lid')) {
            try {
                const mapa = await getMapaLidParaNumero();
                const numeroReal = mapa.get(alvo);
                if (numeroReal) {
                    const numNorm = normNumBR(soDigitos(numeroReal));
                    for (const d of donosNorm) {
                        if (d.numBR && d.numBR === numNorm) return true;
                        if (d.num   && d.num   === soDigitos(numeroReal)) return true;
                    }
                }
            } catch (e) {
                console.error('[isDonoBot] erro @lid:', e?.message);
            }
        }

        return false;
    } catch (e) {
        console.error('[isDonoBot] erro geral:', e?.message);
        return false;
    }
}

// ==================== CACHE @lid → número ====================
let _cacheLidMap = null;
let _cacheLidTs  = 0;
const _CACHE_LID_TTL = 5 * 60 * 1000; // 5 min

async function getMapaLidParaNumero(force = false) {
    const agora = Date.now();
    if (!force && _cacheLidMap && (agora - _cacheLidTs) < _CACHE_LID_TTL) {
        return _cacheLidMap;
    }

    const mapa = new Map();
    try {
        if (typeof sockGlobal === 'undefined' || !sockGlobal?.groupFetchAllParticipating) {
            return _cacheLidMap || mapa;
        }

        const groups = await sockGlobal.groupFetchAllParticipating();

        for (const group of Object.values(groups || {})) {
            if (!group?.participants) continue;

            for (const p of group.participants) {
                // idsDoParticipante deve retornar [jid, lid, ...]
                const ids = (typeof idsDoParticipante === 'function')
                    ? idsDoParticipante(p)
                    : [p.id, p.lid, p.jid].filter(Boolean);

                const lid = ids.find(i => String(i).endsWith('@lid'));
                const num = ids.find(i => String(i).endsWith('@s.whatsapp.net'));

                if (lid && num) {
                    mapa.set(lid, String(num).split('@')[0]);
                }
            }
        }

        _cacheLidMap = mapa;
        _cacheLidTs  = agora;
    } catch (e) {
        console.error('[getMapaLidParaNumero] erro:', e?.message);
    }

    return _cacheLidMap || mapa;
}
// ==================== É CRIADOR DO GRUPO? ====================
async function isCriadorGrupo(sock, chat, jid) {
    try {
        const metadata = await sock.groupMetadata(chat);
        const alvo = normalizarId(jid);
        const alvoNumero = alvo.split('@')[0].replace(/\D/g, '');

        // 🔥 1. VERIFICA PELO metadata.owner
        if (metadata.owner) {
            const donoOriginal = normalizarId(metadata.owner);
            const donoNumero = donoOriginal.split('@')[0].replace(/\D/g, '');

            if (donoOriginal === alvo) return true;
            if (alvoNumero.length >= 10 && donoNumero === alvoNumero) return true;
        }

        // 🔥 2. VERIFICA PELO metadata.author
        if (metadata.author) {
            const autor = normalizarId(metadata.author);
            const autorNumero = autor.split('@')[0].replace(/\D/g, '');

            if (autor === alvo) return true;
            if (alvoNumero.length >= 10 && autorNumero === alvoNumero) return true;
        }

        // 🔥 3. VERIFICA PELO superadmin
        for (const p of metadata.participants || []) {
            if (p.admin !== 'superadmin') continue;

            const ids = idsDoParticipante(p);
            const numeros = ids.map(id => id.split('@')[0].replace(/\D/g, '')).filter(n => n.length >= 10);

            if (ids.includes(alvo)) return true;
            if (alvoNumero.length >= 10 && numeros.includes(alvoNumero)) return true;
        }

        return false;

    } catch (e) {
        return false;
    }
}

// ==================== LISTA PERMITIDA ====================
function isAdmPermitido(jid, chat, db) {
    const database = db || dbGlobal;
    if (!database?.admPermitidos?.[chat]) return false;

    const alvo = normalizarId(jid);
    const alvoNumero = alvo.split('@')[0].replace(/\D/g, '');

    if (database.admPermitidos[chat].some(id => normalizarId(id) === alvo)) return true;

    if (alvoNumero.length >= 10) {
        for (const id of database.admPermitidos[chat]) {
            const idNumero = normalizarId(id).split('@')[0].replace(/\D/g, '');
            if (idNumero === alvoNumero) return true;
        }
    }

    return false;
}

function adicionarAdmPermitido(jid, chat, db) {
    const database = db || dbGlobal;

    if (ehBot(jid)) return { ok: false, motivo: 'bot' };

    if (!database.admPermitidos) database.admPermitidos = {};
    if (!database.admPermitidos[chat]) database.admPermitidos[chat] = [];

    const alvo = normalizarId(jid);

    if (!isAdmPermitido(alvo, chat, db)) {
        database.admPermitidos[chat].push(alvo);
        return { ok: true };
    }

    return { ok: false, motivo: 'já' };
}

function removerAdmPermitido(jid, chat, db) {
    const database = db || dbGlobal;
    if (!database?.admPermitidos?.[chat]) return false;

    const alvo = normalizarId(jid);
    const antes = database.admPermitidos[chat].length;

    database.admPermitidos[chat] = database.admPermitidos[chat].filter(
        id => normalizarId(id) !== alvo
    );

    return database.admPermitidos[chat].length !== antes;
}

// ==================== BOT É ADMIN? (COM CACHE) ====================
async function botEhAdmin(sock, chat) {
    try {
        const cache = _cacheBotAdmin.get(chat);
        if (cache && Date.now() < cache.expira) return cache.admin;

        const metadata = await sock.groupMetadata(chat);

        const botIds = [
            sock.user?.id,
            sock.user?.lid,
            sock.user?.jid,
            sock.user?.phoneNumber
        ]
            .filter(Boolean)
            .map(normalizarId)
            .filter(Boolean);

        const botNumeros = botIds
            .map(id => id.split('@')[0].replace(/\D/g, ''))
            .filter(n => n.length >= 10);

        let ehAdmin = false;

        for (const p of metadata.participants || []) {
            const ids = idsDoParticipante(p);
            const numeros = ids
                .map(id => id.split('@')[0].replace(/\D/g, ''))
                .filter(n => n.length >= 10);

            const corresponde = ids.some(id => botIds.includes(id)) ||
                numeros.some(n => botNumeros.includes(n));

            if (corresponde) {
                ehAdmin = p.admin === 'admin' || p.admin === 'superadmin';
                break;
            }
        }

        _cacheBotAdmin.set(chat, {
            admin: ehAdmin,
            expira: Date.now() + CACHE_TTL
        });

        return ehAdmin;
    } catch (e) {
        const cache = _cacheBotAdmin.get(chat);
        if (cache) return cache.admin;
        return false;
    }
}

function limparCacheBotAdmin(chat) {
    if (chat) _cacheBotAdmin.delete(chat);
    else _cacheBotAdmin.clear();
}

// ==================== AVISAR BOT NÃO É ADM ====================
async function avisarBotNaoEhAdm(sock, chat) {
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
        if (!db?.protecaoAdm?.[chat]) return false;

        if (ehBot(quemFez)) return false;
        if (ehBot(quemSofreu)) return false;

        const botAdmin = await botEhAdmin(sock, chat);
        if (!botAdmin) {
            await avisarBotNaoEhAdm(sock, chat);
            return false;
        }

        if (await isDonoBot(quemFez, CONFIG, db)) return false;
        if (await isCriadorGrupo(sock, chat, quemFez)) return false;
        if (isAdmPermitido(quemFez, chat, db)) return false;

        const metadata = await sock.groupMetadata(chat);

        let quemFezEhAdmin = false;
        let quemSofreuEhAdmin = false;

        for (const p of metadata.participants || []) {
            if (mesmoParticipante(quemFez, p)) {
                quemFezEhAdmin = p.admin === 'admin' || p.admin === 'superadmin';
            }
            if (mesmoParticipante(quemSofreu, p)) {
                quemSofreuEhAdmin = p.admin === 'admin' || p.admin === 'superadmin';
            }
        }

        if (!quemFezEhAdmin) return false;

        if (acao === 'promote') {
            try { await sock.groupParticipantsUpdate(chat, [quemFez], 'demote'); } catch (e) {}
            try { await sock.groupParticipantsUpdate(chat, [quemSofreu], 'demote'); } catch (e) {}
            return true;
        }

        if (acao === 'demote') {
            try { await sock.groupParticipantsUpdate(chat, [quemSofreu], 'promote'); } catch (e) {}
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

        if (ehBot(quemFez)) return false;
        if (ehBot(quemSofreu)) return false;

        const botAdmin = await botEhAdmin(sock, chat);
        if (!botAdmin) {
            await avisarBotNaoEhAdm(sock, chat);
            return false;
        }

        if (await isDonoBot(quemFez, CONFIG, db)) return false;
        if (await isCriadorGrupo(sock, chat, quemFez)) return false;
        if (isAdmPermitido(quemFez, chat, db)) return false;

        let quemFezEhAdmin = false;
        let quemSofreuEraAdmin = false;

        try {
            const metadata = await sock.groupMetadata(chat);

            for (const p of metadata.participants || []) {
                if (mesmoParticipante(quemFez, p)) {
                    quemFezEhAdmin = p.admin === 'admin' || p.admin === 'superadmin';
                }
                if (mesmoParticipante(quemSofreu, p)) {
                    quemSofreuEraAdmin = p.admin === 'admin' || p.admin === 'superadmin';
                }
            }
        } catch (e) {}

        if (!quemFezEhAdmin) return false;

        if (quemSofreuEraAdmin) {
            try { await sock.groupParticipantsUpdate(chat, [quemFez], 'demote'); } catch (e) {}
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
    const ehAdm = await verificarAdmin(sock, chat, sender);
    const ehDono = await isDonoBot(sender, CONFIG, db);

    if (!ehAdm && !ehDono) {
        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🔒 *ACESSO NEGADO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ Apenas *ADMs* ou o
┃ *dono do bot* podem
┃ usar este comando.

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

        if (!db.admPermitidos) db.admPermitidos = {};
        if (!db.admPermitidos[chat]) db.admPermitidos[chat] = [];

        // 🔥 ADICIONA O BOT NA LISTA
        try {
            const metadata = await sock.groupMetadata(chat);
            const botIds = [
                sock.user?.id,
                sock.user?.lid,
                sock.user?.jid,
                sock.user?.phoneNumber
            ].filter(Boolean).map(normalizarId);

            for (const p of metadata.participants || []) {
                const ids = idsDoParticipante(p);
                if (ids.some(id => botIds.includes(id))) {
                    for (const id of ids) {
                        if (!db.admPermitidos[chat].includes(id)) {
                            db.admPermitidos[chat].push(id);
                        }
                    }
                    break;
                }
            }
        } catch (e) {}

        // 🔥 ADICIONA O DONO NA LISTA
        const donos = [...(CONFIG.donos || []), ...(db.donos || [])].filter(Boolean).map(normalizarId);
        for (const dono of donos) {
            if (!db.admPermitidos[chat].includes(dono)) {
                db.admPermitidos[chat].push(dono);
            }
        }

        // 🔥 ADICIONA O CRIADOR DO GRUPO NA LISTA
        try {
            const metadata = await sock.groupMetadata(chat);

            for (const p of metadata.participants || []) {
                if (p.admin !== 'superadmin') continue;
                const ids = idsDoParticipante(p);
                for (const id of ids) {
                    if (!db.admPermitidos[chat].includes(id)) {
                        db.admPermitidos[chat].push(id);
                    }
                }
            }

            if (metadata.owner) {
                const donoOriginal = normalizarId(metadata.owner);
                if (!db.admPermitidos[chat].includes(donoOriginal)) {
                    db.admPermitidos[chat].push(donoOriginal);
                }
            }

            if (metadata.author) {
                const autor = normalizarId(metadata.author);
                if (!db.admPermitidos[chat].includes(autor)) {
                    db.admPermitidos[chat].push(autor);
                }
            }
        } catch (e) {}

        salvarDB();
        limparCacheBotAdmin(chat);
        await enviarResposta(chat, sock, '🛡️ *PROTEÇÃO DE ADM ATIVADA!*', msg);
        await reagir(sock, chat, msg.key.id, '🛡️');
        return;
    }

    if (acao === 'off') {
        db.protecaoAdm[chat] = false;
        salvarDB();
        limparCacheBotAdmin(chat);
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
┃ o bot SÓ REBAIXA quem baniu.

┃ Se um ADM promover alguém,
┃ o bot rebaixa os dois.

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
        msg
    );
}

// ==================== COMANDO ADMALLOWED ====================
async function cmdAdmAllowed(chat, sock, sender, msg, args, enviarResposta, reagir, verificarAdmin, isDono, db, salvarDB, CONFIG) {
    const ehDono = await isDonoBot(sender, CONFIG, db);
    const ehCriador = await isCriadorGrupo(sock, chat, sender);

    if (!ehDono && !ehCriador) {
        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🔒 *ACESSO NEGADO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ Apenas o *dono do bot* ou
┃ o *criador do grupo* podem
┃ usar este comando.

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
        const mentions = [];

        for (const id of lista) {
            const idStr = String(id);
            texto += `┃ • @${idStr.split('@')[0]}\n`;
            mentions.push(idStr);
        }

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
            await enviarResposta(chat, sock, `⬜ @${String(alvo).split('@')[0]} removido dos permitidos!`, msg, [alvo]);
            await reagir(sock, chat, msg.key.id, '⬜');
        } else {
            await enviarResposta(chat, sock, `⚠️ @${String(alvo).split('@')[0]} não tá na lista!`, msg, [alvo]);
        }
        return;
    }

    const result = adicionarAdmPermitido(alvo, chat, db);

    if (result.motivo === 'bot') {
        await enviarResposta(chat, sock, `❌ Não posso me adicionar à lista (senão eu me auto-rebaixaria)!`, msg);
        return;
    }

    salvarDB();

    if (result.ok) {
        await enviarResposta(chat, sock, `🛡️ @${String(alvo).split('@')[0]} agora é permitido!\n📌 Ele pode promover/rebaixar/banir sem punição.`, msg, [alvo]);
        await reagir(sock, chat, msg.key.id, '🛡️');
    } else {
        await enviarResposta(chat, sock, `⚠️ @${String(alvo).split('@')[0]} já tá na lista!`, msg, [alvo]);
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
    normalizarId,
    idsDoParticipante,
    mesmoParticipante,
    limparCacheBotAdmin
};