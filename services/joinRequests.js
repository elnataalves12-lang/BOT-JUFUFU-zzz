// ==================== SOLICITAÇÕES DE ENTRADA ====================
// services/joinRequests.js
// ============================================================

// ==================== ACEITAR TODAS AS SOLICITAÇÕES ====================
async function cmdAceitarSolicitacoes(sock, chat, sender, msg, enviarResposta, reagir, verificarAdmin, isDono, CONFIG) {
    // 🔥 SÓ FUNCIONA EM GRUPOS
    if (!chat.endsWith('@g.us')) {
        return; // 🔥 IGNORA NO PRIVADO
    }
    
    // 🔥 VERIFICA SE É ADM OU DONO
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);
    
    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores ou o dono do bot!', msg);
        await reagir(sock, chat, msg.key.id, '❌');
        return;
    }
    
    await reagir(sock, chat, msg.key.id, '⏳');
    
    try {
        // 🔥 BUSCA TODAS AS SOLICITAÇÕES PENDENTES
        const requests = await sock.groupRequestParticipantsList(chat);
        
        if (!requests || requests.length === 0) {
            await enviarResposta(chat, sock, 
                `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📭 **SEM SOLICITAÇÕES**
╰━━━━━━━━━━━━━━━━━━━━━⬢

📌 Não há solicitações pendentes neste grupo.

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`, 
                msg
            );
            await reagir(sock, chat, msg.key.id, '📭');
            return;
        }
        
        const total = requests.length;
        
        // 🔥 ENVIA MENSAGEM DE INÍCIO
        const msgInicio = await sock.sendMessage(chat, {
            text: `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ⏳ **ACEITANDO SOLICITAÇÕES**
╰━━━━━━━━━━━━━━━━━━━━━⬢

📌 Total de solicitações: ${total}
⏱️ Tempo estimado: ${(total * 4)} segundos

⏳ Aguarde, estou aceitando uma por uma...
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`
        }, { quoted: msg });
        
        let aceitos = 0;
        let falhas = 0;
        
        // 🔥 ACEITA CADA SOLICITAÇÃO COM INTERVALO DE 4 SEGUNDOS
        for (let i = 0; i < requests.length; i++) {
            const request = requests[i];
            
            try {
                await sock.groupRequestParticipantsUpdate(
                    chat,
                    [request.jid],
                    'approve'
                );
                
                aceitos++;
                
                const numero = request.jid.split('@')[0];
                
                // 🔥 ATUALIZA A MENSAGEM DE PROGRESSO A CADA 5 ACEITOS
                if ((i + 1) % 5 === 0 || i === requests.length - 1) {
                    try {
                        await sock.sendMessage(chat, {
                            text: `⏳ **PROGRESSO**\n\n` +
                                  `✅ Aceitos: ${aceitos}/${total}\n` +
                                  `❌ Falhas: ${falhas}\n` +
                                  `📊 Atual: ${i + 1}/${total}`,
                            edit: msgInicio.key
                        });
                    } catch (e) {}
                }
                
            } catch (err) {
                falhas++;
                console.error(`❌ Erro ao aceitar ${request.jid}:`, err.message);
            }
            
            // 🔥 ESPERA 4 SEGUNDOS ANTES DO PRÓXIMO (EXCETO NO ÚLTIMO)
            if (i < requests.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 4000));
            }
        }
        
        // 🔥 MENSAGEM FINAL
        const textoFinal = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ✅ **SOLICITAÇÕES ACEITAS**
╰━━━━━━━━━━━━━━━━━━━━━⬢

📊 **RESUMO:**
┃ ✅ Aceitos: ${aceitos}
┃ ❌ Falhas: ${falhas}
┃ 📌 Total: ${total}

🎉 Todos os pedidos foram processados!

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;
        
        await sock.sendMessage(chat, {
            text: textoFinal,
            edit: msgInicio.key
        });
        
        await reagir(sock, chat, msg.key.id, '✅');
        
    } catch (error) {
        console.error('❌ Erro ao aceitar solicitações:', error);
        
        let mensagemErro = '❌ Erro ao aceitar solicitações!';
        
        if (error.message.includes('not-authorized')) {
            mensagemErro = '🔒 O bot precisa ser administrador do grupo!';
        } else if (error.message.includes('forbidden')) {
            mensagemErro = '🚫 O bot não tem permissão para aceitar solicitações!';
        } else if (error.message.includes('not-found')) {
            mensagemErro = '📭 Nenhuma solicitação encontrada!';
        }
        
        await enviarResposta(chat, sock, mensagemErro, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== LISTAR SOLICITAÇÕES ====================
async function cmdListarSolicitacoes(sock, chat, sender, msg, enviarResposta, reagir, verificarAdmin, isDono, CONFIG) {
    // 🔥 SÓ FUNCIONA EM GRUPOS
    if (!chat.endsWith('@g.us')) {
        return; // 🔥 IGNORA NO PRIVADO
    }
    
    // 🔥 VERIFICA SE É ADM OU DONO
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);
    
    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores ou o dono do bot!', msg);
        return;
    }
    
    await reagir(sock, chat, msg.key.id, '📋');
    
    try {
        const requests = await sock.groupRequestParticipantsList(chat);
        
        if (!requests || requests.length === 0) {
            await enviarResposta(chat, sock, '📭 Nenhuma solicitação pendente!', msg);
            await reagir(sock, chat, msg.key.id, '📭');
            return;
        }
        
        let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📋 **SOLICITAÇÕES PENDENTES**
╰━━━━━━━━━━━━━━━━━━━━━⬢

📌 Total: ${requests.length}\n\n`;
        
        const mentions = [];
        
        requests.forEach((req, index) => {
            const numero = req.jid.split('@')[0];
            mentions.push(req.jid);
            texto += `┃ ${index + 1}. @${numero}\n`;
        });
        
        texto += `\n╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;
        
        await sock.sendMessage(chat, {
            text: texto,
            mentions: mentions
        }, { quoted: msg });
        
        await reagir(sock, chat, msg.key.id, '✅');
        
    } catch (error) {
        console.error('❌ Erro ao listar solicitações:', error);
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdAceitarSolicitacoes,
    cmdListarSolicitacoes
};