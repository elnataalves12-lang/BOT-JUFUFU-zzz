// ==================== GERAR IMAGEM COM IA ====================
// services/imageAI.js
//
// API: Ju API (/gerar-imagem) - Sunny
// ============================================================

const fetch = require('node-fetch');
const { verificarApiConfigurada } = require('./apiError.js');

// ==================== COMANDO GERAR IMAGEM ====================
async function cmdGerarImagem(chat, sock, msg, args, sender, enviarResposta, reagir, CONFIG) {
    if (!CONFIG.comandos.img) {
        await enviarResposta(chat, sock, `⛔ O comando °img está desativado!`, msg);
        return;
    }

    // 🔥 VERIFICA A JU API
    if (!(await verificarApiConfigurada(CONFIG, chat, sock, msg, enviarResposta, reagir))) return;

    const prompt = args.join(' ').trim();

    if (!prompt) {
        await enviarResposta(chat, sock,
            `🖼️ Digite o que você quer gerar!\n` +
            `📌 Exemplo: ${CONFIG.prefix}img um gatinho astronauta fofo`,
            msg
        );
        return;
    }

    await reagir(sock, chat, msg.key.id, '🎨');

    try {
        const { baseUrl, apiKey, timeout } = CONFIG.jufufuAPI;

        const apiUrl = `${baseUrl}/gerar-imagem?prompt=${encodeURIComponent(prompt)}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout || 60000);

        let response;
        try {
            response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });
        } catch (e) {
            if (e.name === 'AbortError' || e.message?.includes('aborted')) {
                throw new Error('API demorou muito para responder. Tente novamente.');
            }
            throw e;
        } finally {
            clearTimeout(timer);
        }

        if (!response.ok) {
            throw new Error(`API erro: ${response.status}`);
        }

        const data = await response.json();

        if (!data.ok || !data.imageUrl) {
            throw new Error(data.error || 'API não retornou uma imagem');
        }

        // 🔥 BAIXA A IMAGEM DA URL RETORNADA
        const imgResponse = await fetch(data.imageUrl);

        if (!imgResponse.ok) {
            throw new Error(`Erro ao baixar imagem: ${imgResponse.status}`);
        }

        const buffer = Buffer.from(await imgResponse.arrayBuffer());

        if (!buffer || buffer.length < 1000) {
            throw new Error('Imagem retornada está vazia ou inválida');
        }

        // 🔥 LEGENDA
        const legenda = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🖼️ IMAGEM GERADA
┃ 📝 ${prompt}
┃ 💳 Créditos: ${data.credits_remaining ?? 'N/A'}
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

        await sock.sendMessage(chat, {
            image: buffer,
            caption: legenda
        }, { quoted: msg });

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        await enviarResposta(chat, sock, `❌ ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdGerarImagem
};