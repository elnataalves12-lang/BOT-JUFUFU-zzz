// ==================== STATUS DE GRUPO ====================
// services/groupStatus.js
//
// Status de grupo (balão no topo) + anti-status
//
// Comandos:
//   °statusgrupo <texto>       → 1 status de texto
//   °statusgrupo3 <texto>      → 3 status de texto
//   °statusgrupo (na foto)     → foto sem texto
//   °statusgrupo <legenda> (foto) → foto com texto
//   (responder foto) °statusgrupo → publicar foto
//   °antistatus on/off         → ativar/desativar proteção
//   °listarstatus              → listar os próprios status
//   °apagarstatus todos        → apagar todos
//   °apagarstatus 2            → apagar o 2º
// ============================================================

const {
    generateWAMessageFromContent,
    prepareWAMessageMedia,
    downloadMediaMessage
} = require('@whiskeysockets/baileys');

const {
    existsSync,
    readFileSync,
    writeFileSync,
    renameSync
} = require('fs');

const path = require('path');

// ==================== CONFIGURAÇÃO ====================
const ARQUIVO = path.join(process.cwd(), 'status-dados.json');
const MAX_FOTO = 10 * 1024 * 1024;
const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));
const numero = jid => String(jid || '').split('@')[0].split(':')[0];
const cores = [0xff128c7e, 0xff1e88e5, 0xffe53935];

// ==================== VARIÁVEIS ====================
let db = null;
let salvarDB = null;
let verificarAdmin = null;
let isDono = null;
let CONFIG = null;

// ==================== DADOS ====================
let dados = { anti: [], enviados: {} };
if (existsSync(ARQUIVO)) {
    try {
        dados = JSON.parse(readFileSync(ARQUIVO, 'utf8'));
        dados.anti ||= [];
        dados.enviados ||= {};
    } catch (e) {
        console.error('❌ Erro ao ler status-dados.json:', e.message);
    }
}

function salvar() {
    try {
        writeFileSync(`${ARQUIVO}.tmp`, JSON.stringify(dados, null, 2));
        renameSync(`${ARQUIVO}.tmp`, ARQUIVO);
    } catch (e) {
        console.error('❌ Erro ao salvar:', e.message);
    }
}

// ==================== INICIALIZAR ====================
function initModule(dbInstance, salvarDBFn, verificarAdminFn, isDonoFn, configInstance) {
    db = dbInstance;
    salvarDB = salvarDBFn;
    verificarAdmin = verificarAdminFn;
    isDono = isDonoFn;
    CONFIG = configInstance || require('../config.js');
    console.log('✅ Módulo GroupStatus inicializado!');
}

// ==================== WRAPPERS ====================
const wrappers = [
    'ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2',
    'viewOnceMessageV2Extension', 'documentWithCaptionMessage',
    'editedMessage', 'associatedChildMessage'
];

function desembrulhar(message) {
    let atual = message;
    for (let i = 0; atual && i < 16; i++) {
        const chave = wrappers.find(k => atual[k]?.message);
        if (!chave) break;
        atual = atual[chave].message;
    }
    return atual || {};
}

// ==================== DETECTAR STATUS ====================
function detectarStatus(message) {
    const pendentes = [message];
    const vistos = new Set();
    const formatos = [
        'groupStatusMessageV2', 'groupStatusMessage',
        'groupStatusMentionMessage', 'statusMentionMessage'
    ];
    const midias = [
        'extendedTextMessage', 'imageMessage', 'videoMessage',
        'audioMessage', 'documentMessage', 'stickerMessage'
    ];

    for (let i = 0; pendentes.length && i < 64; i++) {
        const atual = pendentes.pop();
        if (!atual || typeof atual !== 'object' ||
            atual instanceof Uint8Array || vistos.has(atual)) continue;
        vistos.add(atual);

        if (formatos.some(k => atual[k] && typeof atual[k] === 'object')) return true;
        if (midias.some(k => atual[k]?.contextInfo?.isGroupStatus === true)) return true;

        const protocolo = atual.protocolMessage;
        if (protocolo?.type === 25 &&
            protocolo.key?.remoteJid === 'status@broadcast') return true;

        for (const k of wrappers) {
            if (atual[k]?.message) pendentes.push(atual[k].message);
        }
    }
    return false;
}

// ==================== PERMISSÃO ====================
async function permissao(sock, jid, sender) {
    const meta = await sock.groupMetadata(jid);
    const minhasIdentidades = [sock.user?.id, sock.user?.lid]
        .filter(Boolean).map(numero);
    const eu = meta.participants.find(p =>
        [p.id, p.lid, p.phoneNumber].some(v =>
            v && minhasIdentidades.includes(numero(v))));
    const autor = sender ? meta.participants.find(p =>
        [p.id, p.lid, p.phoneNumber].includes(sender)) : null;
    return { eu, autor };
}

// ==================== ENVIAR STATUS ====================
async function enviarStatusGrupo(sock, jid, { text = '', image, quantidade = 1 } = {}) {
    if (!sock?.user?.id || !jid?.endsWith('@g.us')) {
        throw new Error('WhatsApp desconectado ou grupo inválido.');
    }
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 5) {
        throw new Error('Escolha de 1 a 5 status.');
    }
    text = String(text).slice(0, 700);
    if (!image && !text.trim()) throw new Error('Envie texto ou uma foto.');
    if (image && (!Buffer.isBuffer(image) || !image.length || image.length > MAX_FOTO)) {
        throw new Error('A foto deve ser um Buffer de até 10 MB.');
    }

    let conteudo;
    if (image) {
        const media = await prepareWAMessageMedia(
            { image }, { upload: sock.waUploadToServer }
        );
        if (!media.imageMessage) throw new Error('Falha ao preparar a foto.');
        conteudo = {
            imageMessage: {
                ...media.imageMessage,
                caption: text || undefined,
                contextInfo: {
                    ...media.imageMessage.contextInfo,
                    isGroupStatus: true
                }
            }
        };
    } else {
        conteudo = {
            extendedTextMessage: {
                text,
                font: 1,
                textArgb: 0xffffffff,
                backgroundArgb: cores[Math.floor(Math.random() * cores.length)],
                contextInfo: { isGroupStatus: true }
            }
        };
    }

    const ids = [];
    for (let i = 0; i < quantidade; i++) {
        const msg = generateWAMessageFromContent(jid, {
            groupStatusMessageV2: { message: conteudo }
        }, { userJid: sock.user.id });
        await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
        (dados.enviados[jid] ||= []).push({
            id: msg.key.id,
            text: text.slice(0, 40) || 'Foto',
            ts: Date.now()
        });
        salvar();
        ids.push(msg.key.id);
        if (i < quantidade - 1) await esperar(5000);
    }
    return ids;
}

// ==================== LISTAR STATUS ====================
function listarStatus(jid) {
    return (dados.enviados[jid] || []).map(x => ({ ...x }));
}

// ==================== APAGAR STATUS ====================
async function apagarStatus(sock, jid, indice) {
    const lista = listarStatus(jid);
    if (indice !== undefined && (!Number.isInteger(indice) ||
        indice < 1 || indice > lista.length)) {
        throw new Error('Número inválido; consulte °listarstatus.');
    }
    const alvos = indice === undefined ? lista : [lista[indice - 1]];
    let pedidos = 0, falhas = 0;
    for (const item of alvos) {
        try {
            await sock.sendMessage(jid, {
                delete: { remoteJid: jid, fromMe: true, id: item.id }
            });
            dados.enviados[jid] = (dados.enviados[jid] || [])
                .filter(x => x.id !== item.id);
            salvar();
            pedidos++;
        } catch { falhas++; }
        if (alvos.length > 1) await esperar(1500);
    }
    return { pedidos, falhas };
}

// ==================== COMANDO °STATUSGRUPO ====================
async function cmdStatusGrupo(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG_) {
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

    // 🔥 PEGA O TEXTO
    let texto = args.join(' ').trim();

    // 🔥 VERIFICA SE TEM FOTO (respondida ou na legenda)
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const fotoRespondida = quoted?.imageMessage || msg.message?.imageMessage;
    const foto = fotoRespondida;

    // 🔥 VERIFICA SE PASSOU NÚMERO (ex: °statusgrupo3)
    let quantidade = 1;
    const match = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '')
        .match(new RegExp(`^${cfg.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}statusgrupo([1-5])`, 'i'));
    if (match) quantidade = parseInt(match[1]);

    // 🔥 SE NÃO TEM TEXTO E NEM FOTO → MOSTRA AJUDA
    if (!texto && !foto) {
        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📊 *STATUS DE GRUPO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 📌 *Texto:*
┃ ${cfg.prefix}statusgrupo <texto>
┃ ${cfg.prefix}statusgrupo3 <texto> (3x)

┃ 📸 *Foto:*
┃ ${cfg.prefix}statusgrupo (na legenda)
┃ ${cfg.prefix}statusgrupo <legenda> (na foto)
┃ Responder foto com ${cfg.prefix}statusgrupo

┃ 🔒 *Anti-status:*
┃ ${cfg.prefix}antistatus on/off

┃ 📋 *Listar/Apagar:*
┃ ${cfg.prefix}listarstatus
┃ ${cfg.prefix}apagarstatus todos
┃ ${cfg.prefix}apagarstatus 2

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${cfg.botNome} 』`,
            msg
        );
        return;
    }

    // 🔥 LIMITE DE CARACTERES
    if (texto.length > 700) {
        await enviarResposta(chat, sock, '❌ Texto muito longo! Máximo 700 caracteres.', msg);
        return;
    }

    await reagir(sock, chat, msg.key.id, '📊');

    try {
        // 🔥 BAIXA A FOTO SE TIVER
        let imageBuffer = null;
        if (foto) {
            try {
                const alvo = quoted?.imageMessage ?
                    { message: quoted, key: msg.key } :
                    msg;

                imageBuffer = await downloadMediaMessage(
                    alvo, 'buffer', {},
                    { reuploadRequest: sock.updateMediaMessage }
                );
            } catch (e) {
                console.error('❌ Erro ao baixar foto:', e.message);
            }
        }

        // 🔥 ENVIA O STATUS
        const ids = await enviarStatusGrupo(sock, chat, {
            text: texto,
            image: imageBuffer,
            quantidade: quantidade
        });

        // 🔥 AVISA
        const tipo = imageBuffer ? '📸 Foto' : '📝 Texto';
        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ✅ *STATUS ENVIADO!*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ ${tipo}
┃ 📊 Quantidade: *${ids.length}x*
${texto ? `┃ 📝 Texto: ${texto.slice(0, 100)}${texto.length > 100 ? '...' : ''}` : ''}

┃ 💡 Para apagar:
┃ ${cfg.prefix}apagarstatus todos

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${cfg.botNome} 』`,
            msg
        );
        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        console.error('❌ Erro no statusgrupo:', error.message);
        await enviarResposta(chat, sock, `❌ ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== COMANDO °ANTISTATUS ====================
async function cmdAntiStatus(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG_) {
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

    if (!['on', 'off'].includes(acao)) {
        await enviarResposta(chat, sock,
            `📌 Use: ${cfg.prefix}antistatus on/off`,
            msg
        );
        return;
    }

    // 🔥 SE FOR ON, VERIFICA SE O BOT É ADM
    if (acao === 'on') {
        const { eu } = await permissao(sock, chat);
        if (!eu?.admin) {
            await enviarResposta(chat, sock, '❌ O bot precisa ser *ADMIN* do grupo!', msg);
            return;
        }
    }

    // 🔥 ATUALIZA
    dados.anti = dados.anti.filter(g => g !== chat);
    if (acao === 'on') dados.anti.push(chat);
    salvar();

    await enviarResposta(chat, sock,
        `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ${acao === 'on' ? '✅' : '❌'} *ANTI-STATUS ${acao === 'on' ? 'ATIVADO' : 'DESATIVADO'}*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ ${acao === 'on' ?
    '📵 Membros que criarem status\n┃ serão *banidos* automaticamente.' :
    '✅ Membros podem criar status\n┃ sem restrição.'}

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${cfg.botNome} 』`,
        msg
    );
    await reagir(sock, chat, msg.key.id, acao === 'on' ? '✅' : '❌');
}

// ==================== COMANDO °LISTARSTATUS ====================
async function cmdListarStatus(chat, sock, sender, msg, enviarResposta, reagir, CONFIG_) {
    const cfg = CONFIG_ || CONFIG;

    if (!chat.endsWith('@g.us')) {
        await enviarResposta(chat, sock, '📌 Este comando só funciona em grupos!', msg);
        return;
    }

    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores ou dono!', msg);
        return;
    }

    const lista = listarStatus(chat);

    if (lista.length === 0) {
        await enviarResposta(chat, sock, '📋 Nenhum status registrado neste grupo!', msg);
        return;
    }

    let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📋 *STATUS REGISTRADOS*
╰━━━━━━━━━━━━━━━━━━━━━⬢

`;

    lista.forEach((item, i) => {
        const data = new Date(item.ts).toLocaleString('pt-BR');
        texto += `┃ ${i + 1}. ${item.text}\n┃ 📅 ${data}\n┃\n`;
    });

    texto += `╰━━━━━━━━━━━━━━━━━━━━━⬢
┃ 💡 Para apagar:
┃ ${cfg.prefix}apagarstatus todos
┃ ${cfg.prefix}apagarstatus 2
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${cfg.botNome} 』`;

    await enviarResposta(chat, sock, texto, msg);
    await reagir(sock, chat, msg.key.id, '📋');
}

// ==================== COMANDO °APAGARSTATUS ====================
async function cmdApagarStatus(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG_) {
    const cfg = CONFIG_ || CONFIG;

    if (!chat.endsWith('@g.us')) {
        await enviarResposta(chat, sock, '📌 Este comando só funciona em grupos!', msg);
        return;
    }

    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores ou dono!', msg);
        return;
    }

    const argumento = args[0]?.toLowerCase();

    if (argumento && argumento !== 'todos' && !/^\d+$/.test(argumento)) {
        await enviarResposta(chat, sock,
            `📌 Use:\n` +
            `▸ ${cfg.prefix}apagarstatus todos\n` +
            `▸ ${cfg.prefix}apagarstatus 2`,
            msg
        );
        return;
    }

    const indice = !argumento || argumento === 'todos' ?
        undefined : Number(argumento);

    await reagir(sock, chat, msg.key.id, '⏳');

    try {
        const resultado = await apagarStatus(sock, chat, indice);

        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🗑️ *STATUS APAGADOS*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ ✅ Pedidos: ${resultado.pedidos}
┃ ❌ Falhas: ${resultado.falhas}

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${cfg.botNome} 』`,
            msg
        );
        await reagir(sock, chat, msg.key.id, '✅');
    } catch (error) {
        await enviarResposta(chat, sock, `❌ ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== PROCESSAR ANTI-STATUS ====================
async function processarAntiStatus(sock, chat, sender, msg, enviarResposta) {
    try {
        if (!chat.endsWith('@g.us')) return false;
        if (!dados.anti.includes(chat)) return false;
        if (msg.key.fromMe) return false;
        if (!msg.key.participant) return false;
        if (!detectarStatus(msg.message)) return false;

        const { eu, autor } = await permissao(sock, chat, msg.key.participant);
        if (!eu?.admin || !autor || autor.admin) return false;

        try { await sock.sendMessage(chat, { delete: msg.key }); } catch {}

        const resultado = await sock.groupParticipantsUpdate(
            chat, [autor.id], 'remove'
        );

        if (resultado?.some(r => String(r.status) === '200')) {
            await enviarResposta(chat, sock,
                `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📵 *ANTI-STATUS*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 👤 @${numero(autor.id)}
┃ 🚫 *Banido + status apagado*

┃ 📌 Motivo: criou status
┃ de grupo sem permissão.

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
                msg,
                [autor.id]
            );
        }

        return true;
    } catch (e) {
        console.error('❌ Erro no anti-status:', e.message);
        return false;
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    initModule,
    cmdStatusGrupo,
    cmdAntiStatus,
    cmdListarStatus,
    cmdApagarStatus,
    processarAntiStatus,
    enviarStatusGrupo,
    listarStatus,
    apagarStatus,
    detectarStatus
};