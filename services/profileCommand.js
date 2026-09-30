// ==================== COMANDO DE PERFIL ====================
// services/profileCommand.js
// ============================================================

// ==================== FOTOS PADRÃO ====================
const FOTOS_PADRAO = [
    "https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/00d232f3-f32b-4ec0-8adb-de2ad8c1166c/IMG-20260928-WA0007.jpg?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzLzAwZDIzMmYzLWYzMmItNGVjMC04YWRiLWRlMmFkOGMxMTY2Yy9JTUctMjAyNjA5MjgtV0EwMDA3LmpwZyIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3OTA3MjQ5NzAsImV4cCI6MjEwNjA4NDk3MH0.aHTBV5leLJ9Fg88nMgFiY5txQ_M0pkffrbB3hW2WipBNhvTlh-jHiY-yDeB5zGxGwsG08Cl-wBQRd3Se057o0A",
    "https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/00d232f3-f32b-4ec0-8adb-de2ad8c1166c/IMG-20260928-WA0007.jpg?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzLzAwZDIzMmYzLWYzMmItNGVjMC04YWRiLWRlMmFkOGMxMTY2Yy9JTUctMjAyNjA5MjgtV0EwMDA3LmpwZyIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3OTA3MjQ5NzAsImV4cCI6MjEwNjA4NDk3MH0.aHTBV5leLJ9Fg88nMgFiY5txQ_M0pkffrbB3hW2WipBNhvTlh-jHiY-yDeB5zGxGwsG08Cl-wBQRd3Se057o0A"
];

// ==================== FUNÇÕES AUXILIARES ====================
function getFotoAleatoria() {
    return FOTOS_PADRAO[Math.floor(Math.random() * FOTOS_PADRAO.length)];
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getNomeUsuario(target) {
    if (!target) return 'unknown';
    return target.split('@')[0];
}

// 🔥 EMOJI BASEADO NA PORCENTAGEM
function getEmojiPorcento(valor) {
    if (valor >= 90) return '🔥';
    if (valor >= 75) return '⭐';
    if (valor >= 50) return '✨';
    if (valor >= 25) return '💫';
    return '😐';
}

// ==================== SIGNOS ====================
const SIGNOS = [
    { nome: 'Áries', emoji: '♈' },
    { nome: 'Touro', emoji: '♉' },
    { nome: 'Gêmeos', emoji: '♊' },
    { nome: 'Câncer', emoji: '♋' },
    { nome: 'Leão', emoji: '♌' },
    { nome: 'Virgem', emoji: '♍' },
    { nome: 'Libra', emoji: '♎' },
    { nome: 'Escorpião', emoji: '♏' },
    { nome: 'Sagitário', emoji: '♐' },
    { nome: 'Capricórnio', emoji: '♑' },
    { nome: 'Aquário', emoji: '♒' },
    { nome: 'Peixes', emoji: '♓' }
];

// ==================== EMOJIS ALEATÓRIOS ====================
const EMOJIS_NOMES = ['👑', '⭐', '🔥', '💎', '✨', '🌟', '💫', '🎯', '🚀', '🎮'];

// ==================== COMANDO PERFIL ====================
async function cmdPerfil(sock, chat, sender, msg, alvo, CONFIG) {
    const target = alvo || sender;
    const nome = getNomeUsuario(target);

    // 🔥 FOTO
    let foto = null;
    try {
        foto = await sock.profilePictureUrl(target, 'image');
    } catch (err) {
        foto = getFotoAleatoria();
    }

    // ============================================================
    // 📊 PORCENTAGENS
    // ============================================================
    const gay = getRandomInt(0, 100);
    const corno = getRandomInt(0, 100);
    const lindo = getRandomInt(0, 100);
    const feio = getRandomInt(0, 100);
    const inteligente = getRandomInt(0, 100);
    const legal = getRandomInt(0, 100);

    // ============================================================
    // 🎂 DADOS
    // ============================================================
    const idade = getRandomInt(15, 45);
    const altura = getRandomInt(150, 200);
    const peso = getRandomInt(50, 120);
    const signo = getRandomItem(SIGNOS);
    const emojiNome = getRandomItem(EMOJIS_NOMES);

    // ============================================================
    // 🌟 EXTRAS
    // ============================================================
    const bemMal = Math.random() < 0.5 ? '😇 Bem' : '😈 Mal';

    const statusRelacionamento = getRandomItem([
        '💕 Solteiro(a)',
        '💔 Recém-separado(a)',
        '❤️ Namorando',
        '💍 Noivo(a)',
        '👰 Casado(a)',
        '🥰 Apaixonado(a)',
        '😏 Pegador(a)',
        '🙈 Tímido(a)'
    ]);

    const hobby = getRandomItem([
        '🎮 Jogos',
        '📚 Leitura',
        '🎵 Música',
        '🎨 Desenho',
        '⚽ Futebol',
        '🎬 Filmes',
        '🍳 Culinária',
        '💻 Programação',
        '📷 Fotografia',
        '🏋️ Academia'
    ]);

    const futuro = getRandomItem([
        '🌟 Famoso(a)!',
        '💰 Rico(a)!',
        '🎓 Inteligente!',
        '💕 Feliz!',
        '🚀 Bem-sucedido(a)!',
        '🌍 Viajante!',
        '👑 Líder!',
        '🏆 Campeão(ã)!'
    ]);

    const nivelAmizade = getRandomInt(1, 10);
    const estrelasAmizade = '⭐'.repeat(nivelAmizade);

    // ============================================================
    // 📊 MENSAGEM SIMPLIFICADA
    // ============================================================

    const texto = `${emojiNome} 〘 ${CONFIG.botNome} - 𝐏𝐄𝐑𝐅𝐈𝐋 〙 ${emojiNome}
╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 👤 @${nome}
┃ 🎂 ${idade} anos
┃ 📏 ${altura}cm
┃ ⚖️ ${peso}kg
┃ 🔮 ${signo.emoji} ${signo.nome}
╰━━━━━━━━━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 🏳️‍🌈 𝐆𝐚𝐲: ${gay}% ${getEmojiPorcento(gay)}
┃ 🦌 𝐂𝐨𝐫𝐧𝐨: ${corno}% ${getEmojiPorcento(corno)}
┃ ✨ 𝐋𝐢𝐧𝐝𝐨: ${lindo}% ${getEmojiPorcento(lindo)}
┃ 👹 𝐅𝐞𝐢𝐨: ${feio}% ${getEmojiPorcento(feio)}
┃ 🧠 𝐈𝐧𝐭𝐞𝐥𝐢𝐠𝐞𝐧𝐭𝐞: ${inteligente}% ${getEmojiPorcento(inteligente)}
┃ 🌟 𝐋𝐞𝐠𝐚𝐥: ${legal}% ${getEmojiPorcento(legal)}
╰━━━━━━━━━━━━━⬢

╭━━━━━━━━━━━━━⬢
┃ 😇 𝐏𝐞𝐫𝐬𝐨𝐧𝐚𝐥𝐢𝐝𝐚𝐝𝐞: ${bemMal}
┃ ❤️ 𝐑𝐞𝐥𝐚𝐜𝐢𝐨𝐧𝐚𝐦𝐞𝐧𝐭𝐨: ${statusRelacionamento}
┃ 🎯 𝐇𝐨𝐛𝐛𝐲: ${hobby}
┃ 🔮 𝐅𝐮𝐭𝐮𝐫𝐨: ${futuro}
┃ 🤝 𝐀𝐦𝐢𝐳𝐚𝐝𝐞: ${estrelasAmizade} (${nivelAmizade}/10)
╰━━━━━━━━━━━━━⬢

『 ${CONFIG.botNome} 』`;

    if (foto) {
        await sock.sendMessage(chat, {
            image: { url: foto },
            caption: texto,
            mentions: [target]
        }, { quoted: msg });
    } else {
        await sock.sendMessage(chat, {
            text: texto,
            mentions: [target]
        }, { quoted: msg });
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdPerfil,
    getFotoAleatoria,
    getNomeUsuario,
    FOTOS_PADRAO,
    SIGNOS
};