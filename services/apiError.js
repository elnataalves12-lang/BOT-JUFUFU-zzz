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

// 🔥 LINK DO SITE
const SITE_API = 'https://ju-api-web-app-qgj9.bolt.host/';

// ==================== MENSAGEM BONITA ====================
function mensagemApiNaoConfigurada(CONFIG) {
    const botNome = CONFIG?.botNome || 'JUFUFU Bot';

    return `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ⚠️ *API NÃO CONFIGURADA*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 🔑 Este comando precisa da
┃ *Ju API* para funcionar!

┃ 📌 *Como configurar:*

┃ 1️⃣ Acesse o site
┃    🌐 ${SITE_API}

┃ 2️⃣ Adquira sua chave de API
┃    (formato: ju-xxxxxxxx-xxxx)

┃ 3️⃣ Cole no *config.js*:
┃
┃    jufufuAPI: {
┃      ...
┃      apiKey: 'ju-SUA-CHAVE-AQUI',
┃      ...
┃    }

┃ 4️⃣ Reinicie o bot

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🛒 *Adquira sua chave:*
┃ 🌐 ${SITE_API}
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${botNome} 』`;
}

// ==================== VERIFICAÇÃO PRONTA ====================
/**
 * Verifica se a Ju API está configurada.
 * 
 * - Se estiver: retorna TRUE (siga com o comando)
 * - Se NÃO estiver: envia a mensagem, reage com ❌ e retorna FALSE
 * 
 * @returns {Promise<boolean>}
 */
async function verificarApiConfigurada(CONFIG, chat, sock, msg, enviarResposta, reagir) {
    const configurada = !!(CONFIG?.jufufuAPI?.baseUrl && CONFIG?.jufufuAPI?.apiKey);

    if (configurada) return true;

    // 🔥 ENVIA A MENSAGEM BONITA
    try {
        await enviarResposta(chat, sock, mensagemApiNaoConfigurada(CONFIG), msg);
    } catch (e) {
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