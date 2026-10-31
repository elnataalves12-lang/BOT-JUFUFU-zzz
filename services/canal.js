// ==================== CANAL (JID) ====================
// services/canal.js
//
// Função centralizada pra pegar o JID do canal
// Usada em: botInfo, play, sticker, etc.

let _canalJidCache = null;

async function pegarJidCanal(sock, CONFIG) {
    if (_canalJidCache) return _canalJidCache;

    try {
        const link = CONFIG.canalLink || '';
        if (!link.includes('whatsapp.com/channel/')) {
            return null;
        }

        const inviteCode = link.split('whatsapp.com/channel/')[1]?.split(/[/?#]/)[0];
        if (!inviteCode) return null;

        const metadata = await sock.newsletterMetadata('invite', inviteCode);

        if (metadata && metadata.id) {
            _canalJidCache = metadata.id;
            return metadata.id;
        }
    } catch (e) {
        console.error('❌ Erro ao pegar JID do canal:', e.message);
    }

    return null;
}

function montarContextoEncaminhamento(canalJid, nomeBot) {
    if (!canalJid) return {};
    return {
        isForwarded: true,
        forwardingScore: 1,
        forwardedNewsletterMessageInfo: {
            newsletterJid: canalJid,
            newsletterName: nomeBot || 'JUFUFU Bot',
            serverMessageId: ''
        }
    };
}

module.exports = { pegarJidCanal, montarContextoEncaminhamento };