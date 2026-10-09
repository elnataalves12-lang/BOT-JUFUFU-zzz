// ==================== COMANDO GPT-6 LUNA ====================
// services/gpt.js
//
// Usa a Ju API (endpoint /gpt)
// Modelo: gpt-6-luna
//
// Uso no bot:
//   °gpt <pergunta>          → conversa com o GPT
//   °gpt6 <pergunta>         → atalho alternativo
//   °luna <pergunta>         → atalho alternativo
//   °gpt clear               → limpa o histórico deste chat
//
// Resposta: apenas o texto da IA
// ============================================================

const fetch = require('node-fetch');
const CONFIG = require('../config.js');
const { verificarApiConfigurada } = require('./apiError.js');

// ==================== HISTÓRICO EM MEMÓRIA ====================
const historico = new Map();
const MAX_HISTORICO = 6;

// ==================== CHAMADA À JU API ====================
async function chamarJuApiGpt(prompt) {
    const { baseUrl, apiKey, timeout } = CONFIG.jufufuAPI;

    const url = `${baseUrl}/gpt?q=${encodeURIComponent(prompt)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout || 60000);

    let res;
    try {
        res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            signal: controller.signal
        });
    } catch (e) {
        if (e.name === 'AbortError') {
            throw new Error('A IA demorou muito para responder. Tente novamente.');
        }
        throw e;
    } finally {
        clearTimeout(timer);
    }

    if (!res.ok) {
        if (res.status === 404) throw new Error('Endpoint /gpt não encontrado na API');
        if (res.status === 401 || res.status === 403) throw new Error('Token da API inválido ou expirado');
        if (res.status === 429) throw new Error('Muitas requisições. Aguarde alguns segundos.');
        if (res.status >= 500) throw new Error(`API offline (${res.status})`);
        throw new Error(`Erro ${res.status}`);
    }

    const data = await res.json();

    if (!data.ok) {
        throw new Error(data.error || 'A API não retornou sucesso');
    }

    if (!data.response) {
        throw new Error('A IA não retornou uma resposta');
    }

    return data.response;
}

// ==================== COMANDO PRINCIPAL ====================
async function cmdGpt(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG) {
    // 🔥 VERIFICA A JU API
    if (!(await verificarApiConfigurada(CONFIG, chat, sock, msg, enviarResposta, reagir))) return;

    // 🔥 SUBCOMANDO: clear
    const sub = args[0]?.toLowerCase();
    if (sub === 'clear' || sub === 'limpar') {
        historico.delete(chat);
        await enviarResposta(chat, sock, '🧹 Histórico limpo!', msg);
        return;
    }

    const pergunta = args.join(' ').trim();

    // 🔥 SEM PERGUNTA
    if (!pergunta) {
        await enviarResposta(chat, sock, `🤖 Use: ${CONFIG.prefix}gpt <pergunta>`, msg);
        return;
    }

    await reagir(sock, chat, msg.key.id, '🤖');

    try {
        // 🔥 MONTA O PROMPT COM CONTEXTO
        if (!historico.has(chat)) historico.set(chat, []);
        const lista = historico.get(chat);

        let promptCompleto;
        if (lista.length > 0) {
            const contexto = lista
                .map(m => `${m.role === 'user' ? 'Usuário' : 'IA'}: ${m.content}`)
                .join('\n');
            promptCompleto = `Contexto da conversa anterior:\n${contexto}\n\nPergunta atual: ${pergunta}`;
        } else {
            promptCompleto = pergunta;
        }

        // 🔥 CHAMA A API
        const resposta = await chamarJuApiGpt(promptCompleto);

        // 🔥 SALVA NO HISTÓRICO
        lista.push({ role: 'user', content: pergunta });
        lista.push({ role: 'assistant', content: resposta });
        while (lista.length > MAX_HISTORICO) lista.shift();

        // 🔥 ENVIA SÓ A RESPOSTA CRUA
        await enviarResposta(chat, sock, resposta, msg);
        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        console.error('❌ Erro no GPT:', error.message);

        const lista = historico.get(chat);
        if (lista && lista[lista.length - 1]?.role === 'user') lista.pop();

        await enviarResposta(chat, sock, `❌ ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdGpt,
    limparHistorico: (chat) => historico.delete(chat)
};