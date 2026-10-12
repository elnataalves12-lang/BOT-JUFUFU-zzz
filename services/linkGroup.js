// ==================== COMANDO LINK DO GRUPO ====================
// services/linkGroup.js
//
// Pega o link do grupo e mostra com botões:
//   🔗 Abrir grupo   (abre o link direto)
//   📋 Copiar link   (copia o link)
//   📢 Canal do Bot  
//
// Qualquer membro pode usar.
//
// Uso:
//   °linkgp 
//
// ============================================================

const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const CONFIG = require('../config.js');

// ==================== COMANDO PRINCIPAL ====================
async function cmdLinkGrupo(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG) {
    // 🔥 SÓ FUNCIONA EM GRUPOS
    if (!chat.endsWith('@g.us')) {
        await sock.sendMessage(chat, {
            text: '🚫 Este comando só funciona em grupos!'
        }, { quoted: msg });
        return;
    }

    await reagir(sock, chat, msg.key.id, '🔗');

    try {
        // 🔥 PEGA O LINK DO GRUPO
        const code = await sock.groupInviteCode(chat);
        const link = `https://chat.whatsapp.com/${code}`;

        // 🔥 PEGA O NOME DO GRUPO
        let nomeGrupo = 'Grupo';
        try {
            const metadata = await sock.groupMetadata(chat);
            nomeGrupo = metadata.subject || 'Grupo';
        } catch (e) {}

        // 🔥 LINK DO CANAL (do config)
        const canalLink = CONFIG.canalLink || '';

        // 🔥 TEXTO DA MENSAGEM
        const texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🔗 *LINK DO GRUPO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 🏠 *${nomeGrupo}*

┃ 📎 Toque nos botões abaixo:

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

        // ============================================================
        // 🔥 MONTA OS BOTÕES
        // ============================================================
        const botoes = [];

        // 🔥 BOTÃO 1: ABRIR GRUPO
        botoes.push({
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: '🔗 Abrir Grupo',
                url: link
            })
        });

        // 🔥 BOTÃO 2: COPIAR LINK
        botoes.push({
            name: 'cta_copy',
            buttonParamsJson: JSON.stringify({
                display_text: '📋 Copiar Link',
                copy_code: link
            })
        });

        // 🔥 BOTÃO 3: CANAL DO BOT (se tiver configurado)
        if (canalLink && canalLink.startsWith('http')) {
            botoes.push({
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '📢 Canal do Bot',
                    url: canalLink
                })
            });
        }

        // ============================================================
        // 🔥 MONTA A MENSAGEM INTERATIVA
        // ============================================================
        const interactiveMessage = {
            body: { text: texto },
            footer: { text: CONFIG.botNome },
            nativeFlowMessage: {
                buttons: botoes
            }
        };

        const msgContent = generateWAMessageFromContent(chat, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: interactiveMessage
                }
            }
        }, { userJid: sock.user.id });

        // ============================================================
        // 🔥 ENVIA
        // ============================================================
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
        console.error('❌ Erro no linkGroup:', error.message);

        // 🔥 FALLBACK: se não conseguiu, manda só texto
        await sock.sendMessage(chat, {
            text: `❌ Não consegui pegar o link do grupo.\n\n📌 Motivo: ${error.message}`
        }, { quoted: msg });

        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdLinkGrupo
};