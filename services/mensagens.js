// ==================== SISTEMA DE MENSAGENS ====================
// services/mensagens.js
//
// Conta mensagens + dá XP + resumo diário + perfil
// Todos os comandos usam o botão do config.js
// ============================================================

const fs = require('fs');
const path = require('path');

// ==================== CONFIG ====================
const XP_POR_MENSAGEM = 5;
const XP_POR_NIVEL = 100;
const TOP_RESUMO = 10;

// ==================== VARIÁVEIS GLOBAIS ====================
let db = null;
let CONFIG = null;
let enviarResposta = null;
let salvarDB = null;
let verificarAdmin = null;
let isDono = null;

// ==================== INICIALIZAR ====================
function initModule(dbInstance, configInstance, sendResponseFunction, saveFunction, verificarAdminFn, isDonoFn) {
    db = dbInstance;
    CONFIG = configInstance;
    enviarResposta = sendResponseFunction;
    salvarDB = saveFunction;
    verificarAdmin = verificarAdminFn;
    isDono = isDonoFn;
    console.log('✅ Módulo Mensagens inicializado!');
}

// ==================== PEGAR DATA DE HOJE ====================
function getDataHoje() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// ==================== FORMATAR NÚMERO ====================
function formatarNumero(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
}

// ==================== LIMPAR ID ====================
function limparId(jid) {
    if (!jid) return '';
    return String(jid).split('@')[0].split(':')[0];
}

// ==================== INICIALIZAR ESTRUTURA ====================
function initGrupo(chat) {
    if (!db.mensagens) db.mensagens = {};
    if (!db.mensagens[chat]) {
        db.mensagens[chat] = {
            resumoAtivo: false,
            usuarios: {}
        };
    }
    return db.mensagens[chat];
}

function initUsuario(chat, userId) {
    const grupo = initGrupo(chat);
    if (!grupo.usuarios[userId]) {
        grupo.usuarios[userId] = {
            totalMensagens: 0,
            xp: 0,
            nivel: 1,
            mensagensHoje: 0,
            xpHoje: 0,
            primeiraMsgHoje: null,
            ultimaMsg: Date.now(),
            historico: {}
        };
    }
    return grupo.usuarios[userId];
}

// ==================== ENVIAR COM BOTÃO (canal do config.js) ====================
async function enviarComBotao(chat, sock, texto, mentions, quoted) {
    const canalLink = CONFIG.canalLink || '';

    try {
        const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

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

        if (botoes.length === 0) {
            // 🔥 SEM BOTÃO → ENVIA NORMAL
            await sock.sendMessage(chat, { text: texto, mentions }, { quoted });
            return;
        }

        const interactiveMessage = {
            body: { text: texto },
            footer: { text: CONFIG.botNome || 'JUFUFU Bot' },
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

        if (mentions && mentions.length > 0) {
            msgContent.message.viewOnceMessage.message.interactiveMessage.contextInfo = {
                mentionedJid: mentions
            };
        }

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

    } catch (e) {
        // 🔥 FALLBACK: SÓ TEXTO
        try {
            await sock.sendMessage(chat, { text: texto, mentions }, { quoted });
        } catch (e2) {}
    }
}

// ==================== CONTAR MENSAGEM ====================
async function contarMensagem(chat, sender, msg, sock) {
    try {
        if (!chat.endsWith('@g.us')) return;
        if (sender === sock.user.id) return;
        if (msg.key.fromMe) return;

        const hoje = getDataHoje();

        const grupo = initGrupo(chat);
        const user = initUsuario(chat, sender);

        // 🔥 VERIFICA SE É A PRIMEIRA MENSAGEM DO DIA
        const ehPrimeiraDoDia = user.primeiraMsgHoje !== hoje;

        // 🔥 SE VIROU O DIA, RESETA OS CONTADORES DIÁRIOS
        if (ehPrimeiraDoDia) {
            if (user.primeiraMsgHoje && user.mensagensHoje > 0) {
                if (!user.historico) user.historico = {};
                user.historico[user.primeiraMsgHoje] = user.mensagensHoje;

                const datas = Object.keys(user.historico).sort();
                if (datas.length > 30) {
                    for (let i = 0; i < datas.length - 30; i++) {
                        delete user.historico[datas[i]];
                    }
                }
            }

            user.mensagensHoje = 0;
            user.xpHoje = 0;
            user.primeiraMsgHoje = hoje;
        }

        // 🔥 ADICIONA A MENSAGEM
        user.totalMensagens++;
        user.mensagensHoje++;
        user.ultimaMsg = Date.now();

        // 🔥 ADICIONA XP
        user.xp += XP_POR_MENSAGEM;
        user.xpHoje += XP_POR_MENSAGEM;

        // 🔥 VERIFICA SE SUBIU DE NÍVEL
        const nivelAntigo = user.nivel;
        const nivelNovo = Math.floor(user.xp / XP_POR_NIVEL) + 1;

        if (nivelNovo > nivelAntigo) {
            user.nivel = nivelNovo;
        }

        // 🔥 SE É A PRIMEIRA MENSAGEM DO DIA E O RESUMO TÁ ATIVO, AVISA NO GRUPO
        if (ehPrimeiraDoDia && grupo.resumoAtivo) {
            try {
                const nome = limparId(sender);

                let texto = `🎉 *PRIMEIRA MENSAGEM DO DIA!*\n\n`;
                texto += `╭━━━━━━━━━━━━━━━━━━━━━⬢\n`;
                texto += `┃ 👤 @${nome}\n`;
                texto += `┃ 💬 +1 mensagem\n`;
                texto += `┃ ⭐ +${XP_POR_MENSAGEM} XP\n`;
                texto += `┃ 🎯 Nível: ${user.nivel}\n`;
                texto += `╰━━━━━━━━━━━━━━━━━━━━━⬢\n\n`;
                texto += `📌 Continue conversando para ganhar mais XP!`;

                await enviarComBotao(chat, sock, texto, [sender]);
            } catch (e) {}
        }

        salvarDB();

    } catch (error) {
        console.error('❌ Erro ao contar mensagem:', error.message);
    }
}

// ==================== MINHAS MENSAGENS ====================
async function cmdMinhasMensagens(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG) {
    const grupo = db.mensagens?.[chat];
    const user = grupo?.usuarios?.[sender];

    if (!user) {
        await enviarResposta(chat, sock, '📊 Você ainda não mandou nenhuma mensagem!', msg);
        return;
    }

    const hoje = getDataHoje();
    const ehHoje = user.primeiraMsgHoje === hoje;

    const mensagensHoje = ehHoje ? user.mensagensHoje : 0;
    const xpHoje = ehHoje ? user.xpHoje : 0;

    const ranking = Object.entries(grupo.usuarios)
        .sort((a, b) => b[1].totalMensagens - a[1].totalMensagens)
        .map(([id]) => id);

    const posicao = ranking.indexOf(sender) + 1;
    const totalUsuarios = ranking.length;

    const xpAtual = user.xp % XP_POR_NIVEL;
    const progresso = Math.floor((xpAtual / XP_POR_NIVEL) * 15);
    let barra = '';
    for (let i = 0; i < 15; i++) {
        barra += i < progresso ? '▰' : '▱';
    }

    const nome = limparId(sender);

    const texto = `📊 *SUAS MENSAGENS*\n\n╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 👤 @${nome}
┃ 🏆 Posição: ${posicao}º de ${totalUsuarios}
╰━━━━━━━━━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 💬 *TOTAL GERAL*
┃ 📩 Mensagens: ${formatarNumero(user.totalMensagens)}
┃ ⭐ XP: ${formatarNumero(user.xp)}
┃ 🎯 Nível: ${user.nivel}
┃ ${barra} ${xpAtual}/${XP_POR_NIVEL}
╰━━━━━━━━━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📅 *HOJE*
┃ 💬 Mensagens: ${mensagensHoje}
┃ ⭐ XP ganho: ${xpHoje}
╰━━━━━━━━━━━━━━━━━━━━━⬢`;

    await enviarComBotao(chat, sock, texto, [sender], msg);
}

// ==================== PERFIL DE MENSAGENS ====================
async function cmdPerfilMensagens(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const alvo = mentioned[0] || sender;

    const grupo = db.mensagens?.[chat];
    const user = grupo?.usuarios?.[alvo];

    if (!user) {
        await enviarResposta(chat, sock, '📊 Nenhum dado encontrado!', msg);
        return;
    }

    const hoje = getDataHoje();
    const ehHoje = user.primeiraMsgHoje === hoje;

    const mensagensHoje = ehHoje ? user.mensagensHoje : 0;
    const xpHoje = ehHoje ? user.xpHoje : 0;

    const ranking = Object.entries(grupo.usuarios)
        .sort((a, b) => b[1].totalMensagens - a[1].totalMensagens)
        .map(([id]) => id);

    const posicao = ranking.indexOf(alvo) + 1;
    const totalUsuarios = ranking.length;

    const historico = user.historico || {};
    const diasComMensagem = Object.keys(historico).length + 1;
    const mediaPorDia = Math.floor(user.totalMensagens / Math.max(1, diasComMensagem));
    const diasAtivo = diasComMensagem;

    const xpAtual = user.xp % XP_POR_NIVEL;
    const progresso = Math.floor((xpAtual / XP_POR_NIVEL) * 15);
    let barra = '';
    for (let i = 0; i < 15; i++) {
        barra += i < progresso ? '▰' : '▱';
    }

    let titulo = '💬 Novato';
    if (user.nivel >= 50) titulo = '👑 Lendário';
    else if (user.nivel >= 30) titulo = '🔥 Mestre';
    else if (user.nivel >= 20) titulo = '⭐ Avançado';
    else if (user.nivel >= 10) titulo = '💫 Ativo';
    else if (user.nivel >= 5) titulo = '📈 Participante';

    const nome = limparId(alvo);

    const texto = `📇 *PERFIL DE MENSAGENS*\n\n╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 👤 @${nome}
┃ 🎖️ ${titulo}
╰━━━━━━━━━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📊 *ESTATÍSTICAS*
┃ 🏆 Posição: ${posicao}º de ${totalUsuarios}
┃ 💬 Total: ${formatarNumero(user.totalMensagens)}
┃ 📈 Média/dia: ${mediaPorDia}
┃ 📅 Dias ativo: ${diasAtivo}
╰━━━━━━━━━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ⭐ *XP E NÍVEL*
┃ 🎯 Nível: ${user.nivel}
┃ ⭐ XP: ${formatarNumero(user.xp)}
┃ ${barra} ${xpAtual}/${XP_POR_NIVEL}
╰━━━━━━━━━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📅 *HOJE*
┃ 💬 Mensagens: ${mensagensHoje}
┃ ⭐ XP: ${xpHoje}
╰━━━━━━━━━━━━━━━━━━━━━⬢`;

    await enviarComBotao(chat, sock, texto, [alvo], msg);
}

// ==================== RANKING DE MENSAGENS ====================
async function cmdRankMensagens(chat, sock, msg, args, enviarResposta, reagir, CONFIG) {
    const grupo = db.mensagens?.[chat];

    if (!grupo || Object.keys(grupo.usuarios).length === 0) {
        await enviarResposta(chat, sock, '📊 Nenhuma mensagem registrada!', msg);
        return;
    }

    const ranking = Object.entries(grupo.usuarios)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.totalMensagens - a.totalMensagens)
        .slice(0, TOP_RESUMO);

    const totalMensagens = Object.values(grupo.usuarios).reduce((acc, u) => acc + u.totalMensagens, 0);
    const dataAtual = new Date().toLocaleDateString('pt-BR');

    let texto = `🏆 *RANKING DE MENSAGENS*\n\n`;
    texto += `╭━━━━━━━━━━━━━━━━━━━━━⬢\n`;
    texto += `┃ 📊 ${ranking.length} usuários\n`;
    texto += `┃ 💬 ${formatarNumero(totalMensagens)} mensagens totais\n`;
    texto += `┃ 📅 ${dataAtual}\n`;
    texto += `╰━━━━━━━━━━━━━━━━━━━━━⬢\n\n`;

    ranking.forEach((user, i) => {
        const medalha = i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;
        const nome = limparId(user.id);

        let titulo = '💬';
        if (user.nivel >= 50) titulo = '👑';
        else if (user.nivel >= 30) titulo = '🔥';
        else if (user.nivel >= 20) titulo = '⭐';
        else if (user.nivel >= 10) titulo = '💫';

        texto += `┃ ${medalha} ${titulo} @${nome}\n`;
        texto += `┃    💬 ${formatarNumero(user.totalMensagens)} msgs | 🎯 Nv ${user.nivel}\n`;
        texto += `┃ ──────────────────────────\n`;
    });

    const mentions = ranking.map(u => u.id);
    await enviarComBotao(chat, sock, texto, mentions, msg);
}

// ==================== ADM: ATIVAR/DESATIVAR RESUMO ====================
async function cmdResumoMensagens(chat, sock, sender, msg, args, enviarResposta, reagir, verificarAdmin, isDono, CONFIG) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    const grupo = initGrupo(chat);
    const acao = args[0]?.toLowerCase();

    if (acao === 'on') {
        grupo.resumoAtivo = true;
        salvarDB();
        await enviarResposta(chat, sock,
            `✅ *RESUMO DIÁRIO ATIVADO!*\n\n` +
            `📅 Todos os dias às *00:05*\n` +
            `📊 Ranking dos 10 mais ativos do dia\n` +
            `🎉 Aviso da primeira mensagem do dia\n\n` +
            `📌 Use ${CONFIG.prefix}resumomsgs off pra desativar.`,
            msg
        );
        await reagir(sock, chat, msg.key.id, '✅');
        return;
    }

    if (acao === 'off') {
        grupo.resumoAtivo = false;
        salvarDB();
        await enviarResposta(chat, sock,
            `❌ *RESUMO DIÁRIO DESATIVADO!*\n\n` +
            `📌 Cada membro ainda pode ver seu resumo:\n` +
            `▸ ${CONFIG.prefix}minhasmsgs\n` +
            `▸ ${CONFIG.prefix}perfilmsgs`,
            msg
        );
        await reagir(sock, chat, msg.key.id, '❌');
        return;
    }

    const ativo = grupo.resumoAtivo === true;

    await enviarResposta(chat, sock,
        `📊 *RESUMO DIÁRIO*\n\n` +
        `📌 Status: ${ativo ? '✅ ATIVADO' : '❌ DESATIVADO'}\n\n` +
        `📌 *Comandos:*\n` +
        `▸ ${CONFIG.prefix}resumomsgs on\n` +
        `▸ ${CONFIG.prefix}resumomsgs off\n\n` +
        `💡 *Ativa/desativa junto:*\n` +
        `┃ 📅 Resumo diário (00:05)\n` +
        `┃ 🎉 Aviso da 1ª mensagem do dia\n\n` +
        `📌 *Ver o seu:*\n` +
        `▸ ${CONFIG.prefix}minhasmsgs\n` +
        `▸ ${CONFIG.prefix}perfilmsgs\n\n` +
        `📌 *Ranking:*\n` +
        `▸ ${CONFIG.prefix}rankmsgs`,
        msg
    );
}

// ==================== ENVIAR RESUMO DIÁRIO ====================
async function enviarResumoDiario(sock) {
    try {
        if (!db.mensagens) return;

        const hoje = getDataHoje();

        for (const [chat, grupo] of Object.entries(db.mensagens)) {
            if (!grupo.resumoAtivo) continue;

            const usuariosHoje = [];

            for (const [userId, user] of Object.entries(grupo.usuarios)) {
                if (user.primeiraMsgHoje === hoje && user.mensagensHoje > 0) {
                    usuariosHoje.push({
                        id: userId,
                        mensagens: user.mensagensHoje,
                        xp: user.xpHoje,
                        nivel: user.nivel
                    });
                }
            }

            if (usuariosHoje.length === 0) continue;

            usuariosHoje.sort((a, b) => b.mensagens - a.mensagens);

            const top10 = usuariosHoje.slice(0, TOP_RESUMO);
            const totalHoje = usuariosHoje.reduce((acc, u) => acc + u.mensagens, 0);

            let texto = `📅 *RESUMO DO DIA*\n\n`;
            texto += `╭━━━━━━━━━━━━━━━━━━━━━⬢\n`;
            texto += `┃ 📊 ${usuariosHoje.length} usuários ativos\n`;
            texto += `┃ 💬 ${formatarNumero(totalHoje)} mensagens hoje\n`;
            texto += `┃ 📅 ${new Date().toLocaleDateString('pt-BR')}\n`;
            texto += `╰━━━━━━━━━━━━━━━━━━━━━⬢\n\n`;
            texto += `🏆 *TOP ${top10.length} DO DIA:*\n\n`;

            top10.forEach((user, i) => {
                const medalha = i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;
                const nome = limparId(user.id);

                let titulo = '';
                if (user.mensagens >= 100) titulo = '🔥';
                else if (user.mensagens >= 50) titulo = '⭐';
                else if (user.mensagens >= 20) titulo = '💫';
                else titulo = '💬';

                texto += `┃ ${medalha} ${titulo} @${nome}\n`;
                texto += `┃    💬 ${user.mensagens} msgs | ⭐ ${user.xp} XP\n`;
                texto += `┃ ──────────────────────────\n`;
            });

            texto += `\n💡 *Continue conversando!*\n`;
            texto += `📌 Use ${CONFIG.prefix}minhasmsgs pra ver o seu.`;

            const mentions = top10.map(u => u.id);

            try {
                await enviarComBotao(chat, sock, texto, mentions);
            } catch (e) {}
        }
    } catch (error) {
        console.error('❌ Erro no resumo diário:', error.message);
    }
}

// ==================== AGENDADOR (00:05) ====================
let ultimoDiaEnviado = null;
let intervaloMensagens = null;

function iniciarSchedulerMensagens(sock) {
    if (intervaloMensagens) clearInterval(intervaloMensagens);

    intervaloMensagens = setInterval(async () => {
        try {
            const agora = new Date();
            const hora = agora.getHours();
            const minuto = agora.getMinutes();
            const hoje = getDataHoje();

            if (hora === 0 && minuto === 5 && ultimoDiaEnviado !== hoje) {
                ultimoDiaEnviado = hoje;

                setTimeout(async () => {
                    await enviarResumoDiario(sock);
                }, 3000);
            }
        } catch (e) {
            console.error('❌ Erro no scheduler mensagens:', e.message);
        }
    }, 60000);

    console.log('✅ Scheduler de Mensagens iniciado!');
}

// ==================== EXPORTAR ====================
module.exports = {
    initModule,
    contarMensagem,
    cmdMinhasMensagens,
    cmdPerfilMensagens,
    cmdRankMensagens,
    cmdResumoMensagens,
    enviarResumoDiario,
    iniciarSchedulerMensagens,
    XP_POR_MENSAGEM,
    XP_POR_NIVEL
};