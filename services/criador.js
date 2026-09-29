// ==================== COMANDO CRIADOR ====================
// services/criador.js
// ============================================================
// Mostra informações do criador do bot
// Com botões de contato direto (WhatsApp)
// Com botão do GitHub (instalação grátis)
// Com botão do canal oficial
// ============================================================

const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

// ==================== DADOS FIXOS (NÃO ALTERAR) ====================
const CRIADOR = {
    nome: 'Alves',
    numeros: [
        { numero: '5591985500390', display: 'Alves (Principal)' },
        { numero: '5591984457350', display: 'Alves (Secundário)' }
    ]
};

const GITHUB_LINK = 'https://github.com/elnataalves12-lang/BOT-JUFUFU-zzz';
const CANAL_LINK = 'https://whatsapp.com/channel/0029VbDHw0fAO7RBFTJ3rn1e';

// ==================== COMANDO PRINCIPAL ====================
async function cmdCriador(chat, sock, sender, msg, enviarResposta, reagir, CONFIG) {
    try {
        // 🔥 MONTA O TEXTO
        const texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 👑 *CRIADOR DO BOT*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 👤 *Nome:* ${CRIADOR.nome}
┃
┃ 📱 *Contatos:*
${CRIADOR.numeros.map(n => `┃ • +${n.numero}`).join('\n')}
┃
┃ 🤖 *Bot:* ${CONFIG.botNome || 'JUFUFU Bot'}
┃ 📌 *Prefixo:* ${CONFIG.prefix || '°'}

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 💡 *Toque nos botões abaixo*
┃ *para entrar em contato ou*
┃ *instalar o bot:*
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome || 'JUFUFU Bot'} 』`;

        // 🔥 MONTA OS BOTÕES
        const botoes = [];

        // 🔥 BOTÃO 1: CONTATO ALVES (Principal)
        botoes.push({
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: `💬 Falar com ${CRIADOR.nome}`,
                url: `https://wa.me/${CRIADOR.numeros[0].numero}`
            })
        });

        // 🔥 BOTÃO 2: CONTATO ALVES (Secundário)
        botoes.push({
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: `💬 Contato Reserva`,
                url: `https://wa.me/${CRIADOR.numeros[1].numero}`
            })
        });

        // 🔥 BOTÃO 3: GITHUB (Instalação)
        botoes.push({
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: '📦 Instalar o Bot (Grátis)',
                url: GITHUB_LINK
            })
        });

        // 🔥 BOTÃO 4: CANAL OFICIAL (Fixo)
        botoes.push({
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: '📢 Canal Oficial do Bot',
                url: CANAL_LINK
            })
        });

        // 🔥 ENVIA COM BOTÕES
        const interactiveMessage = {
            body: { text: texto },
            footer: { text: CONFIG.botNome || 'JUFUFU Bot' },
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

        if (reagir) {
            await reagir(sock, chat, msg.key.id, '👑');
        }

    } catch (error) {
        // 🔥 FALLBACK: TEXTO SIMPLES COM LINKS
        try {
            const textoFallback = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 👑 *CRIADOR DO BOT*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 👤 *Nome:* ${CRIADOR.nome}
┃ 📱 *Contato:* +${CRIADOR.numeros[0].numero}
┃ 📱 *Contato:* +${CRIADOR.numeros[1].numero}

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🔗 *Links:*
┃
┃ 📦 GitHub (Instalar bot):
┃ ${GITHUB_LINK}
┃
┃ 📢 Canal Oficial:
┃ ${CANAL_LINK}
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome || 'JUFUFU Bot'} 』`;

            await enviarResposta(chat, sock, textoFallback, msg);
        } catch (e) {}
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdCriador,
    CRIADOR,
    GITHUB_LINK,
    CANAL_LINK
};