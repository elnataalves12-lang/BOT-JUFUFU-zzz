// ==================== COLAGEM DE IMAGEM (CV) ====================
// services/cvImagem.js
//
// Uso:
//   °cv cinema    (respondendo uma imagem)
//   °cv quadro
//   °cv tela
//   °cv celular
//   °cv oculos
//   °cv quadro2
//   °cv papel
//
// Fluxo NOVO (POST direto):
//   1. Usuário responde uma imagem com °cv <template>
//   2. Bot baixa a imagem
//   3. Envia direto via POST multipart/form-data pra Ju API
//   4. Baixa o resultado e envia no WhatsApp
// ============================================================

const fetch = require('node-fetch');
const FormData = require('form-data');
const { verificarApiConfigurada } = require('./apiError.js');

// ==================== TEMPLATES ====================
const TEMPLATES = {
    cinema: {
        endpoint: 'cv-cinema',
        nome: '🎬 Cinema',
        descricao: 'Cola sua imagem na tela de um cinema'
    },
    quadro: {
        endpoint: 'cv-quadro',
        nome: '🖼️ Quadro',
        descricao: 'Cola sua imagem num quadro sobre cavalete'
    },
    tela: {
        endpoint: 'cv-tela',
        nome: '💻 Tela do PC',
        descricao: 'Cola sua imagem na tela do PC do Tom'
    },
    celular: {
        endpoint: 'cv-celular',
        nome: '📱 Celular',
        descricao: 'Cola sua imagem na tela do celular do Tom'
    },
    oculos: {
        endpoint: 'cv-oculos',
        nome: '🕶️ Óculos do Gohan',
        descricao: 'Cola sua imagem nas lentes do Gohan'
    },
    quadro2: {
        endpoint: 'cv-quadro2',
        nome: '💥 Quadrinho Comic',
        descricao: 'Cola sua imagem num quadrinho estilo comic'
    },
    papel: {
        endpoint: 'cv-papel',
        nome: '📄 Papel do Bob Esponja',
        descricao: 'Cola sua imagem no papel do Bob Esponja'
    }
};

// ==================== COMANDO PRINCIPAL ====================
async function cmdCv(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG, downloadMediaMessage, P) {
    // 🔥 VERIFICA A JU API
    if (!(await verificarApiConfigurada(CONFIG, chat, sock, msg, enviarResposta, reagir))) return;

    // 🔥 PEGA O TEMPLATE
    const template = args[0]?.toLowerCase();

    // 🔥 SE NÃO PASSOU TEMPLATE, MOSTRA A LISTA
    if (!template || !TEMPLATES[template]) {
        const lista = Object.entries(TEMPLATES)
            .map(([key, info]) => `┃ ▸ *${key}* → ${info.nome}\n┃    _${info.descricao}_`)
            .join('\n');

        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🎨 *COLAGEM DE IMAGEM*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 📌 *Como usar:*
┃ Responda uma imagem com:
┃ ${CONFIG.prefix}cv <template>

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📋 *Templates disponíveis:*
╰━━━━━━━━━━━━━━━━━━━━━⬢

${lista}

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📝 *Exemplo:*
┃ ${CONFIG.prefix}cv cinema

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`,
            msg
        );
        return;
    }

    // 🔥 PEGA A IMAGEM RESPONDIDA
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted || !quoted.imageMessage) {
        await enviarResposta(chat, sock,
            `⚠️ *Responda uma imagem* com:\n` +
            `📌 ${CONFIG.prefix}cv ${template}`,
            msg
        );
        return;
    }

    await reagir(sock, chat, msg.key.id, '🎨');

    try {
        const info = TEMPLATES[template];

        // 🔥 1. BAIXA A IMAGEM
        const target = { message: quoted, key: msg.key };
        const buffer = await downloadMediaMessage(target, 'buffer', {}, { logger: P({ level: 'silent' }) });

        if (!buffer || buffer.length < 500) {
            throw new Error('Imagem inválida ou muito pequena');
        }

        // 🔥 2. MONTA O FORMDATA (POST direto)
        const form = new FormData();
        form.append('image', buffer, {
            filename: 'cv.jpg',
            contentType: quoted.imageMessage?.mimetype || 'image/jpeg'
        });

        // 🔥 3. CHAMA A JU API (POST)
        const { baseUrl, apiKey, timeout } = CONFIG.jufufuAPI;
        const baseUrlLimpa = String(baseUrl).replace(/\/+$/, '');
        const apiUrl = `${baseUrlLimpa}/${info.endpoint}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout || 90000);

        let response;
        try {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    ...form.getHeaders()
                },
                body: form,
                signal: controller.signal
            });
        } catch (e) {
            if (e.name === 'AbortError') {
                throw new Error('A API demorou muito. Tente novamente.');
            }
            throw e;
        } finally {
            clearTimeout(timer);
        }

        // 🔥 TRATAMENTO DE ERROS
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('Token da API inválido ou expirado');
            }
            if (response.status === 402) {
                throw new Error('Sem créditos na API!');
            }
            if (response.status === 429) {
                throw new Error('Muitas requisições. Aguarde...');
            }
            if (response.status >= 500) {
                throw new Error(`API offline (${response.status})`);
            }
            throw new Error(`API erro: ${response.status}`);
        }

        const data = await response.json();

        if (!data.ok || !data.imageUrl) {
            throw new Error(data.error || 'API não retornou imagem');
        }

        // 🔥 4. BAIXA O RESULTADO
        const imgResponse = await fetch(data.imageUrl);

        if (!imgResponse.ok) {
            throw new Error(`Erro ao baixar resultado: ${imgResponse.status}`);
        }

        const resultBuffer = Buffer.from(await imgResponse.arrayBuffer());

        if (!resultBuffer || resultBuffer.length < 1000) {
            throw new Error('Resultado vazio ou inválido');
        }

        // 🔥 5. ENVIA
        const creditos = data.credits_remaining ?? null;

        let legenda = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ${info.nome}
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 📝 ${info.descricao}
`;

        if (creditos !== null) {
            legenda += `\n┃ 💎 *Créditos:* ${creditos}\n`;
        }

        legenda += `\n╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

        await sock.sendMessage(chat, {
            image: resultBuffer,
            caption: legenda
        }, { quoted: msg });

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        console.error('❌ Erro no cv:', error.message);
        await enviarResposta(chat, sock, `❌ ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdCv,
    TEMPLATES
};