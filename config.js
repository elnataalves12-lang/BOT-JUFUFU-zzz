// ================================================================
//  JUFUFU BOT • Arquivo de configuração
// ================================================================
//  ✏️ EDITE APENAS AS PARTES MARCADAS COM "EDITE"
//  ⚠️ NÃO MEXA nas partes marcadas com "NÃO ALTERE"
// ================================================================

module.exports = {

    // ============================================================
    //  🎨 IDENTIDADE DO BOT (EDITE)
    // ============================================================
    prefix: "°",                                    // Prefixo dos comandos (ex: °, !, ., /)
    botNome: "𝙹𝚄𝙵𝚄𝙵𝚄-ᶻᶻᶻ_b̶o҈꓄",                     // Nome do bot
    versao: "3.0",                                  // Versão (aparece no °bot)
    canalLink: "https://whatsapp.com/channel/SEU_CANAL_AQUI",  // Link do seu canal WhatsApp


    // ============================================================
    //  👑 DONOS DO BOT (EDITE)
    // ============================================================
    //  Coloque os números autorizados a usar comandos de dono.
    //  Formato: DDI + DDD + número (sem + ou espaços)
    //  Exemplo: "5599999999999"
    // ============================================================
    donos: [
        "5599999999999",
    ],


    // ============================================================
    //  📋 APP DE MENUS — Quick Menu Bot (EDITE)
    // ============================================================
    //  Este é o app que fornece os menus (menu, menuadm, etc).
    //  Para obter seu token:
    //  1. Acesse: https://quick-menu-bot.lovable.app/inicio
    //  2. Copie o token e cole abaixo
    // ============================================================
    menuApp: {
        baseUrl: 'https://quick-menu-bot.lovable.app',   // ⚠️ NÃO ALTERE
        token: '',                                        // ← Cole seu token aqui
        timeout: 15000                                    // ⚠️ NÃO ALTERE
    },


    // ============================================================
    //  📀 JU API — Supabase (EDITE)
    // ============================================================
    //  API principal para: °play, °yt, °img, °tts, °pinterest,
    //  °waifu, °neko, °fig, etc.
    //  Para obter sua chave:
    //  1. Acesse: https://ju-api-web-app-qgj9.bolt.host/
    //  2. Adquira uma chave (formato: ju-xxxxxxxx-xxxx)
    // ============================================================
    jufufuAPI: {
        baseUrl: 'https://ratovkgwkvqqcxnmeeky.supabase.co/functions/v1/ju-api',  // ⚠️ NÃO ALTERE
        apiKey: '',                                                                // ← Cole sua chave aqui
        timeout: 60000                                                             // ⚠️ NÃO ALTERE
    },


    // ============================================================
    //  ⚙️ ATIVAÇÃO/DESATIVAÇÃO DE COMANDOS (EDITE)
    // ============================================================
    //  Coloque true para ativar, false para desativar.
    // ============================================================
    comandos: {
        play: true,             // °play - música
        yt: true,               // °yt - vídeo do YouTube
        img: true,              // °img - gerar imagem com IA
        pinterest: true,        // °pinterest - busca imagens
        sticker: true,          // °sticker - criar figurinha
        audio: true,            // °audio - efeitos de áudio
        stickerToMedia: true,   // °sticker2img
        stickerToGif: true      // °sticker2gif
    },


    // ============================================================
    //  🎨 FIGURINHAS (EDITE)
    // ============================================================
    sticker: {
        packName: "Jufufu BOT",                          // Nome do pacote de figurinhas
        author: "jufufu • +55 91 8445-7350",             // Autor do pacote
        maxVideoDuration: 10,                            // Duração máx. de vídeo (segundos)
        quality: 90                                      // Qualidade (1-100)
    },


    // ============================================================
    //  🛡️ ANTI-PALAVRÃO (EDITE)
    // ============================================================
    antiPalavrao: {
        modoPadrao: 1,          // 1 = só apaga | 2 = apaga e censura
        limiteAlertas: 4,       // Nº de palavrões em X segundos = ban
        tempoLimite: 10000      // Janela de tempo (ms)
    },


    // ============================================================
    //  🔧 CONFIGURAÇÕES AVANÇADAS (⚠️ NÃO ALTERE)
    // ============================================================
    //  Só mexa se souber o que está fazendo.
    // ============================================================

    // Pinterest — limite de imagens por busca
    pinterest: {
        maxImages: 5,
        timeout: 10000
    },

    // IA Sunny (usada pelo °img)
    sunny: {
        format: "png",
        timeout: 30000
    },

    // Rankings — imagens de fundo
    rankings: {
        imagens: {
            feio:   "https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1786314733396-l1tfjp.jpg",
            bonito: "https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1786314639750-d78qfh.jpg",
            corno:  "https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1786314666040-kw7kt0.jpg",
            gay:    "https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1786314679379-gw8j24.png",
            fofo:   "https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1786314702204-hsh2eo.png",
            doido:  "https://wivkiglslhvvmutsexlx.supabase.co/storage/v1/object/public/uploads/1786314719313-4p38hs.png"
        }
    }
};