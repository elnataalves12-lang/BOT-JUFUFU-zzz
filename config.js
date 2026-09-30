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
            feio:   "https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/96fc1a8c-5c6e-4867-b2d7-12dedad9eecc/3665443_1434842412170.58res_500_277.jpg?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzLzk2ZmMxYThjLTVjNmUtNDg2Ny1iMmQ3LTEyZGVkYWQ5ZWVjYy8zNjY1NDQzXzE0MzQ4NDI0MTIxNzAuNThyZXNfNTAwXzI3Ny5qcGciLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzkwNzI1NDI3LCJleHAiOjIxMDYwODU0Mjd9.hJKSxMTsonSbTlCUOdiY1A5vVPD5D6kOKkSir6al2FxVTtNovP1aGnqR1LN0FcG1AYBt0LcM5iZtKliLxTxdpQ",
            bonito: "https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/e6937f56-96c2-4805-83c0-8919acaff7db/shinichi-kudo-1iv6lviwv0q46.jpg?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzL2U2OTM3ZjU2LTk2YzItNDgwNS04M2MwLTg5MTlhY2FmZjdkYi9zaGluaWNoaS1rdWRvLTFpdjZsdml3djBxNDYuanBnIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MDcyNTQyNiwiZXhwIjoyMTA2MDg1NDI2fQ.-EPeUmjh3v9hivOsgDhHOhP4v1IH56Ak8Slon_I2-jYAV-BcDrV8_fP26wj66xW6rQY3s2YQRxzQFA20UPybXQ",
            corno:  "https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/838d3e2e-7e12-448f-a394-4aa8a887ea8f/702622801c19bb62078c6b2a77fd7a6e.jpg?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzLzgzOGQzZTJlLTdlMTItNDQ4Zi1hMzk0LTRhYThhODg3ZWE4Zi83MDI2MjI4MDFjMTliYjYyMDc4YzZiMmE3N2ZkN2E2ZS5qcGciLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzkwNzI1NDI1LCJleHAiOjIxMDYwODU0MjV9.FeCBU8ylbiYcyF0ftpcqYJVeGcuDP9-gq-g6HG3-_HJwR2CHQt_8RiJKDRGncL-m0WbU6vo9S-_VFMxFqaFH0w",
            gay:    "https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/ccb4d444-50a7-4501-abd8-f9f2eab92708/17c062a1ef0aa891b31d20e9e482c5a9.jpg?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzL2NjYjRkNDQ0LTUwYTctNDUwMS1hYmQ4LWY5ZjJlYWI5MjcwOC8xN2MwNjJhMWVmMGFhODkxYjMxZDIwZTllNDgyYzVhOS5qcGciLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzkwNzI1NDI0LCJleHAiOjIxMDYwODU0MjR9.uOUMnqcNv7C3f1bNEoreS1cRHsFwDCIte5NPDtO0kgGor86fwmXPv1jcXLUm0NL-gGGi1at8ANvc0FXz0kCsaw",
            fofo:   "https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/9142b466-c650-4bf8-98a5-bf41d5a429f8/9500aec67ffe9ac9e27ffe1eeda78d1f.jpg?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzLzkxNDJiNDY2LWM2NTAtNGJmOC05OGE1LWJmNDFkNWE0MjlmOC85NTAwYWVjNjdmZmU5YWM5ZTI3ZmZlMWVlZGE3OGQxZi5qcGciLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzkwNzI1NDIzLCJleHAiOjIxMDYwODU0MjN9.TnmrBwyu2TV6f-8uyUDBldcLKej7mLK487Zm38uHUtLoM2Cg8DY76-g5Vi05W_lkRnpjwQeFXM3F-v6roDTq5g",
            doido:  "https://dbzrrcjeciyprxyvoqra.supabase.co/storage/v1/object/sign/uploads/e78e65c1-c056-43ca-a05e-488023a31f1d/Gtbemegtplayingfriendspokemonruby_a3664d6ca46ca1564ff1fc29f418e9bc.png?token=eyJraWQiOiI2M2QxNzA5MS00NzYxLTRjY2EtOWZmMS1hYThiMzA5MmRmMGQiLCJhbGciOiJIUzUxMiJ9.eyJ1cmwiOiJ1cGxvYWRzL2U3OGU2NWMxLWMwNTYtNDNjYS1hMDVlLTQ4ODAyM2EzMWYxZC9HdGJlbWVndHBsYXlpbmdmcmllbmRzcG9rZW1vbnJ1YnlfYTM2NjRkNmNhNDZjYTE1NjRmZjFmYzI5ZjQxOGU5YmMucG5nIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MDcyNTQyMSwiZXhwIjoyMTA2MDg1NDIxfQ.7Qr-v_ad9lud0OJyKumq2-5qLgJzlLKIy-dqCCxbo6aBpSI1vGvO9YFo1XAdLYUI8p3yaUQENLfDPSvHsAHMdw"
        }
    }
};