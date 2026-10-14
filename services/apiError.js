// ==================== MENSAGEM DE ERRO DA API ====================
// services/apiError.js
//
// Módulo reutilizável para verificar e avisar quando a Ju API
// não está configurada no config.js
//
// Uso simples:
//   const { verificarApiConfigurada } = require('./apiError.js');
//   if (!(await verificarApiConfigurada(CONFIG, chat, sock, msg, enviarResposta, reagir))) return;
// ============================================================

const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// 🔥 LINK DO SITE
const SITE_API = 'https://ju-api-web-app-dupli-k2zk.bolt.host/';

// ==================== MENSAGEM BONITA ====================
function mensagemApiNaoConfigurada(CONFIG) {
    const botNome = CONFIG?.botNome || 'JUFUFU Bot';

    return `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ⚠️ *API NÃO CONFIGURADA*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 🔑 Este comando precisa da
┃ *Ju API* para funcionar!

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📌 *COMO CONFIGURAR:*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 1️⃣ Acesse o site oficial
┃    🌐 ${SITE_API}

┃ 2️⃣ Crie sua conta grátis

┃ 3️⃣ Copie sua *chave de API*
┃    (formato: ju-xxxxxxxx-xxxx)

┃ 4️⃣ Cole no *config.js*:
┃
┃    jufufuAPI: {
┃      baseUrl: '${SITE_API}',
┃      apiKey: 'ju-SUA-CHAVE-AQUI'
┃    }

┃ 5️⃣ Reinicie o bot

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 💡 *Toque nos botões abaixo*
┃ *para pegar sua chave ou*
┃ *falar com o suporte!*
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${botNome} 』`;
}

// ==================== ENVIAR COM BOTÕES ====================
async function enviarMensagemComBotoes(CONFIG, chat, sock, msg) {
    const texto = mensagemApiNaoConfigurada(CONFIG);
    const botNome = CONFIG?.botNome || 'JUFUFU Bot';
    const canalLink = CONFIG?.canalLink || '';

    // 🔥 MONTA OS BOTÕES
    const botoes = [];

    // 🔥 BOTÃO 1: COMPRAR CHAVE
    botoes.push({
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({
            display_text: '🛒 Comprar Chave',
            url: SITE_API
        })
    });

    // 🔥 BOTÃO 2: CANAL (se tiver)
    if (canalLink && canalLink.startsWith('http')) {
        botoes.push({
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: '📢 Canal do Bot',
                url: canalLink
            })
        });
    }

    // 🔥 MONTA A MENSAGEM INTERATIVA
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
                interactiveMessage: interactiveMessage
            }
        }
    }, { userJid: sock.user.id });

    // 🔥 ENVIA COM BOTÕES
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
}

// ==================== FALLBACK (SEM BOTÕES) ====================
async function enviarMensagemFallback(CONFIG, chat, sock, msg) {
    const texto = mensagemApiNaoConfigurada(CONFIG);
    const canalLink = CONFIG?.canalLink || '';

    let textoFinal = texto;

    // 🔥 ADICIONA OS LINKS NO TEXTO
    if (canalLink && canalLink.startsWith('http')) {
        textoFinal = texto.replace(
            '『 ' + (CONFIG?.botNome || 'JUFUFU Bot') + ' 』',
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🔗 *LINKS ÚTEIS:*
┃
┃ 🛒 *Comprar Chave:*
┃ ${SITE_API}
┃
┃ 📢 *Canal do Bot:*
┃ ${canalLink}
╰━━━━━━━━━━━━━━━━━━━━━⬢

『 ${CONFIG?.botNome || 'JUFUFU Bot'} 』`
        );
    }

    try {
        await sock.sendMessage(chat, {
            text: textoFinal
        }, { quoted: msg });
    } catch (e) {
        // 🔥 ÚLTIMO RECURSO: SEM QUOTED
        try {
            await sock.sendMessage(chat, { text: textoFinal });
        } catch (e2) {}
    }
}

// ==================== VERIFICAÇÃO PRONTA ====================
/**
 * Verifica se a Ju API está configurada.
 *
 * - Se estiver: retorna TRUE (siga com o comando)
 * - Se NÃO estiver: envia a mensagem com botões, reage com ❌ e retorna FALSE
 *
 * @returns {Promise<boolean>}
 */
async function verificarApiConfigurada(CONFIG, chat, sock, msg, enviarResposta, reagir) {
    const configurada = !!(CONFIG?.jufufuAPI?.baseUrl && CONFIG?.jufufuAPI?.apiKey);

    if (configurada) return true;

    // 🔥 TENTA ENVIAR COM BOTÕES
    try {
        await enviarMensagemComBotoes(CONFIG, chat, sock, msg);
    } catch (err) {
        // 🔥 SE FALHAR, ENVIA FALLBACK (sem botões)
        try {
            await enviarMensagemFallback(CONFIG, chat, sock, msg);
        } catch (err2) {
            // 🔥 SE FALHAR DE NOVO, USA A FUNÇÃO PADRÃO
            try {
                await enviarResposta(chat, sock, mensagemApiNaoConfigurada(CONFIG), msg);
            } catch (err3) {}
        }
    }

    // 🔥 REAGE COM ❌
    if (reagir && msg?.key?.id) {
        try {
            await reagir(sock, chat, msg.key.id, '❌');
        } catch (e) {}
    }

    return false;
}

// ==================== EXPORTAR ====================
module.exports = {
    SITE_API,
    mensagemApiNaoConfigurada,
    verificarApiConfigurada
};