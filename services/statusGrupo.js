// ==================== STATUS DO GRUPO ====================
// services/statusGrupo.js
//
// Uso: °status
//
// Mostra TUDO que está ativado/desativado no grupo
// Só ADM ou dono pode usar
// ============================================================

const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// ==================== VARIÁVEIS GLOBAIS ====================
let db = null;
let CONFIG = null;
let verificarAdmin = null;
let isDono = null;

// ==================== INICIALIZAR ====================
function initModule(dbInstance, configInstance, verificarAdminFn, isDonoFn) {
    db = dbInstance;
    CONFIG = configInstance;
    verificarAdmin = verificarAdminFn;
    isDono = isDonoFn;
    console.log('✅ Módulo StatusGrupo inicializado!');
}

// ==================== HELPER: emoji on/off ====================
function emojiOnOff(valor) {
    return valor ? '✅' : '❌';
}

// ==================== HELPER: contar itens ====================
function contarItens(obj) {
    if (!obj) return 0;
    if (Array.isArray(obj)) return obj.length;
    return Object.keys(obj).length;
}

// ==================== COMANDO PRINCIPAL ====================
async function cmdStatus(chat, sock, sender, msg, enviarResposta, reagir, CONFIG_) {
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

    await reagir(sock, chat, msg.key.id, '📊');

    try {
        // ============================================================
        // 🔥 PEGA TODOS OS DADOS DO GRUPO
        // ============================================================

        // WELCOME
        const welcomeEntrada = db.welcome?.[chat] === true;
        const welcomeSaida = db.welcomeSaida?.[chat] === true;

        // ANTI-LINK
        const antiLink = db.antilink?.[chat] === true;
        const antiLinkBan = db.antilinkBan?.[chat] === true;

        // ANTI-PALAVRÃO
        const antiPalavrao = db.antiPalavrao?.[chat]?.ativo === true;
        const antiPalavraoModo = db.antiPalavrao?.[chat]?.modo || 1;

        // ANTI-MÍDIA
        const antiAudio = db.antiMidia?.[chat]?.audio === true;
        const antiImage = db.antiMidia?.[chat]?.image === true;
        const antiVideo = db.antiMidia?.[chat]?.video === true;
        const antiSticker = db.antiMidia?.[chat]?.sticker === true;
        const antiDocument = db.antiMidia?.[chat]?.document === true;

        // BAN POR FIGURINHA
        const banSticker = !!db.banSticker?.[chat]?.hash;

        // BLACKLIST
        const totalBlacklist = contarItens(db.blacklist?.[chat]);

        // PROTEÇÃO ADM
        const protecaoAdm = db.protecaoAdm?.[chat] === true;

        // SEM PREFIXO
        const semPrefixo = db.semPrefixo?.[chat] === true;

        // RPG
        const rpgAtivo = db.rpgConfig?.[chat] !== false; // Padrão: true

        // AGENDAMENTOS
        const agendarFechar = db.agendamentos?.[chat]?.fechar?.ativo
            ? db.agendamentos[chat].fechar.horario
            : null;
        const agendarAbrir = db.agendamentos?.[chat]?.abrir?.ativo
            ? db.agendamentos[chat].abrir.horario
            : null;

        // GRUPO FECHADO/ABERTO
        let grupoFechado = false;
        try {
            const metadata = await sock.groupMetadata(chat);
            grupoFechado = metadata.announce === true;
        } catch (e) {}

        // NOME DO GRUPO
        let nomeGrupo = 'Grupo';
        let totalMembros = 0;
        try {
            const metadata = await sock.groupMetadata(chat);
            nomeGrupo = metadata.subject || 'Grupo';
            totalMembros = metadata.participants?.length || 0;
        } catch (e) {}

        // ============================================================
        // 🔥 MONTA O TEXTO
        // ============================================================
        const botNome = cfg.botNome || 'JUFUFU Bot';

        let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📊 *STATUS DO GRUPO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 🏠 *${nomeGrupo}*
┃ 👥 *${totalMembros} membros*
┃ 🔒 *Status:* ${grupoFechado ? '🔐 FECHADO' : '🔓 ABERTO'}

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 👋 *WELCOME*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ ${emojiOnOff(welcomeEntrada)} Entrada
┃ ${emojiOnOff(welcomeSaida)} Saída

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🛡️ *PROTEÇÕES*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ ${emojiOnOff(antiLink)} Anti-Link
┃ ${emojiOnOff(antiLinkBan)} Anti-Link (Ban)
┃ ${emojiOnOff(antiPalavrao)} Anti-Palavrão ${antiPalavrao ? `(modo ${antiPalavraoModo})` : ''}
┃ ${emojiOnOff(protecaoAdm)} Proteção ADM
┃ ${emojiOnOff(semPrefixo)} Comandos sem Prefixo

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🚫 *ANTI-MÍDIA*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ ${emojiOnOff(antiAudio)} Anti-Áudio
┃ ${emojiOnOff(antiImage)} Anti-Imagem
┃ ${emojiOnOff(antiVideo)} Anti-Vídeo
┃ ${emojiOnOff(antiSticker)} Anti-Sticker
┃ ${emojiOnOff(antiDocument)} Anti-Documento

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🎮 *DIVERSÃO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ ${emojiOnOff(rpgAtivo)} RPG no Grupo

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🚷 *BANIMENTOS*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ ${emojiOnOff(banSticker)} Ban por Figurinha
┃ 📛 Blacklist: *${totalBlacklist}* usuário(s)

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ⏰ *AGENDAMENTOS*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 🔒 Fechar: ${agendarFechar ? `*${agendarFechar}*` : '_não agendado_'}
┃ 🔓 Abrir: ${agendarAbrir ? `*${agendarAbrir}*` : '_não agendado_'}
`;

        texto += `\n╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${botNome} 』`;

        // ============================================================
        // 🔥 MONTA O BOTÃO DO CANAL
        // ============================================================
        const canalLink = cfg.canalLink || '';
        const botoes = [];

        if (canalLink && canalLink.startsWith('http')) {
            botoes.push({
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '📢 Canal do Bot',
                    url: canalLink
                })
            });
        }

        // 🔥 SE NÃO TIVER CANAL, ENVIA COMO TEXTO NORMAL
        if (botoes.length === 0) {
            await enviarResposta(chat, sock, texto, msg);
            return;
        }

        // 🔥 ENVIA COM BOTÃO
        const interactiveMessage = {
            body: { text: texto },
            footer: { text: botNome },
            nativeFlowMessage: { buttons: botoes }
        };

        const msgContent = generateWAMessageFromContent(chat, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage
                }
            }
        }, { userJid: sock.user.id });

        await sock.relayMessage(chat, msgContent.message, {
            messageId: msgContent.key.id,
            additionalNodes: [
                {
                    tag: 'biz',
                    attrs: {},
                    content: [
                        {
                            tag: 'interactive',
                            attrs: { type: 'native_flow', v: '1' },
                            content: [
                                { tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }
                            ]
                        }
                    ]
                }
            ]
        });

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        console.error('❌ Erro no status:', error.message);
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    initModule,
    cmdStatus
};