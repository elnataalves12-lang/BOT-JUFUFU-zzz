// ==================== LISTAR GRUPOS (DONO) ====================
// services/listarGrupos.js
//
// Comando °listagrupos — mostra todos os grupos que o bot está
//
// Só dono pode usar
// Mostra: nome, ID, data de entrada, total de membros
// ============================================================

// ==================== VARIÁVEIS ====================
let db = null;
let salvarDB = null;
let isDono = null;
let CONFIG = null;

// ==================== INICIALIZAR ====================
function initModule(dbInstance, salvarDBFn, isDonoFn, configInstance) {
    db = dbInstance;
    salvarDB = salvarDBFn;
    isDono = isDonoFn;
    CONFIG = configInstance || require('../config.js');
    console.log('✅ Módulo ListarGrupos inicializado!');
}

// ==================== FORMATAR DATA ====================
function formatarData(data) {
    if (!data) return 'N/A';
    try {
        return new Date(data).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (e) {
        return 'N/A';
    }
}

// ==================== REGISTRAR GRUPO (primeira vez) ====================
// 🔥 Se é a primeira vez que o bot vê o grupo, salva a data
function registrarGrupo(chatId, nome) {
    if (!db.gruposConhecidos) db.gruposConhecidos = {};

    if (!db.gruposConhecidos[chatId]) {
        db.gruposConhecidos[chatId] = {
            nome: nome || 'Sem nome',
            adicionadoEm: new Date().toISOString()
        };
        salvarDB();
    }
}

// ==================== COMANDO °LISTAGRU POS ====================
async function cmdListarGrupos(chat, sock, sender, msg, enviarResposta, reagir, CONFIG_) {
    const cfg = CONFIG_ || CONFIG;

    // 🔥 SÓ DONO
    if (!(await isDono(sender))) {
        await enviarResposta(chat, sock,
            `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🔒 *ACESSO NEGADO*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ Apenas *donos do bot*
┃ podem usar este comando.

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${cfg.botNome} 』`,
            msg
        );
        return;
    }

    await reagir(sock, chat, msg.key.id, '📊');

    try {
        // 🔥 BUSCA TODOS OS GRUPOS
        const grupos = await sock.groupFetchAllParticipating();
        const lista = Object.values(grupos);

        if (lista.length === 0) {
            await enviarResposta(chat, sock, '📭 O bot não está em nenhum grupo!', msg);
            return;
        }

        // 🔥 ORDENA POR DATA (mais antigo primeiro)
        lista.sort((a, b) => {
            const dataA = db.gruposConhecidos?.[a.id]?.adicionadoEm || '9999';
            const dataB = db.gruposConhecidos?.[b.id]?.adicionadoEm || '9999';
            return dataA.localeCompare(dataB);
        });

        // ============================================================
        // 🔥 MONTA A LISTA
        // ============================================================
        let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📊 *GRUPOS DO BOT*
╰━━━━━━━━━━━━━━━━━━━━━⬢

┃ 📱 *Total:* ${lista.length} grupos
┃ 🤖 *Bot:* ${cfg.botNome}

╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📋 *LISTA:*
╰━━━━━━━━━━━━━━━━━━━━━⬢\n`;

        for (let i = 0; i < lista.length; i++) {
            const grupo = lista[i];
            const id = grupo.id;
            const nome = grupo.subject || 'Sem nome';
            const membros = grupo.participants?.length || 0;

            // 🔥 REGISTRA SE É A PRIMEIRA VEZ
            registrarGrupo(id, nome);

            // 🔥 PEGA A DATA
            const info = db.gruposConhecidos?.[id];
            const dataEntrada = info ? formatarData(info.adicionadoEm) : 'N/A';

            texto += `\n┃ *${i + 1}.* ${nome}\n`;
            texto += `┃ 🆔 \`${id.split('@')[0]}\`\n`;
            texto += `┃ 👥 ${membros} membros\n`;
            texto += `┃ 📅 Entrou: ${dataEntrada}\n`;
            texto += `┃ ──────────────────────\n`;
        }

        texto += `\n╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📅 ${new Date().toLocaleDateString('pt-BR')}
┃ 🤖 ${cfg.botNome}
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${cfg.botNome} 』`;

        // ============================================================
        // 🔥 SE FOR MUITO GRANDE, DIVIDE EM PARTES
        // ============================================================
        const MAX_CHARS = 4000;

        if (texto.length <= MAX_CHARS) {
            await enviarResposta(chat, sock, texto, msg);
        } else {
            // 🔥 DIVIDE EM PARTES
            const partes = [];
            const linhas = texto.split('\n');
            let parteAtual = '';

            for (const linha of linhas) {
                if ((parteAtual + linha + '\n').length > MAX_CHARS) {
                    partes.push(parteAtual);
                    parteAtual = linha + '\n';
                } else {
                    parteAtual += linha + '\n';
                }
            }

            if (parteAtual) partes.push(parteAtual);

            for (let i = 0; i < partes.length; i++) {
                const cabecalho = partes.length > 1
                    ? `╭━━━━━━━━━━━━━━━━━━━━━⬢\n┃ 📊 *GRUPOS (${i + 1}/${partes.length})*\n╰━━━━━━━━━━━━━━━━━━━━━⬢\n\n`
                    : '';

                await enviarResposta(chat, sock, cabecalho + partes[i], msg);

                // 🔥 ESPERA 1s ENTRE PARTES
                if (i < partes.length - 1) {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        console.error('❌ Erro no listagrupos:', error.message);
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    initModule,
    cmdListarGrupos,
    registrarGrupo
};