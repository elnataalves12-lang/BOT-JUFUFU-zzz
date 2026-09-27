// ==================== SISTEMA ANTI-PALAVRÃO COMPLETO ====================
// services/antiPalavrao.js

// ==================== LISTA COMPLETA DE PALAVRÕES E FRASES ====================

const PALAVROES_BASE = [
// =====================================================================
// ===== PORTUGUÊS - PALAVRÕES INDIVIDUAIS =====
// =====================================================================

// 🔥 GÍRIAS E ABREVIAÇÕES (NOVAS)  
'prr', 'prr', 'pr', 'pŕ', 'př', 'p r r',  
'porra', 'porrinha', 'porra nenhuma',  
'caralho', 'carai', 'karai', 'krai', 'krl', 'crl', 'crlh', 'carai',  
'cacete', 'cacetinho',  
'merda', 'merdinha', 'merdao', 'merdão',  
'bosta', 'bostinha', 'bostao', 'bostão',  
'foda', 'fodase', 'foder', 'fodendo', 'fudido', 'fudida',  
'foda pra caralho', 'foda pra krl', 'foda p krl',  
'fdp', 'filhadaputa', 'filho da puta', 'filha da puta',  
'desgraca', 'desgraça',  
'arrombado', 'arrombada', 'arrombadinho',  
'otario', 'otária', 'otari0', 'otari4',  
'idiota', 'imbecil', 'babaca', 'burro', 'animal',  
'escroto', 'escrota', 'nojento', 'nojenta',  
'puta', 'puto', 'putinha', 'putaria', 'puta que pariu', 'putaquepariu',  
'prostituta', 'vagabunda', 'vagabundo', 'vadia', 'vadio',  
'piranha', 'rapariga', 'rameira',  
'corno', 'corna', 'corninho', 'cornao', 'cornão',  
'viado', 'bicha', 'bichinha',  
'cu', 'cú', 'cuzão', 'cuzona', 'cuzuda', 'cuzudo',  
'pau', 'piroca', 'rola', 'pinto', 'pintao', 'pintão',  
'buceta', 'xota', 'xoxota', 'perereca', 'grelo', 'ppk', 'boceta',  
'pqp', 'vsf', 'vtnc', 'tnc',  
'vai se foder', 'vai tomar no cu', 'tomar no cu',  
'vsf', 'vai se foder', 'vai se fuder',  
'vtmnc', 'vtc', 'vai tomar no cu',  
'fds', 'foda se', 'foda-se',  
'vai la caralho',  
  
// 🔥 FRASES COM "DE PORRA"  
'de porra', 'd porra', 'dporra', 'de porra nenhuma', 'poha',  
'do caralho', 'd caralho', 'dcaralho', 'do krl', 'd krl',  
'pra caralho', 'p caralho', 'pcaralho', 'pra krl',  
'da porra', 'da porra nenhuma',  
'foda pra caralho', 'foda pra krl',  
'legal pra caralho', 'bom pra caralho',  
'grande pra caralho', 'pequeno pra caralho',  
  
// 🔥 MAIS OFENSAS EM PORTUGUÊS  
'cuzão', 'cuzona', 'cuzuda', 'cuzudo',  
'boceta', 'pepeca', 'ppk',  
'rola', 'pinto', 'piroca', 'pau', 'caralho',  
'porrinha', 'porra nenhuma',  
'merda nenhuma',  
'foda-se', 'foda se', 'fodasse',  
'puta que pariu', 'putaquepariu',  
'vai tomar no cu', 'va tomar no cu', 'vtmnc', 'vtc',  
'vai se fuder', 'vai se foder',  
'filho da puta', 'filha da puta',  
'arrombado', 'arrombada',  
'otario', 'otário', 'otaria', 'otária',  
'babaca', 'babacas',  
'retardado', 'retardada',  
'deficiente', 'mongol', 'mongoloide',  
'cadela',  
'safado', 'safada',  
'tarado', 'tarada',  
'pervertido', 'pervertida',  
'depravado', 'depravada',  
  
// 🔥 GÍRIAS E ABREVIAÇÕES  
'vlc', 'vai la caralho',  
'tnc', 'tomar no cu',  
'fds', 'foda se',  
'pqp', 'puta que pariu',  
'vsf', 'vai se foder',  
'vtc', 'vai tomar no cu',  
'vtmnc', 'vai tomar no cu',  
  
// =====================================================================  
// ===== INGLÊS - PALAVRÕES INDIVIDUAIS =====  
// =====================================================================  
  
// 🔥 OFENSAS DIRETAS EM INGLÊS  
'fuck', 'fucking', 'motherfucker', 'mother fucker', 'mf', 'mfer',  
'shit', 'bullshit', 'shitty',  
'bitch', 'bitches', 'bitching',  
'asshole', 'bastard',  
'cunt', 'dick', 'pussy',  
'whore', 'slut',  
'wtf', 'stfu', 'gtfo',  
'damn', 'fck', 'btch', 'bch', 'sht',  
  
// 🔥 MAIS OFENSAS EM INGLÊS  
'ass', 'asshole', 'asses',  
'douche', 'douchebag',  
'jackass', 'dumbass',  
'son of a bitch', 'son of a bich',  
'goddamn', 'goddamnit',  
'hell', 'bloody hell',  
'crap', 'bullcrap',  
'piss', 'pissed', 'pissing',  
'cock', 'cock sucker', 'cocksucker',  
'nuts', 'balls',  
'tits', 'boobs',  
'twat', 'wanker',  
'bollocks', 'bloody',  
'damnit', 'dammit',  
  
// =====================================================================  
// ===== FRASES COMPLETAS =====  
// =====================================================================  
  
// 🔥 FRASES EM PORTUGUÊS  
'vai se foder',  
'vai tomar no cu',  
'tomar no cu',  
'vai pra puta que pariu',  
'vai pra pqp',  
'puta que pariu',  
'que puta merda',  
'que merda',  
'que porra',  
'que caralho',  
'foda se',  
'foda-se',  
'vai a merda',  
'vai a mierda',  
'vai pro caralho',  
'vai pra casa do caralho',  
'casa do caralho',  
'vai pro inferno',  
'vai pra puta que te pariu',  
'puta que te pariu',  
'vai te fuder',  
'vai te foder',  
'te fuder',  
'te foder',  
  
// 🔥 FRASES EM INGLÊS  
'fuck you',  
'fuck off',  
'fuck this',  
'fuck that',  
'motherfucker',  
'son of a bitch',  
'what the fuck',  
'what the hell',  
'shut the fuck up',  
'get the fuck out',  
'go to hell',  
'fuck me',  
'fucked up',  
'holy shit',  
'oh shit',  
'god damn',  
'goddamn it'

];

// ==================== MAPA DE SUBSTITUIÇÕES ====================

const SUBSTITUICOES = {
// 🔥 NÚMEROS → LETRAS
'0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a',
'5': 's', '6': 'g', '7': 't', '8': 'b', '9': 'g',

// 🔥 SÍMBOLOS → LETRAS  
'@': 'a', '$': 's', '!': 'i', '?': '', '#': '', '&': '',  
'*': '', '+': '', '=': '', '_': ' ', '-': ' ', '.': ' ',  
',': ' ', ';': ' ', ':': ' ', '/': ' ', '\\': ' ', '|': ' ',  
'(': ' ', ')': ' ', '[': ' ', ']': ' ', '{': ' ', '}': ' ',  
'<': ' ', '>': ' ', '%': ' ', '~': ' ', '^': ' '

};

// ==================== NORMALIZADOR COMPLETO ====================

function normalizarTexto(texto) {
if (!texto || typeof texto !== 'string') return '';

let normalizado = texto.toLowerCase();  
  
// 🔥 1. REMOVE ACENTOS  
const acentos = {  
    'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',  
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',  
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',  
    'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',  
    'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',  
    'ç': 'c'  
};  
normalizado = normalizado.replace(/[áàãâäéèêëíìîïóòõôöúùûüç]/g, match => acentos[match] || match);  
  
// 🔥 2. SUBSTITUI NÚMEROS E SÍMBOLOS POR LETRAS  
let resultado = '';  
for (const char of normalizado) {  
    resultado += SUBSTITUICOES[char] || char;  
}  
normalizado = resultado;  
  
// 🔥 3. REMOVE CARACTERES QUE NÃO SÃO LETRAS OU ESPAÇOS  
normalizado = normalizado.replace(/[^a-z\s]/g, ' ');  
  
// 🔥 4. REMOVE LETRAS REPETIDAS  
let semRepeticao = '';  
let ultimaLetra = '';  
for (const char of normalizado) {  
    if (char !== ultimaLetra || char === ' ') {  
        semRepeticao += char;  
        ultimaLetra = char;  
    }  
}  
normalizado = semRepeticao;  
  
// 🔥 5. REMOVE ESPAÇOS DUPLOS  
normalizado = normalizado.replace(/\s+/g, ' ').trim();  
  
return normalizado;

}

// ==================== CENSURAR MENSAGEM ====================

function censurarMensagem(texto) {
if (!texto || typeof texto !== 'string') return texto;

let textoCensurado = texto;  
const textoNormalizado = normalizarTexto(texto);  
const palavras = textoNormalizado.split(/\s+/);  
  
// 🔥 CRIA UMA LISTA DE PALAVRÕES PARA CENSURAR  
const palavrasParaCensurar = [];  
for (const palavra of palavras) {  
    if (PALAVROES_BASE.includes(palavra)) {  
        palavrasParaCensurar.push(palavra);  
    }  
}  
  
// 🔥 VERIFICA FRASES COMPLETAS  
for (const frase of PALAVROES_BASE) {  
    if (frase.includes(' ') && textoNormalizado.includes(frase)) {  
        if (!palavrasParaCensurar.includes(frase)) {  
            palavrasParaCensurar.push(frase);  
        }  
    }  
}  
  
// 🔥 CENSURA CADA PALAVRÃO ENCONTRADO  
for (const palavra of palavrasParaCensurar) {  
    const regex = new RegExp(palavra, 'gi');  
    const censura = '█'.repeat(palavra.length);  
    textoCensurado = textoCensurado.replace(regex, censura);  
}  
  
return textoCensurado;

}

// ==================== DETECTAR PALAVRÕES ====================

function detectarPalavroes(texto) {
if (!texto || typeof texto !== 'string') return [];

const textoNormalizado = normalizarTexto(texto);  
const palavrasEncontradas = [];  
const palavras = textoNormalizado.split(/\s+/);  
  
for (const palavra of palavras) {  
    if (PALAVROES_BASE.includes(palavra)) {  
        palavrasEncontradas.push(palavra);  
    }  
}  
  
// 🔥 VERIFICA FRASES COMPLETAS  
for (const frase of PALAVROES_BASE) {  
    if (frase.includes(' ') && textoNormalizado.includes(frase)) {  
        if (!palavrasEncontradas.includes(frase)) {  
            palavrasEncontradas.push(frase);  
        }  
    }  
}  
  
return palavrasEncontradas;

}

// ==================== FUNÇÃO PRINCIPAL ====================

async function processarAntiPalavrao(sock, chat, sender, msg, db, salvarDB, enviarResposta, reagir, verificarAdmin, isDono, podeBanir) {
// 🔥 SÓ FUNCIONA EM GRUPOS
if (!chat.endsWith('@g.us')) return false;

// 🔥 VERIFICA SE O ANTI-PALAVRÃO ESTÁ ATIVO  
if (!db.antiPalavrao) db.antiPalavrao = {};  
if (!db.antiPalavrao[chat]) {  
    db.antiPalavrao[chat] = {  
        ativo: false,  
        modo: 1,  
        warns: {}  
    };  
    salvarDB();  
    return false;  
}  
  
const config = db.antiPalavrao[chat];  
if (!config.ativo) return false;  
  
// 🔥 PEGA O TEXTO DA MENSAGEM  
const texto = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';  
if (!texto) return false;  
  
// 🔥 DETECTA PALAVRÕES (COM NORMALIZAÇÃO)  
const palavras = detectarPalavroes(texto);  
if (palavras.length === 0) return false;  

// 🔥 INICIALIZA WARNINGS DO USUÁRIO  
if (!config.warns[sender]) {  
    config.warns[sender] = [];  
}  
  
// 🔥 ADICIONA O PALAVRÃO AO HISTÓRICO  
const agora = Date.now();  
config.warns[sender].push(agora);  
  
// 🔥 LIMPA WARNINGS ANTIGOS (> 10 SEGUNDOS)  
config.warns[sender] = config.warns[sender].filter(t => agora - t < 10000);  

// 🔥 VERIFICA SE DEVE BANIR (4+ PALAVRÕES EM 10s)  
if (config.warns[sender].length >= 4) {  

    const pode = await podeBanir(sock, chat, sender, sender);  
      
    if (pode.pode) {  
        const avisoBan = `🔨 @${sender.split('@')[0]} foi banido por excesso de palavrões!\n📌 4+ palavrões em 10 segundos!`;  
        await sock.sendMessage(chat, { text: avisoBan, mentions: [sender] });  
        await sock.groupParticipantsUpdate(chat, [sender], 'remove');  
        config.warns[sender] = [];  
        salvarDB();  
        return true;  
    } else {  
    
        config.warns[sender] = [];  
        salvarDB();  
    }  
}  
  
// 🔥 APAGA A MENSAGEM ORIGINAL  
try {  
    await sock.sendMessage(chat, { delete: msg.key });  
 
} catch (e) {  
    try {  
        const key = {  
            remoteJid: chat,  
            fromMe: false,  
            id: msg.key.id,  
            participant: sender  
        };  
        await sock.sendMessage(chat, { delete: key });  
    } catch (e2) {  
      
    }  
}  
  
// 🔥 MODO 2: APAGA E REENVIA CENSURADA  
if (config.modo === 2) {  
    const textoCensurado = censurarMensagem(texto);  
    const emojis = ['🚫', '⛔', '🔇', '🙊', '🤐'];  
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];  
      
    await sock.sendMessage(chat, {  
        text: `${emoji} ${textoCensurado}`,  
        mentions: [sender]  
    });  
}  
  
salvarDB();  
return true;

}

// ==================== COMANDOS ====================

async function cmdAntiPalavrao(chat, sock, msg, args, sender, db, salvarDB, enviarResposta, verificarAdmin, isDono) {
const isAdmin = await verificarAdmin(sock, chat, sender);
const isDonoBot = await isDono(sender);

if (!isAdmin && !isDonoBot) {  
    await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);  
    return;  
}  
  
if (!db.antiPalavrao) db.antiPalavrao = {};  
if (!db.antiPalavrao[chat]) {  
    db.antiPalavrao[chat] = {  
        ativo: false,  
        modo: 1,  
        warns: {}  
    };  
    salvarDB();  
}  
  
const config = db.antiPalavrao[chat];  
const subcomando = args[0]?.toLowerCase();  
  
if (!subcomando) {  
    let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢

┃ 🛡️ ANTI-PALAVRÃO
╰━━━━━━━━━━━━━━━━━━━━━⬢

📊 STATUS
┃ Estado: ${config.ativo ? '✅ ATIVO' : '❌ DESATIVADO'}
┃ Modo: ${config.modo === 1 ? '📌 Modo 1 (Só apagar)' : '📌 Modo 2 (Apagar + Censurar)'}

📌 COMANDOS:
┃ °antipalavrao on - Ativar
┃ °antipalavrao off - Desativar
┃ °antipalavrao modo1 - Só apagar (silencioso)
┃ °antipalavrao modo2 - Apagar + Censurar
┃ °antipalavrao status - Ver status

⚡ REGRAS:
┃ • Detecta: c4r4lh0, m3rd4, krl, f0d4, prr
┃ • Detecta: de porra, do caralho, pra caralho
┃ • Detecta: c a r a l h o, c_a_r_a_l_h_o
┃ • Detecta frases: vai se foder, puta que pariu
┃ • Apaga APENAS palavrões isolados
┃ • 4+ em 10s = BAN
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 JUFUFU Bot 』`;

await sock.sendMessage(chat, { text: texto }, { quoted: msg });  
    return;  
}  
  
if (subcomando === 'on' || subcomando === 'ativar') {  
    config.ativo = true;  
    salvarDB();  
    await enviarResposta(chat, sock, '🛡️ Anti-palavrão ATIVADO!', msg);  
    return;  
}  
  
if (subcomando === 'off' || subcomando === 'desativar') {  
    config.ativo = false;  
    salvarDB();  
    await enviarResposta(chat, sock, '🛡️ Anti-palavrão DESATIVADO!', msg);  
    return;  
}  
  
if (subcomando === 'modo1' || subcomando === 'm1') {  
    config.modo = 1;  
    salvarDB();  
    await enviarResposta(chat, sock, '📌 Modo 1 ativado: Mensagens com palavrões serão APAGADAS (silencioso)!', msg);  
    return;  
}  
  
if (subcomando === 'modo2' || subcomando === 'm2') {  
    config.modo = 2;  
    salvarDB();  
    await enviarResposta(chat, sock, '📌 Modo 2 ativado: Mensagens com palavrões serão APAGADAS e REENVIADAS CENSURADAS!', msg);  
    return;  
}  
  
if (subcomando === 'status' || subcomando === 'info') {  
    let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢

┃ 🛡️ ANTI-PALAVRÃO - STATUS
╰━━━━━━━━━━━━━━━━━━━━━⬢

📊 CONFIGURAÇÃO
┃ Estado: ${config.ativo ? '✅ ATIVO' : '❌ DESATIVADO'}
┃ Modo: ${config.modo === 1 ? '📌 Modo 1 (Só apagar)' : '📌 Modo 2 (Apagar + Censurar)'}

👥 ESTATÍSTICAS
┃ Usuários com alertas: ${Object.keys(config.warns).length}

⚡ REGRAS:
┃ • Detecta: c4r4lh0, m3rd4, krl, f0d4, prr
┃ • Detecta: de porra, do caralho, pra caralho
┃ • Detecta: c a r a l h o, c_a_r_a_l_h_o
┃ • Detecta frases: vai se foder, puta que pariu
┃ • Palavrão isolado = mensagem apagada
┃ • 4+ em 10s = BAN
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 JUFUFU Bot 』`;

await sock.sendMessage(chat, { text: texto }, { quoted: msg });  
    return;  
}  
  
await enviarResposta(chat, sock, `❌ Subcomando inválido!\n📌 Use: on/off/modo1/modo2/status`, msg);

}

// ==================== EXPORTAR ====================

module.exports = {
processarAntiPalavrao,
cmdAntiPalavrao,
detectarPalavroes,
normalizarTexto,
censurarMensagem,
PALAVROES_BASE,
SUBSTITUICOES
};