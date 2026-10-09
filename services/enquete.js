// ==================== COMANDO ENQUETE ====================
// services/enquete.js
//
// Uso:
//   °enquete        → sorteia uma enquete aleatória
//   °enquete lista  → mostra todas as enquetes disponíveis
//   °enquete <id>   → envia uma enquete específica pelo número
//
// Enquetes nativas do WhatsApp (todos podem votar)
// ============================================================

// ==================== BANCO DE ENQUETES ====================
const ENQUETES = [
    // ============================================================
    // 🍔 COMIDA E BEBIDA (1-15)
    // ============================================================
    { id: 1,  pergunta: '🍕 O que é melhor?', opcoes: ['Pizza', 'Hambúrguer'], selectable: 1 },
    { id: 2,  pergunta: '☕ Qual você prefere?', opcoes: ['Café', 'Chá', 'Suco', 'Refrigerante'], selectable: 1 },
    { id: 3,  pergunta: '🍫 Doce ou Salgado?', opcoes: ['Doce 🍰', 'Salgado 🍟'], selectable: 1 },
    { id: 4,  pergunta: '🍕 Pizza doce ou salgada?', opcoes: ['Salgada 🍕', 'Doce 🍫', 'As duas 🤤'], selectable: 1 },
    { id: 5,  pergunta: '🍔 Fast food favorito?', opcoes: ['McDonald\'s', 'Burger King', 'Subway', 'Outro'], selectable: 1 },
    { id: 6,  pergunta: '🍦 Sorvete: casquinha ou pote?', opcoes: ['Casquinha 🍦', 'Pote 🥄'], selectable: 1 },
    { id: 7,  pergunta: '🌮 Comida mexicana ou italiana?', opcoes: ['Mexicana 🌮', 'Italiana 🍝', 'As duas 🤤'], selectable: 1 },
    { id: 8,  pergunta: '🍟 Batata frita: com ou sem?', opcoes: ['Com ketchup 🍅', 'Com maionese 🥚', 'Com mostarda 💛', 'Pura 🍟'], selectable: 1 },
    { id: 9,  pergunta: '🥤 Refri com gelo ou sem?', opcoes: ['Com gelo 🧊', 'Sem gelo 🥤', 'Natural 🌡️'], selectable: 1 },
    { id: 10, pergunta: '🍣 Sushi: você ama ou odeia?', opcoes: ['Amo 🤤', 'Odeio 🤢', 'Nunca comi 😅'], selectable: 1 },
    { id: 11, pergunta: '🍝 Massa: ao dente ou mole?', opcoes: ['Ao dente 🍝', 'Mole 🥣'], selectable: 1 },
    { id: 12, pergunta: '🌶️ Você come pimenta?', opcoes: ['Adoro 🌶️', 'Um pouco 😅', 'Nem pensar 🥵'], selectable: 1 },
    { id: 13, pergunta: '🍳 Ovo: mexido ou frito?', opcoes: ['Mexido 🍳', 'Frito 🍳', 'Cozido 🥚'], selectable: 1 },
    { id: 14, pergunta: '🥩 Carne: mal ou bem passada?', opcoes: ['Mal 🩸', 'Ao ponto 🥩', 'Bem 🔥', 'Nem como 🥗'], selectable: 1 },
    { id: 15, pergunta: '🍩 Café da manhã ideal?', opcoes: ['Pão com ovo 🍳', 'Cereal 🥣', 'Frutas 🍎', 'Só café ☕'], selectable: 1 },

    // ============================================================
    // 🎬 ENTRETENIMENTO (16-30)
    // ============================================================
    { id: 16, pergunta: '🎬 O que você assiste mais?', opcoes: ['Filme', 'Série', 'Anime', 'Novela'], selectable: 1 },
    { id: 17, pergunta: '📺 Onde você assiste mais?', opcoes: ['Netflix', 'YouTube', 'TikTok', 'Outros'], selectable: 1 },
    { id: 18, pergunta: '🎵 Gênero musical favorito?', opcoes: ['Pop 🎤', 'Rock 🎸', 'Funk 🕺', 'Sertanejo 🤠', 'Outro 🎧'], selectable: 1 },
    { id: 19, pergunta: '📚 Livro ou filme?', opcoes: ['Livro 📚', 'Filme 🎬', 'Os dois 👌', 'Nenhum 😅'], selectable: 1 },
    { id: 20, pergunta: '🎮 Você joga videogame?', opcoes: ['Muito 🎮', 'Um pouco 🕹️', 'Nunca 🚫'], selectable: 1 },
    { id: 21, pergunta: '🎭 Teatro ou cinema?', opcoes: ['Teatro 🎭', 'Cinema 🎬', 'Em casa 🏠'], selectable: 1 },
    { id: 22, pergunta: '🎤 Você canta no banho?', opcoes: ['Sim sempre 🚿', 'Às vezes 🎶', 'Nunca 🤐'], selectable: 1 },
    { id: 23, pergunta: '📱 Rede social favorita?', opcoes: ['Instagram 📸', 'TikTok 🎵', 'Twitter/X 🐦', 'WhatsApp 💬'], selectable: 1 },
    { id: 24, pergunta: '🎧 Fone de ouvido ou caixa de som?', opcoes: ['Fone 🎧', 'Caixa 🔊', 'Os dois 🎶'], selectable: 1 },
    { id: 25, pergunta: '🎨 Você desenha?', opcoes: ['Sim ✏️', 'Um pouco 🖌️', 'Nunca 🚫'], selectable: 1 },
    { id: 26, pergunta: '🎪 Circo: você gosta?', opcoes: ['Adoro 🎪', 'Tanto faz 😊', 'Não curto 🙅'], selectable: 1 },
    { id: 27, pergunta: '🎯 Jogo favorito de infância?', opcoes: ['Esconde-esconde 🙈', 'Pega-pega 🏃', 'Bola ⚽', 'Videogame 🎮'], selectable: 1 },
    { id: 28, pergunta: '📺 Você assiste desenho até hoje?', opcoes: ['Com certeza 🎨', 'Às vezes 😊', 'Não 🚫'], selectable: 1 },
    { id: 29, pergunta: '🎬 Filme de terror ou comédia?', opcoes: ['Terror 👻', 'Comédia 😂', 'Drama 😢', 'Ação 💥'], selectable: 1 },
    { id: 30, pergunta: '🎵 Música alta ou baixa?', opcoes: ['Bem alta 🔊', 'Média 🎶', 'Bem baixa 🎧'], selectable: 1 },

    // ============================================================
    // 🐾 ANIMAIS E NATUREZA (31-42)
    // ============================================================
    { id: 31, pergunta: '🐶 Cachorro ou Gato?', opcoes: ['Cachorro', 'Gato', 'Os dois', 'Nenhum'], selectable: 1 },
    { id: 32, pergunta: '🐍 Você teria um réptil de estimação?', opcoes: ['Sim 🦎', 'Não 🚫', 'Talvez 🤔'], selectable: 1 },
    { id: 33, pergunta: '🦁 Animal favorito?', opcoes: ['Leão 🦁', 'Tigre 🐯', 'Elefante 🐘', 'Águia 🦅'], selectable: 1 },
    { id: 34, pergunta: '🐟 Aquário em casa: sim ou não?', opcoes: ['Sim 🐠', 'Não 🚫', 'Já tive 💭'], selectable: 1 },
    { id: 35, pergunta: '🦋 Insetos te assustam?', opcoes: ['Sim 😱', 'Um pouco 😬', 'Não 😎'], selectable: 1 },
    { id: 36, pergunta: '🐦 Você cria pássaro?', opcoes: ['Sim 🐦', 'Não 🚫', 'Queria 🥺'], selectable: 1 },
    { id: 37, pergunta: '🦈 Tubarão ou golfinho?', opcoes: ['Tubarão 🦈', 'Golfinho 🐬', 'Os dois 💙'], selectable: 1 },
    { id: 38, pergunta: '🐘 Animal mais inteligente?', opcoes: ['Golfinho 🐬', 'Elefante 🐘', 'Corvo 🐦‍⬛', 'Polvo 🐙'], selectable: 1 },
    { id: 39, pergunta: '🦂 Você mataria uma aranha em casa?', opcoes: ['Sim 🥾', 'Não 😱', 'Chamo alguém 🙋'], selectable: 1 },
    { id: 40, pergunta: '🌳 Praia ou campo?', opcoes: ['Praia 🏖️', 'Campo 🌾', 'Montanha ⛰️', 'Cidade 🏙️'], selectable: 1 },
    { id: 41, pergunta: '🌧️ Você gosta de chuva?', opcoes: ['Adoro ☔', 'Tanto faz 😊', 'Não 🌞'], selectable: 1 },
    { id: 42, pergunta: '🌅 Amanhecer ou pôr do sol?', opcoes: ['Amanhecer 🌅', 'Pôr do sol 🌇'], selectable: 1 },

    // ============================================================
    // ⏰ HÁBITOS E ROTINA (43-55)
    // ============================================================
    { id: 43, pergunta: '⏰ Você é mais:', opcoes: ['Madrugador 🌅', 'Noturno 🌙'], selectable: 1 },
    { id: 44, pergunta: '🛏️ Você arruma a cama?', opcoes: ['Sempre ✅', 'Às vezes 😅', 'Nunca 🚫'], selectable: 1 },
    { id: 45, pergunta: '🚿 Banho: quente ou frio?', opcoes: ['Quente 🔥', 'Frio 🧊', 'Morno 🌡️'], selectable: 1 },
    { id: 46, pergunta: '🍳 Você cozinha?', opcoes: ['Muito 👨‍🍳', 'Um pouco 🥄', 'Nada 🍽️'], selectable: 1 },
    { id: 47, pergunta: '📱 Quantas horas por dia no celular?', opcoes: ['1-3h 📱', '3-5h 📲', '5-8h 😳', '+8h 💀'], selectable: 1 },
    { id: 48, pergunta: '💤 Quantas horas você dorme?', opcoes: ['Menos de 5 😴', '5-6 😪', '7-8 😊', 'Mais de 9 🛌'], selectable: 1 },
    { id: 49, pergunta: '🚶 Você caminha todo dia?', opcoes: ['Sim 🚶', 'Às vezes 🚶‍♂️', 'Nunca 🛋️'], selectable: 1 },
    { id: 50, pergunta: '💪 Você pratica exercícios?', opcoes: ['Todo dia 🏋️', 'Às vezes 🏃', 'Raramente 😅', 'Nunca 🛋️'], selectable: 1 },
    { id: 51, pergunta: '📚 Você lê livros?', opcoes: ['Muito 📖', 'Um pouco 📕', 'Raramente 📗', 'Nunca 🚫'], selectable: 1 },
    { id: 52, pergunta: '☕ Quantas xícaras de café por dia?', opcoes: ['Nenhuma 🚫', '1-2 ☕', '3-4 ☕☕', '+5 💀'], selectable: 1 },
    { id: 53, pergunta: '🛒 Você faz compras online?', opcoes: ['Sempre 📦', 'Às vezes 🛍️', 'Raramente 🚫'], selectable: 1 },
    { id: 54, pergunta: '🧹 Você arruma a casa com frequência?', opcoes: ['Todo dia 🧽', 'Semana sim 🧹', 'Quando dá 😅', 'Raramente 🙈'], selectable: 1 },
    { id: 55, pergunta: '📅 Você usa agenda?', opcoes: ['Sim 📓', 'No celular 📱', 'Não 🚫'], selectable: 1 },

    // ============================================================
    // 💭 FILOSÓFICAS E PREFERÊNCIAS (56-70)
    // ============================================================
    { id: 56, pergunta: '💭 Você acredita em destino?', opcoes: ['Sim 🌟', 'Não 🎯', 'Talvez 🤔'], selectable: 1 },
    { id: 57, pergunta: '🔮 Você acredita em signos?', opcoes: ['Sim ♈', 'Não 🚫', 'Um pouco 😊'], selectable: 1 },
    { id: 58, pergunta: '👽 Você acredita em ETs?', opcoes: ['Sim 🛸', 'Não 🚫', 'Talvez 👀'], selectable: 1 },
    { id: 59, pergunta: '🎁 Presente: dar ou receber?', opcoes: ['Dar 🎁', 'Receber 🥰', 'Os dois 😊'], selectable: 1 },
    { id: 60, pergunta: '💍 Você quer se casar?', opcoes: ['Sim 💍', 'Não 🚫', 'Talvez 🤔'], selectable: 1 },
    { id: 61, pergunta: '👶 Você quer ter filhos?', opcoes: ['Sim 👶', 'Não 🚫', 'Talvez 🤔'], selectable: 1 },
    { id: 62, pergunta: '🌍 Você viajaria pro exterior?', opcoes: ['Sim ✈️', 'Não 🏠', 'Só com dinheiro 💰'], selectable: 1 },
    { id: 63, pergunta: '💰 Dinheiro ou felicidade?', opcoes: ['Dinheiro 💰', 'Felicidade 😊', 'Os dois 🎯'], selectable: 1 },
    { id: 64, pergunta: '📖 Você acredita em amor à primeira vista?', opcoes: ['Sim 💘', 'Não 🚫', 'Só em filme 🎬'], selectable: 1 },
    { id: 65, pergunta: '🌟 Otimista ou pessimista?', opcoes: ['Otimista 🌞', 'Pessimista 🌧️', 'Realista 🎯'], selectable: 1 },
    { id: 66, pergunta: '🤝 Você perdoa fácil?', opcoes: ['Sim 😇', 'Não 😠', 'Depende do caso 🤔'], selectable: 1 },
    { id: 67, pergunta: '⚡ Você é ansioso(a)?', opcoes: ['Sim sempre 😰', 'Às vezes 😅', 'Nunca 😎'], selectable: 1 },
    { id: 68, pergunta: '🎯 Você tem metas pra 2026?', opcoes: ['Sim muitas 🚀', 'Uma ou outra 🎯', 'Nenhuma 😅'], selectable: 1 },
    { id: 69, pergunta: '🌙 Você sonha muito?', opcoes: ['Sim sempre 💭', 'Às vezes 💤', 'Nunca 😴'], selectable: 1 },
    { id: 70, pergunta: '🧠 Você decorou tabuada?', opcoes: ['Sim 💯', 'Um pouco 🔢', 'Não 🚫'], selectable: 1 },

    // ============================================================
    // 🎮 TECNOLOGIA E JOGOS (71-82)
    // ============================================================
    { id: 71, pergunta: '📱 Android ou iPhone?', opcoes: ['Android 🤖', 'iPhone 🍎', 'Tanto faz 😊'], selectable: 1 },
    { id: 72, pergunta: '💻 PC ou Notebook?', opcoes: ['PC 🖥️', 'Notebook 💻', 'Tablet 📱'], selectable: 1 },
    { id: 73, pergunta: '🎮 Console favorito?', opcoes: ['PlayStation 🎮', 'Xbox 🎯', 'Nintendo 🍄', 'PC 🖥️'], selectable: 1 },
    { id: 74, pergunta: '🎮 FPS ou RPG?', opcoes: ['FPS 🔫', 'RPG 🗡️', 'MOBA ⚔️', 'Esporte ⚽'], selectable: 1 },
    { id: 75, pergunta: '🕹️ Free Fire ou Fortnite?', opcoes: ['Free Fire 🔥', 'Fortnite 🏗️', 'Nenhum 🚫'], selectable: 1 },
    { id: 76, pergunta: '🎮 Você joga Roblox?', opcoes: ['Sim 🧱', 'Não 🚫', 'Já joguei 💭'], selectable: 1 },
    { id: 77, pergunta: '🤖 IA vai dominar o mundo?', opcoes: ['Sim 🤖', 'Não 🚫', 'Já dominou 😅'], selectable: 1 },
    { id: 78, pergunta: '📧 Você ainda usa e-mail?', opcoes: ['Muito 📧', 'Um pouco 📨', 'Nunca 🚫'], selectable: 1 },
    { id: 79, pergunta: '💾 Você faz backup?', opcoes: ['Sempre 💾', 'Às vezes 💭', 'Nunca 😅'], selectable: 1 },
    { id: 80, pergunta: '🔋 Bateria: 100% sempre?', opcoes: ['Sim ✅', 'Só quando dá 😅', 'Nunca 🚫'], selectable: 1 },
    { id: 81, pergunta: '🖱️ Mouse ou touchpad?', opcoes: ['Mouse 🖱️', 'Touchpad 👆', 'Tela 📱'], selectable: 1 },
    { id: 82, pergunta: '📺 Smart TV ou comum?', opcoes: ['Smart 📺', 'Comum 📻', 'Chromecast 📡'], selectable: 1 },

    // ============================================================
    // 🌍 MUNDO E CULTURA (83-92)
    // ============================================================
    { id: 83, pergunta: '🏖️ Lugar perfeito para férias?', opcoes: ['Praia', 'Montanha', 'Cidade Grande'], selectable: 1 },
    { id: 84, pergunta: '✈️ Você viajaria sozinho(a)?', opcoes: ['Sim 🎒', 'Não 🙅', 'Depende 🤔'], selectable: 1 },
    { id: 85, pergunta: '🗣️ Quantos idiomas você fala?', opcoes: ['1 🇧🇷', '2 🌎', '3+ 🧠'], selectable: 1 },
    { id: 86, pergunta: '🌎 Qual continente você quer conhecer?', opcoes: ['Europa 🇪🇺', 'Ásia 🌏', 'África 🌍', 'Américas 🌎'], selectable: 1 },
    { id: 87, pergunta: '🏛️ Museu ou parque?', opcoes: ['Museu 🏛️', 'Parque 🌳', 'Os dois 😊'], selectable: 1 },
    { id: 88, pergunta: '🍽️ Comida típica favorita?', opcoes: ['Feijoada 🇧🇷', 'Sushi 🇯🇵', 'Pizza 🇮🇹', 'Taco 🇲🇽'], selectable: 1 },
    { id: 89, pergunta: '🎭 Você assiste jornal?', opcoes: ['Todo dia 📺', 'Às vezes 📰', 'Nunca 🚫'], selectable: 1 },
    { id: 90, pergunta: '🗳️ Você vota em quem?', opcoes: ['Em quem gosto 💙', 'Em quem promete 🤝', 'Em ninguém 🚫'], selectable: 1 },
    { id: 91, pergunta: '🌐 Você fala outra língua?', opcoes: ['Sim 🗣️', 'Um pouco 📖', 'Só português 🇧🇷'], selectable: 1 },
    { id: 92, pergunta: '📚 Você conhece a história do seu país?', opcoes: ['Muito 🇧🇷', 'Um pouco 📖', 'Quase nada 😅'], selectable: 1 },

    // ============================================================
    // 🎉 DIVERSÃO E PREFERÊNCIAS (93-100)
    // ============================================================
    { id: 93, pergunta: '☀️❄️ Estação favorita?', opcoes: ['Verão ☀️', 'Inverno ❄️', 'Outono 🍂', 'Primavera 🌸'], selectable: 1 },
    { id: 94, pergunta: '🌧️ Você usa guarda-chuva?', opcoes: ['Sempre ☂️', 'Às vezes 🌂', 'Nunca 🏃'], selectable: 1 },
    { id: 95, pergunta: '👟 Tênis ou chinelo?', opcoes: ['Tênis 👟', 'Chinelo 🩴', 'Sandália 🥿', 'Descalço 🦶'], selectable: 1 },
    { id: 96, pergunta: '🎨 Cor favorita?', opcoes: ['Azul 💙', 'Vermelho ❤️', 'Verde 💚', 'Roxo 💜', 'Preto 🖤'], selectable: 1 },
    { id: 97, pergunta: '😴 Você ronca?', opcoes: ['Sim 😴', 'Não 🤐', 'Não sei 🤷'], selectable: 1 },
    { id: 98, pergunta: '🎈 Você tem medo de altura?', opcoes: ['Sim 😱', 'Um pouco 😬', 'Não 🦅'], selectable: 1 },
    { id: 99, pergunta: '🚗 Você tem carro?', opcoes: ['Sim 🚗', 'Não 🚌', 'Carteira mas sem carro 🪪'], selectable: 1 },
    { id: 100, pergunta: '🎉 Sexta ou Domingo?', opcoes: ['Sexta 🎉', 'Sábado 🥳', 'Domingo 😴'], selectable: 1 }
];

// ==================== FUNÇÕES AUXILIARES ====================
function sortearEnquete() {
    return ENQUETES[Math.floor(Math.random() * ENQUETES.length)];
}

function pegarPorId(id) {
    return ENQUETES.find(e => e.id === parseInt(id));
}

// ==================== COMANDO PRINCIPAL ====================
async function cmdEnquete(chat, sock, sender, msg, args, enviarResposta, reagir, CONFIG) {
    try {
        const subcomando = args[0]?.toLowerCase();

        // ============================================================
        // 🔥 °enquete lista → mostra todas
        // ============================================================
        if (subcomando === 'lista' || subcomando === 'list' || subcomando === 'todas') {
            // 🔥 COMO SÃO 100, DIVIDE EM PÁGINAS DE 25
            const pagina = parseInt(args[1]) || 1;
            const porPagina = 25;
            const totalPaginas = Math.ceil(ENQUETES.length / porPagina);
            const inicio = (pagina - 1) * porPagina;
            const fim = inicio + porPagina;
            const enquetePagina = ENQUETES.slice(inicio, fim);

            if (enquetePagina.length === 0) {
                await enviarResposta(chat, sock, `❌ Página ${pagina} não existe! Total: ${totalPaginas} páginas.`, msg);
                return;
            }

            let texto = `╭━━━━━━━━━━━━━━━━━━━━━⬢\n┃ 📊 *ENQUETES DISPONÍVEIS*\n┃ 📄 Página ${pagina}/${totalPaginas}\n╰━━━━━━━━━━━━━━━━━━━━━⬢\n\n`;

            for (const e of enquetePagina) {
                texto += `┃ *${e.id}.* ${e.pergunta}\n`;
                texto += `┃    ${e.opcoes.join(' | ')}\n`;
                texto += `┃ ──────────────────────────\n`;
            }

            texto += `\n╭━━━━━━━━━━━━━━━━━━━━━⬢\n`;
            texto += `┃ 📌 Total: *${ENQUETES.length}* enquetes\n`;
            texto += `┃ 📄 Página: ${pagina}/${totalPaginas}\n`;
            if (pagina < totalPaginas) {
                texto += `┃ ➡️ Próxima: ${CONFIG.prefix}enquete lista ${pagina + 1}\n`;
            }
            if (pagina > 1) {
                texto += `┃ ⬅️ Anterior: ${CONFIG.prefix}enquete lista ${pagina - 1}\n`;
            }
            texto += `┃ 🎲 Aleatória: ${CONFIG.prefix}enquete\n`;
            texto += `┃ 📌 Específica: ${CONFIG.prefix}enquete <id>\n`;
            texto += `╰━━━━━━━━━━━━━━━━━━━━━⬢\n『 ${CONFIG.botNome} 』`;

            await enviarResposta(chat, sock, texto, msg);
            if (reagir) await reagir(sock, chat, msg.key.id, '📊');
            return;
        }

        // ============================================================
        // 🔥 °enquete <id> → específica
        // ============================================================
        let enquete;
        if (subcomando && !isNaN(parseInt(subcomando))) {
            enquete = pegarPorId(subcomando);
            if (!enquete) {
                await enviarResposta(chat, sock,
                    `❌ Enquete *#${subcomando}* não existe!\n📌 Use ${CONFIG.prefix}enquete lista para ver todas.`,
                    msg
                );
                if (reagir) await reagir(sock, chat, msg.key.id, '❌');
                return;
            }
        } else {
            // ============================================================
            // 🔥 °enquete → aleatória
            // ============================================================
            enquete = sortearEnquete();
        }

        // ============================================================
        // 🔥 ENVIA A ENQUETE NATIVA DO WHATSAPP
        // ============================================================
        await sock.sendMessage(chat, {
            poll: {
                name: enquete.pergunta,
                values: enquete.opcoes,
                selectableCount: enquete.selectable
            }
        }, { quoted: msg });

        if (reagir) await reagir(sock, chat, msg.key.id, '📊');

    } catch (error) {
        console.error('❌ Erro no comando enquete:', error.message);
        await enviarResposta(chat, sock, `❌ Erro ao criar enquete: ${error.message}`, msg);
        if (reagir) await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdEnquete,
    ENQUETES,
    sortearEnquete,
    pegarPorId
};