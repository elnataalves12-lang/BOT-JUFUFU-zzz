// ==================== SISTEMA DE AGENDAMENTO ====================
// services/scheduler.js
// ============================================================

const fs = require('fs');
const path = require('path');

// ==================== VARIÁVEIS GLOBAIS ====================
let db = null;
let CONFIG = null;
let enviarResposta = null;
let reagir = null;
let DB_PATH = null;

let schedulerInterval = null;
let sockGlobal = null;

// ==================== FUNÇÃO PARA INICIALIZAR O MÓDULO ====================
function initModule(dbInstance, configInstance, sendResponseFunction, reactFunction, dbPath) {
    db = dbInstance;
    CONFIG = configInstance;
    enviarResposta = sendResponseFunction;
    reagir = reactFunction;
    DB_PATH = dbPath;
}

// ==================== SALVAR ====================
function salvarAgendamentos() {
    if (!db.agendamentos) db.agendamentos = {};
    try {
        if (db && DB_PATH) {
            fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        }
    } catch (e) {}
}

function carregarAgendamentos() {
    if (!db.agendamentos) db.agendamentos = {};
    return db.agendamentos;
}

// ==================== DATA DE HOJE (FORMATO YYYY-MM-DD) ====================
function getDataHoje() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// ==================== AGENDAR FECHAMENTO ====================
async function agendarFechamento(chat, sock, hora, minuto, msg) {
    const horario = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;

    if (!db.agendamentos) db.agendamentos = {};
    if (!db.agendamentos[chat]) {
        db.agendamentos[chat] = {};
    }

    db.agendamentos[chat].fechar = {
        hora: hora,
        minuto: minuto,
        horario: horario,
        ativo: true,
        criadoEm: new Date().toISOString(),
        criadoPor: msg.key.participant || msg.key.remoteJid,
        ultimaExecucao: null
    };

    salvarAgendamentos();

    await enviarResposta(chat, sock, `✅ Grupo programado para FECHAR às *${horario}* todos os dias!`, msg);
    await reagir(sock, chat, msg.key.id, '🔒');

    iniciarScheduler(sock);
}

// ==================== AGENDAR ABERTURA ====================
async function agendarAbertura(chat, sock, hora, minuto, msg) {
    const horario = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;

    if (!db.agendamentos) db.agendamentos = {};
    if (!db.agendamentos[chat]) {
        db.agendamentos[chat] = {};
    }

    db.agendamentos[chat].abrir = {
        hora: hora,
        minuto: minuto,
        horario: horario,
        ativo: true,
        criadoEm: new Date().toISOString(),
        criadoPor: msg.key.participant || msg.key.remoteJid,
        ultimaExecucao: null
    };

    salvarAgendamentos();

    await enviarResposta(chat, sock, `✅ Grupo programado para ABRIR às *${horario}* todos os dias!`, msg);
    await reagir(sock, chat, msg.key.id, '🔓');

    iniciarScheduler(sock);
}

// ==================== VER AGENDAMENTOS ====================
async function verAgendamentos(chat, sock, msg) {
    const agendamentos = db.agendamentos?.[chat];

    if (!agendamentos || (!agendamentos.fechar && !agendamentos.abrir)) {
        await enviarResposta(chat, sock, '📭 Nenhum agendamento configurado para este grupo!', msg);
        return;
    }

    let texto = `〘 ${CONFIG.botNome} 〙\n╭━━━━━━━━━━━━━━━━━━━━━⬢\n┃        📅 AGENDAMENTOS\n╰━━━━━━━━━━━━━━━━━━━━━⬢\n`;

    if (agendamentos.fechar && agendamentos.fechar.ativo) {
        const criadoPor = agendamentos.fechar.criadoPor?.split('@')[0] || 'Desconhecido';
        const ultima = agendamentos.fechar.ultimaExecucao || 'Nunca';
        texto += `╭━━━━━━━━━━━━━⬢\n┃ 🔒 FECHAR: ${agendamentos.fechar.horario}\n┃ 👤 Criado por: @${criadoPor}\n┃ 📅 Data: ${new Date(agendamentos.fechar.criadoEm).toLocaleDateString('pt-BR')}\n┃ ✅ Última execução: ${ultima}\n╰━━━━━━━━━━━━━⬢\n`;
    }

    if (agendamentos.abrir && agendamentos.abrir.ativo) {
        const criadoPor = agendamentos.abrir.criadoPor?.split('@')[0] || 'Desconhecido';
        const ultima = agendamentos.abrir.ultimaExecucao || 'Nunca';
        texto += `╭━━━━━━━━━━━━━⬢\n┃ 🔓 ABRIR: ${agendamentos.abrir.horario}\n┃ 👤 Criado por: @${criadoPor}\n┃ 📅 Data: ${new Date(agendamentos.abrir.criadoEm).toLocaleDateString('pt-BR')}\n┃ ✅ Última execução: ${ultima}\n╰━━━━━━━━━━━━━⬢\n`;
    }

    texto += `╭━━━━━━━━━━━━━━━━━━━━━⬢\n┃ 📌 ${CONFIG.prefix}deletaragenda <fechar/abrir/tudo>\n╰━━━━━━━━━━━━━━━━━━━━━⬢\n『 ${CONFIG.botNome} 』`;

    const mentions = [];
    if (agendamentos.fechar?.criadoPor) mentions.push(agendamentos.fechar.criadoPor);
    if (agendamentos.abrir?.criadoPor) mentions.push(agendamentos.abrir.criadoPor);

    await sock.sendMessage(chat, { text: texto, mentions }, { quoted: msg });
}

// ==================== DELETAR AGENDAMENTO ====================
async function deletarAgendamento(chat, sock, args, msg) {
    const tipo = args[0]?.toLowerCase();

    if (!tipo) {
        await enviarResposta(chat, sock, `📌 Use: ${CONFIG.prefix}deletaragenda <fechar/abrir/tudo>`, msg);
        return;
    }

    if (!db.agendamentos?.[chat]) {
        await enviarResposta(chat, sock, '📭 Nenhum agendamento encontrado!', msg);
        return;
    }

    if (tipo === 'fechar' || tipo === 'f') {
        delete db.agendamentos[chat].fechar;
        await enviarResposta(chat, sock, '✅ Agendamento de FECHAR removido!', msg);
    } else if (tipo === 'abrir' || tipo === 'a') {
        delete db.agendamentos[chat].abrir;
        await enviarResposta(chat, sock, '✅ Agendamento de ABRIR removido!', msg);
    } else if (tipo === 'tudo' || tipo === 'all') {
        delete db.agendamentos[chat];
        await enviarResposta(chat, sock, '✅ Todos os agendamentos removidos!', msg);
    } else {
        await enviarResposta(chat, sock, `❌ Tipo inválido! Use: fechar, abrir ou tudo`, msg);
        return;
    }

    salvarAgendamentos();
    await reagir(sock, chat, msg.key.id, '🗑️');
}

// ==================== EXECUTAR AGENDAMENTOS ====================
async function executarAgendamentos(sock) {
    if (!sock) return;

    const agora = new Date();
    const hora = agora.getHours();
    const minuto = agora.getMinutes();
    const horarioAtual = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
    const hoje = getDataHoje();

    const totalAgendamentos = Object.keys(db.agendamentos || {}).length;
    if (totalAgendamentos === 0) return;

    for (const [chat, agendamentos] of Object.entries(db.agendamentos || {})) {
        try {
            if (!chat.endsWith('@g.us')) continue;

            // 🔥 FECHAR
            if (agendamentos.fechar?.ativo) {
                const { hora: h, minuto: m, ultimaExecucao } = agendamentos.fechar;

                if (h === hora && m === minuto && ultimaExecucao !== hoje) {
                    try {
                        await sock.groupSettingUpdate(chat, 'announcement');
                        await sock.sendMessage(chat, {
                            text: `🔒 *GRUPO FECHADO* automaticamente às ${horarioAtual}\n📌 Apenas administradores podem enviar mensagens.`
                        });

                        agendamentos.fechar.ultimaExecucao = hoje;
                        salvarAgendamentos();
                    } catch (err) {}
                }
            }

            // 🔥 ABRIR
            if (agendamentos.abrir?.ativo) {
                const { hora: h, minuto: m, ultimaExecucao } = agendamentos.abrir;

                if (h === hora && m === minuto && ultimaExecucao !== hoje) {
                    try {
                        await sock.groupSettingUpdate(chat, 'not_announcement');
                        await sock.sendMessage(chat, {
                            text: `🔓 *GRUPO ABERTO* automaticamente às ${horarioAtual}\n📌 Todos podem enviar mensagens agora.`
                        });

                        agendamentos.abrir.ultimaExecucao = hoje;
                        salvarAgendamentos();
                    } catch (err) {}
                }
            }

        } catch (err) {}
    }
}

// ==================== RECUPERAR AGENDAMENTO PERDIDO ====================
async function recuperarAgendamentosPerdidos(sock) {
    if (!sock) return;

    const agora = new Date();
    const hora = agora.getHours();
    const minuto = agora.getMinutes();
    const hoje = getDataHoje();

    for (const [chat, agendamentos] of Object.entries(db.agendamentos || {})) {
        try {
            if (!chat.endsWith('@g.us')) continue;

            // 🔥 SE O HORÁRIO JÁ PASSOU HOJE E NÃO FOI EXECUTADO, EXECUTA AGORA
            if (agendamentos.fechar?.ativo) {
                const { hora: h, minuto: m, ultimaExecucao } = agendamentos.fechar;

                const jaPassou = (h < hora) || (h === hora && m <= minuto);

                if (jaPassou && ultimaExecucao !== hoje) {
                    try {
                        await sock.groupSettingUpdate(chat, 'announcement');
                        await sock.sendMessage(chat, {
                            text: `🔒 *GRUPO FECHADO* (recuperado) — agendamento das ${agendamentos.fechar.horario}\n📌 Apenas administradores podem enviar mensagens.`
                        });

                        agendamentos.fechar.ultimaExecucao = hoje;
                        salvarAgendamentos();
                    } catch (err) {}
                }
            }

            if (agendamentos.abrir?.ativo) {
                const { hora: h, minuto: m, ultimaExecucao } = agendamentos.abrir;

                const jaPassou = (h < hora) || (h === hora && m <= minuto);

                if (jaPassou && ultimaExecucao !== hoje) {
                    try {
                        await sock.groupSettingUpdate(chat, 'not_announcement');
                        await sock.sendMessage(chat, {
                            text: `🔓 *GRUPO ABERTO* (recuperado) — agendamento das ${agendamentos.abrir.horario}\n📌 Todos podem enviar mensagens agora.`
                        });

                        agendamentos.abrir.ultimaExecucao = hoje;
                        salvarAgendamentos();
                    } catch (err) {}
                }
            }

        } catch (err) {}
    }
}

// ==================== INICIAR SCHEDULER ====================
function iniciarScheduler(sock) {
    if (sock) {
        sockGlobal = sock;
    }

    const sockToUse = sock || sockGlobal;

    if (!sockToUse) return;

    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
    }

    schedulerInterval = setInterval(async () => {
        try {
            const currentSock = sock || sockGlobal;
            if (currentSock) {
                await executarAgendamentos(currentSock);
            }
        } catch (err) {}
    }, 30000);
}

// ==================== CARREGAR AGENDAMENTOS AO INICIAR ====================
function carregarAgendamentosInicial(sock) {
    carregarAgendamentos();

    if (sock) {
        // 🔥 RECUPERA AGENDAMENTOS PERDIDOS PRIMEIRO
        recuperarAgendamentosPerdidos(sock).catch(() => {});

        // 🔥 DEPOIS INICIA O SCHEDULER
        iniciarScheduler(sock);
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    initModule,
    agendarFechamento,
    agendarAbertura,
    verAgendamentos,
    deletarAgendamento,
    executarAgendamentos,
    recuperarAgendamentosPerdidos,
    iniciarScheduler,
    carregarAgendamentosInicial,
    salvarAgendamentos,
    carregarAgendamentos
};