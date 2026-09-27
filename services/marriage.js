// ==================== SISTEMA DE CASAMENTO E SHIP ====================
// services/marriage.js

const fs = require('fs');
const path = require('path');

// ==================== CONFIGURAÇÃO ====================
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ==================== FUNÇÕES AUXILIARES ====================
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatarData(data) {
    return new Date(data).toLocaleDateString('pt-BR');
}

function getRandomShipEmoji() {
    const emojis = ['💕', '💖', '💗', '💝', '❤️', '🧡', '💛', '💚', '💙', '💜', '🩷', '🩵', '💞', '💓', '✨', '🌟', '🌈', '🔥', '💘', '🥰'];
    return emojis[Math.floor(Math.random() * emojis.length)];
}

function getRandomShipText() {
    const texts = [
        '🌹 Perfeitos um para o outro!',
        '💕 Combinação perfeita!',
        '💖 Feitos para ficar juntos!',
        '✨ O amor está no ar!',
        '🌟 Uma dupla imbatível!',
        '🌈 O destino os uniu!',
        '💘 Casal do ano!',
        '🥰 Que fofura!',
        '❤️ Verdadeiro amor!',
        '💞 Almas gêmeas!',
        '🔥 Química pura!',
        '💝 Romance verdadeiro!',
        '💗 Amizade que virou amor!',
        '🧡 Parceria perfeita!',
        '💚 Harmonia total!'
    ];
    return texts[Math.floor(Math.random() * texts.length)];
}

// ==================== INICIALIZAR DADOS ====================
function initMarriage(db) {
    if (!db.marriage) db.marriage = {};
    if (!db.shipping) db.shipping = {};
    if (!db.proposals) db.proposals = {};
}

function getMarriage(db, userId) {
    initMarriage(db);
    if (!db.marriage[userId]) {
        db.marriage[userId] = {
            spouse: null,
            marriedAt: null,
            lovePoints: 0,
            status: 'solteiro', // solteiro, namorando, noivo, casado
            anniversary: null,
            gifts: [],
            messages: []
        };
    }
    return db.marriage[userId];
}

function getShipping(db, userId1, userId2) {
    initMarriage(db);
    const key = [userId1, userId2].sort().join('_');
    if (!db.shipping[key]) {
        db.shipping[key] = {
            user1: userId1,
            user2: userId2,
            compatibility: getRandomInt(0, 100),
            shipCount: 0,
            firstShip: new Date().toISOString(),
            lastShip: new Date().toISOString(),
            emoji: getRandomShipEmoji()
        };
    }
    return db.shipping[key];
}

function salvarDB(db, DB_PATH) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    } catch (e) {
        console.error('❌ Erro ao salvar DB:', e.message);
    }
}

// ==================== COMANDO °SHIP ====================
async function cmdShip(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir) {
    initMarriage(db);

    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const participantes = mentionedJid.filter(id => id !== sender);

    if (participantes.length === 0) {
        try {
            const metadata = await sock.groupMetadata(chat);
            const membros = metadata.participants.map(p => p.id).filter(id => id !== sender && id !== sock.user.id);
            
            if (membros.length < 2) {
                await enviarResposta(chat, sock, '👥 Precisa de pelo menos 2 pessoas no grupo para ship aleatório!', msg);
                return;
            }

            const shuffled = membros.sort(() => Math.random() - 0.5);
            const user1 = shuffled[0];
            const user2 = shuffled[1];

            const ship = getShipping(db, user1, user2);
            ship.shipCount++;
            ship.lastShip = new Date().toISOString();
            ship.compatibility = getRandomInt(0, 100);
            ship.emoji = getRandomShipEmoji();
            salvarDB(db, DB_PATH);

            const nome1 = user1.split('@')[0];
            const nome2 = user2.split('@')[0];
            const emoji = ship.emoji;
            const compat = ship.compatibility;
            const barra = gerarBarra(compat);
            const mensagem = getRandomShipText();

            const texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 💕 **SHIP ALEATÓRIO**
╰━━━━━━━━━━━━━━━━━━━━━⬢

${emoji} @${nome1} ❤️ @${nome2}

┃ 📊 Compatibilidade: ${compat}%
┃ ${barra}
┃ 📝 ${mensagem}
┃ 🔄 Ships totais: ${ship.shipCount}

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 JUFUFU Bot 』`;

            await sock.sendMessage(chat, { 
                text: texto, 
                mentions: [user1, user2] 
            }, { quoted: msg });

            await reagir(sock, chat, msg.key.id, '💕');

        } catch (error) {
            console.error('❌ Erro no ship aleatório:', error);
            await enviarResposta(chat, sock, '❌ Erro ao fazer ship aleatório!', msg);
        }
        return;
    }

    if (participantes.length === 1) {
        const user1 = sender;
        const user2 = participantes[0];

        if (user1 === user2) {
            await enviarResposta(chat, sock, '❌ Você não pode shipar com você mesmo!', msg);
            return;
        }

        const ship = getShipping(db, user1, user2);
        ship.shipCount++;
        ship.lastShip = new Date().toISOString();
        ship.compatibility = getRandomInt(0, 100);
        ship.emoji = getRandomShipEmoji();
        salvarDB(db, DB_PATH);

        const nome1 = user1.split('@')[0];
        const nome2 = user2.split('@')[0];
        const emoji = ship.emoji;
        const compat = ship.compatibility;
        const barra = gerarBarra(compat);
        const mensagem = getRandomShipText();

        const texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 💕 **SHIP**
╰━━━━━━━━━━━━━━━━━━━━━⬢

${emoji} @${nome1} ❤️ @${nome2}

┃ 📊 Compatibilidade: ${compat}%
┃ ${barra}
┃ 📝 ${mensagem}
┃ 🔄 Ships totais: ${ship.shipCount}

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 JUFUFU Bot 』`;

        await sock.sendMessage(chat, { 
            text: texto, 
            mentions: [user1, user2] 
        }, { quoted: msg });

        await reagir(sock, chat, msg.key.id, '💕');
        return;
    }

    if (participantes.length >= 2) {
        const user1 = participantes[0];
        const user2 = participantes[1];

        const ship = getShipping(db, user1, user2);
        ship.shipCount++;
        ship.lastShip = new Date().toISOString();
        ship.compatibility = getRandomInt(0, 100);
        ship.emoji = getRandomShipEmoji();
        salvarDB(db, DB_PATH);

        const nome1 = user1.split('@')[0];
        const nome2 = user2.split('@')[0];
        const emoji = ship.emoji;
        const compat = ship.compatibility;
        const barra = gerarBarra(compat);
        const mensagem = getRandomShipText();

        const texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 💕 **SHIP**
╰━━━━━━━━━━━━━━━━━━━━━⬢

${emoji} @${nome1} ❤️ @${nome2}

┃ 📊 Compatibilidade: ${compat}%
┃ ${barra}
┃ 📝 ${mensagem}
┃ 🔄 Ships totais: ${ship.shipCount}

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 JUFUFU Bot 』`;

        await sock.sendMessage(chat, { 
            text: texto, 
            mentions: [user1, user2] 
        }, { quoted: msg });

        await reagir(sock, chat, msg.key.id, '💕');
    }
}

// ==================== COMANDO °SHIPTOP ====================
async function cmdShipTop(sock, chat, msg, db, enviarResposta) {
    initMarriage(db);

    const ships = Object.entries(db.shipping || {})
        .map(([key, data]) => ({
            key,
            user1: data.user1,
            user2: data.user2,
            compatibility: data.compatibility || 0,
            shipCount: data.shipCount || 0,
            emoji: data.emoji || '💕'
        }))
        .sort((a, b) => b.compatibility - a.compatibility)
        .slice(0, 10);

    if (ships.length === 0) {
        await enviarResposta(chat, sock, '📊 Nenhum ship registrado ainda! Use °ship @user @user', msg);
        return;
    }

    let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🏆 **TOP SHIPS**
╰━━━━━━━━━━━━━━━━━━━━━⬢\n`;

    ships.forEach((ship, index) => {
        const medalha = index === 0 ? '👑' : index === 1 ? '🥇' : index === 2 ? '🥈' : index === 3 ? '🥉' : `${index+1}°`;
        const nome1 = ship.user1.split('@')[0];
        const nome2 = ship.user2.split('@')[0];
        const barra = gerarBarra(ship.compatibility);
        
        texto += `\n┃ ${medalha} ${ship.emoji} @${nome1} ❤️ @${nome2}
┃    Compatibilidade: ${ship.compatibility}%
┃    ${barra}
┃    Ships: ${ship.shipCount}\n`;
    });

    texto += `\n╰━━━━━━━━━━━━━━━━━━━━━⬢
『 JUFUFU Bot 』`;

    const mentions = ships.flatMap(s => [s.user1, s.user2]);
    await sock.sendMessage(chat, { text: texto, mentions }, { quoted: msg });
}

// ==================== COMANDO °PEDIR (PEDIDO DE CASAMENTO) ====================
async function cmdPedir(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir) {
    initMarriage(db);

    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const alvo = mentionedJid[0];

    if (!alvo) {
        await enviarResposta(chat, sock, '📌 Marque a pessoa: °pedir @usuario', msg);
        return;
    }

    if (alvo === sender) {
        await enviarResposta(chat, sock, '❌ Você não pode pedir você mesmo em casamento!', msg);
        return;
    }

    // Verifica se o usuário já é casado
    const userMarriage = getMarriage(db, sender);
    if (userMarriage.status === 'casado') {
        await enviarResposta(chat, sock, '❌ Você já é casado! Use °divorciar para se separar.', msg);
        return;
    }

    const targetMarriage = getMarriage(db, alvo);
    if (targetMarriage.status === 'casado') {
        await enviarResposta(chat, sock, `❌ @${alvo.split('@')[0]} já é casado(a)!`, msg, [alvo]);
        return;
    }

    // Verifica se já tem pedido pendente
    const userKey = `proposal_${sender}_${alvo}`;
    
    if (db.proposals[userKey]) {
        await enviarResposta(chat, sock, '⏳ Você já fez um pedido para essa pessoa! Aguarde a resposta.', msg);
        return;
    }

    // Verifica se a pessoa já pediu você
    const targetKey = `proposal_${alvo}_${sender}`;
    if (db.proposals[targetKey]) {
        await enviarResposta(chat, sock, `💕 @${alvo.split('@')[0]} já te pediu em casamento! Use °aceitar @${alvo.split('@')[0]}`, msg, [alvo]);
        return;
    }

    // Faz o pedido
    db.proposals[userKey] = {
        from: sender,
        to: alvo,
        date: new Date().toISOString(),
        status: 'pending'
    };
    salvarDB(db, DB_PATH);

    const nome1 = sender.split('@')[0];
    const nome2 = alvo.split('@')[0];
    const emojis = ['💍', '💒', '💕', '💖', '💗', '💝', '✨', '🌟', '🌈', '💞', '💘', '🥰'];

    const texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 💍 **PEDIDO DE CASAMENTO**
╰━━━━━━━━━━━━━━━━━━━━━⬢

${emojis[Math.floor(Math.random() * emojis.length)]} @${nome1} pediu @${nome2} em casamento!

┃ 📝 **O que fazer:**
┃ ✅ °aceitar @${nome1} - Para aceitar
┃ ❌ °recusar @${nome1} - Para recusar

┃ 📅 Pedido feito em: ${formatarData(new Date())}
┃ ⏰ Expira em: 24 horas

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 JUFUFU Bot 』`;

    await sock.sendMessage(chat, { 
        text: texto, 
        mentions: [sender, alvo] 
    }, { quoted: msg });

    await reagir(sock, chat, msg.key.id, '💌');
}

// ==================== COMANDO °ACEITAR ====================
async function cmdAceitar(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir) {
    initMarriage(db);

    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const alvo = mentionedJid[0];

    if (!alvo) {
        await enviarResposta(chat, sock, '📌 Marque a pessoa que te pediu: °aceitar @usuario', msg);
        return;
    }

    // Verifica se existe o pedido
    const proposalKey = `proposal_${alvo}_${sender}`;
    const proposal = db.proposals[proposalKey];

    if (!proposal) {
        await enviarResposta(chat, sock, `❌ @${alvo.split('@')[0]} não te pediu em casamento!`, msg, [alvo]);
        return;
    }

    if (proposal.status !== 'pending') {
        await enviarResposta(chat, sock, '⏳ Este pedido já foi respondido!', msg);
        return;
    }

    // Verifica se o remetente ainda é válido
    const fromMarriage = getMarriage(db, alvo);
    if (fromMarriage.status === 'casado') {
        await enviarResposta(chat, sock, `❌ @${alvo.split('@')[0]} já se casou com outra pessoa!`, msg, [alvo]);
        delete db.proposals[proposalKey];
        salvarDB(db, DB_PATH);
        return;
    }

    const toMarriage = getMarriage(db, sender);
    if (toMarriage.status === 'casado') {
        await enviarResposta(chat, sock, '❌ Você já é casado(a)!', msg);
        delete db.proposals[proposalKey];
        salvarDB(db, DB_PATH);
        return;
    }

    // ACEITA O CASAMENTO
    proposal.status = 'accepted';
    
    fromMarriage.status = 'casado';
    fromMarriage.spouse = sender;
    fromMarriage.marriedAt = new Date().toISOString();
    fromMarriage.anniversary = new Date().toISOString();
    fromMarriage.lovePoints = 50;

    toMarriage.status = 'casado';
    toMarriage.spouse = alvo;
    toMarriage.marriedAt = new Date().toISOString();
    toMarriage.anniversary = new Date().toISOString();
    toMarriage.lovePoints = 50;

    // Remove o pedido
    delete db.proposals[proposalKey];
    salvarDB(db, DB_PATH);

    const nome1 = alvo.split('@')[0];
    const nome2 = sender.split('@')[0];
    const emojis = ['💍', '💒', '🎉', '🥂', '💕', '💖', '💗', '💝', '✨', '🌟', '🌈', '🎊', '🎇', '💞', '💘'];

    const texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 💍 **CASAMENTO REALIZADO!**
╰━━━━━━━━━━━━━━━━━━━━━⬢

${emojis[Math.floor(Math.random() * emojis.length)]} @${nome1} 💕 @${nome2}

┃ 🎉 PARABÉNS! Vocês estão casados!
┃ 💒 Que sejam muito felizes!
┃ 📅 Data: ${formatarData(new Date())}
┃ 💝 Amor: 50 pontos

┃ 📌 Comandos:
┃ °amor @${nome2} - Ver amor
┃ °divorciar - Se separar

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 JUFUFU Bot 』`;

    await sock.sendMessage(chat, { 
        text: texto, 
        mentions: [alvo, sender] 
    }, { quoted: msg });

    await reagir(sock, chat, msg.key.id, '💍');
}

// ==================== COMANDO °RECUSAR ====================
async function cmdRecusar(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir) {
    initMarriage(db);

    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const alvo = mentionedJid[0];

    if (!alvo) {
        await enviarResposta(chat, sock, '📌 Marque a pessoa que te pediu: °recusar @usuario', msg);
        return;
    }

    // Verifica se existe o pedido
    const proposalKey = `proposal_${alvo}_${sender}`;
    const proposal = db.proposals[proposalKey];

    if (!proposal) {
        await enviarResposta(chat, sock, `❌ @${alvo.split('@')[0]} não te pediu em casamento!`, msg, [alvo]);
        return;
    }

    if (proposal.status !== 'pending') {
        await enviarResposta(chat, sock, '⏳ Este pedido já foi respondido!', msg);
        return;
    }

    // RECUSA O CASAMENTO
    proposal.status = 'rejected';
    
    // Remove o pedido
    delete db.proposals[proposalKey];
    salvarDB(db, DB_PATH);

    const nome1 = alvo.split('@')[0];
    const nome2 = sender.split('@')[0];
    const emojis = ['💔', '😢', '😭', '💀', '😿', '🥀', '💧', '😞', '💫'];

    const texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 💔 **PEDIDO RECUSADO**
╰━━━━━━━━━━━━━━━━━━━━━⬢

${emojis[Math.floor(Math.random() * emojis.length)]} @${nome2} recusou o pedido de @${nome1}

┃ 📝 "Não é você, sou eu..."
┃ 💔 Coração partido!

┃ 📅 ${formatarData(new Date())}

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 JUFUFU Bot 』`;

    await sock.sendMessage(chat, { 
        text: texto, 
        mentions: [alvo, sender] 
    }, { quoted: msg });

    await reagir(sock, chat, msg.key.id, '💔');
}

// ==================== COMANDO °PEDIDOS ====================
async function cmdPedidos(sock, chat, sender, msg, db, enviarResposta) {
    initMarriage(db);

    const pedidos = Object.entries(db.proposals || {})
        .filter(([key, data]) => data.to === sender && data.status === 'pending')
        .map(([key, data]) => ({
            from: data.from,
            date: data.date
        }));

    if (pedidos.length === 0) {
        await enviarResposta(chat, sock, '📭 Você não tem pedidos de casamento pendentes!', msg);
        return;
    }

    let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 💌 **PEDIDOS DE CASAMENTO**
╰━━━━━━━━━━━━━━━━━━━━━⬢\n`;

    pedidos.forEach((pedido, index) => {
        const nome = pedido.from.split('@')[0];
        const data = formatarData(pedido.date);
        texto += `\n┃ ${index+1}° @${nome}
┃    📅 ${data}
┃    ✅ °aceitar @${nome}
┃    ❌ °recusar @${nome}\n`;
    });

    texto += `\n╰━━━━━━━━━━━━━━━━━━━━━⬢
『 JUFUFU Bot 』`;

    const mentions = pedidos.map(p => p.from);
    await sock.sendMessage(chat, { text: texto, mentions }, { quoted: msg });
}

// ==================== COMANDO °CASADOS ====================
async function cmdCasados(sock, chat, msg, db, enviarResposta) {
    initMarriage(db);

    const casados = Object.entries(db.marriage || {})
        .filter(([id, data]) => data.status === 'casado')
        .map(([id, data]) => ({
            user: id,
            spouse: data.spouse,
            marriedAt: data.marriedAt,
            lovePoints: data.lovePoints || 0
        }));

    if (casados.length === 0) {
        await enviarResposta(chat, sock, '📊 Nenhum casal ainda! Use °pedir @user para começar.', msg);
        return;
    }

    let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 💑 **CASAIS DO GRUPO**
╰━━━━━━━━━━━━━━━━━━━━━⬢\n`;

    casados.forEach((casal, index) => {
        const nome1 = casal.user.split('@')[0];
        const nome2 = casal.spouse.split('@')[0];
        const data = casal.marriedAt ? formatarData(casal.marriedAt) : 'N/A';
        const coracoes = casal.lovePoints > 0 ? '❤️'.repeat(Math.min(5, Math.floor(casal.lovePoints / 20))) : '💔';
        
        texto += `\n┃ ${index+1}° @${nome1} 💕 @${nome2}
┃    💍 Desde: ${data}
┃    💝 ${coracoes} (${casal.lovePoints} pts)\n`;
    });

    texto += `\n╰━━━━━━━━━━━━━━━━━━━━━⬢
『 JUFUFU Bot 』`;

    const mentions = casados.flatMap(c => [c.user, c.spouse]);
    await sock.sendMessage(chat, { text: texto, mentions }, { quoted: msg });
}

// ==================== COMANDO °DIVORCIAR ====================
async function cmdDivorciar(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir) {
    initMarriage(db);

    const userMarriage = getMarriage(db, sender);
    if (userMarriage.status !== 'casado') {
        await enviarResposta(chat, sock, '❌ Você não é casado! Use °pedir @user para se casar.', msg);
        return;
    }

    const spouse = userMarriage.spouse;
    const spouseMarriage = getMarriage(db, spouse);

    // Confirmação
    if (args[0]?.toLowerCase() === 'confirmar') {
        userMarriage.status = 'solteiro';
        userMarriage.spouse = null;
        userMarriage.lovePoints = 0;

        spouseMarriage.status = 'solteiro';
        spouseMarriage.spouse = null;
        spouseMarriage.lovePoints = 0;

        salvarDB(db, DB_PATH);

        const texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 💔 **DIVÓRCIO CONFIRMADO**
╰━━━━━━━━━━━━━━━━━━━━━⬢

💔 @${sender.split('@')[0]} e @${spouse.split('@')[0]} se divorciaram!

┃ 📅 Data: ${formatarData(new Date())}
┃ 😢 Fim de uma história...

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 JUFUFU Bot 』`;

        await sock.sendMessage(chat, { 
            text: texto, 
            mentions: [sender, spouse] 
        }, { quoted: msg });

        await reagir(sock, chat, msg.key.id, '💔');
        return;
    }

    const textoConfirm = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ ⚠️ **CONFIRMAR DIVÓRCIO**
╰━━━━━━━━━━━━━━━━━━━━━⬢

😢 @${sender.split('@')[0]} quer se divorciar de @${spouse.split('@')[0]}!

┃ ⚠️ Confirme: °divorciar confirmar

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 JUFUFU Bot 』`;

    await sock.sendMessage(chat, { 
        text: textoConfirm, 
        mentions: [sender, spouse] 
    }, { quoted: msg });

    await reagir(sock, chat, msg.key.id, '⚠️');
}

// ==================== COMANDO °AMOR ====================
async function cmdAmor(sock, chat, sender, msg, args, db, enviarResposta) {
    initMarriage(db);

    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const alvo = mentionedJid[0] || sender;

    const marriage = getMarriage(db, alvo);

    if (marriage.status !== 'casado') {
        const nome = alvo.split('@')[0];
        await enviarResposta(chat, sock, `💔 @${nome} está solteiro(a)!`, msg, [alvo]);
        return;
    }

    const spouse = marriage.spouse;
    const nome1 = alvo.split('@')[0];
    const nome2 = spouse.split('@')[0];
    const data = marriage.marriedAt ? formatarData(marriage.marriedAt) : 'N/A';
    const amor = marriage.lovePoints || 0;
    const coracoes = '❤️'.repeat(Math.min(5, Math.floor(amor / 20) + 1));

    const texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 💕 **NÍVEL DE AMOR**
╰━━━━━━━━━━━━━━━━━━━━━⬢

💑 @${nome1} 💕 @${nome2}

┃ 💍 Casados desde: ${data}
┃ 💝 Amor: ${amor} pontos
┃ ${coracoes}
┃ 📅 ${formatarData(new Date())}

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 JUFUFU Bot 』`;

    await sock.sendMessage(chat, { 
        text: texto, 
        mentions: [alvo, spouse] 
    }, { quoted: msg });
}

// ==================== COMANDO °PRESENTEAR ====================
async function cmdPresentear(sock, chat, sender, msg, args, db, DB_PATH, enviarResposta, reagir) {
    initMarriage(db);

    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const alvo = mentionedJid[0];

    if (!alvo) {
        await enviarResposta(chat, sock, '📌 Marque a pessoa: °presentear @usuario', msg);
        return;
    }

    const marriage = getMarriage(db, sender);
    if (marriage.status !== 'casado' || marriage.spouse !== alvo) {
        await enviarResposta(chat, sock, '❌ Você só pode presentear seu cônjuge!', msg);
        return;
    }

    const spouseMarriage = getMarriage(db, alvo);
    const pontos = getRandomInt(5, 20);
    
    marriage.lovePoints += pontos;
    spouseMarriage.lovePoints += pontos;

    // Registra o presente
    if (!marriage.gifts) marriage.gifts = [];
    marriage.gifts.push({
        from: sender,
        to: alvo,
        points: pontos,
        date: new Date().toISOString()
    });

    salvarDB(db, DB_PATH);

    const nome1 = sender.split('@')[0];
    const nome2 = alvo.split('@')[0];
    const emojis = ['🎁', '💝', '🌹', '🍫', '💐', '🧸', '🎀', '💎', '✨', '🌟'];

    const texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🎁 **PRESENTE ESPECIAL**
╰━━━━━━━━━━━━━━━━━━━━━⬢

${emojis[Math.floor(Math.random() * emojis.length)]} @${nome1} deu um presente para @${nome2}!

┃ 💝 +${pontos} pontos de amor!
┃ 💕 Amor total: ${marriage.lovePoints} pts

╰━━━━━━━━━━━━━━━━━━━━━⬢
『 JUFUFU Bot 』`;

    await sock.sendMessage(chat, { 
        text: texto, 
        mentions: [sender, alvo] 
    }, { quoted: msg });

    await reagir(sock, chat, msg.key.id, '🎁');
}

// ==================== FUNÇÃO AUXILIAR ====================
function gerarBarra(valor) {
    const tamanho = 15;
    const preenchido = Math.floor((valor / 100) * tamanho);
    let barra = '';
    for (let i = 0; i < tamanho; i++) {
        if (i < preenchido) {
            barra += '▰';
        } else {
            barra += '▱';
        }
    }
    return barra;
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdShip,
    cmdShipTop,
    cmdPedir,
    cmdAceitar,
    cmdRecusar,
    cmdPedidos,
    cmdCasados,
    cmdDivorciar,
    cmdAmor,
    cmdPresentear,
    getMarriage,
    getShipping,
    initMarriage
};