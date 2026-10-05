// ==================== SISTEMA DE CITAR ====================
// services/citar.js
//
// Comandos:
//   °marcatodos
//   °marcaradm
//   °citar (mega completo)
//
// O °citar suporta TUDO:
//   Texto, imagem, vídeo, áudio, figurinha, documento,
//   localização, contato, enquete, pacote de figurinhas,
//   link preview, evento, VU, etc.
// ============================================================

const fs = require('fs');
const path = require('path');
const { downloadMediaMessage, proto } = require('@whiskeysockets/baileys');
const P = require('pino');

// ==================== CONSTANTES ====================
const MAX_MENCOES = 120;

// ==================== VARIÁVEIS GLOBAIS ====================
let CONFIG = null;
let enviarResposta = null;
let reagir = null;
let verificarAdmin = null;
let isDono = null;

// ==================== INICIALIZAR ====================
function initModule(configInstance, sendResponseFunction, reactFunction, verificarAdminFn, isDonoFn) {
    CONFIG = configInstance;
    enviarResposta = sendResponseFunction;
    reagir = reactFunction;
    verificarAdmin = verificarAdminFn;
    isDono = isDonoFn;
    console.log('✅ Módulo Citar inicializado!');
}

// ==================== PEGAR IDS DOS MEMBROS ====================
async function pegarMembros(sock, chat) {
    const metadata = await sock.groupMetadata(chat);
    const participantes = metadata.participants;
    const allIds = participantes.map(p => p.id);
    return { metadata, allIds };
}

// ==================== GERAR LISTA DE MEMBROS ====================
function gerarListaMembros(ids) {
    let lista = '';
    for (const id of ids) {
        const nome = id.split('@')[0].split(':')[0];
        lista += `@${nome}\n`;
    }
    return lista;
}

// ==================== ENVIAR MÍDIA COM MENÇÃO ====================
async function enviarMidiaComMencao(sock, chat, quoted, buffer, mentions, texto) {
    try {
        // 🔥 IDENTIFICA O TIPO
        const isImage = !!quoted.imageMessage;
        const isVideo = !!quoted.videoMessage;
        const isAudio = !!quoted.audioMessage;
        const isSticker = !!quoted.stickerMessage;
        const isDocument = !!quoted.documentMessage;
        const isVU = !!(quoted.viewOnceMessage || quoted.viewOnceMessageV2 || quoted.viewOnceMessageV2Extension);

        // 🔥 SE FOR VU (visualização única), EXTRAI O CONTEÚDO INTERNO
        let conteudo = quoted;
        if (isVU) {
            conteudo = quoted.viewOnceMessage?.message ||
                       quoted.viewOnceMessageV2?.message ||
                       quoted.viewOnceMessageV2Extension?.message ||
                       quoted;
        }

        // 🔥 IMAGEM
        if (isImage || conteudo.imageMessage) {
            const img = conteudo.imageMessage || quoted.imageMessage;
            await sock.sendMessage(chat, {
                image: buffer,
                caption: texto || img.caption || '',
                mimetype: img.mimetype || 'image/jpeg',
                mentions
            });
            return true;
        }

        // 🔥 VÍDEO
        if (isVideo || conteudo.videoMessage) {
            const vid = conteudo.videoMessage || quoted.videoMessage;
            await sock.sendMessage(chat, {
                video: buffer,
                caption: texto || vid.caption || '',
                mimetype: vid.mimetype || 'video/mp4',
                gifPlayback: vid.gifPlayback || false,
                mentions
            });
            return true;
        }

        // 🔥 ÁUDIO
        if (isAudio || conteudo.audioMessage) {
            const aud = conteudo.audioMessage || quoted.audioMessage;
            await sock.sendMessage(chat, {
                audio: buffer,
                mimetype: aud.mimetype || 'audio/ogg; codecs=opus',
                ptt: aud.ptt || false,
                mentions
            });
            return true;
        }

        // 🔥 FIGURINHA
        if (isSticker || conteudo.stickerMessage) {
            await sock.sendMessage(chat, {
                sticker: buffer,
                mentions
            });
            return true;
        }

        // 🔥 DOCUMENTO
        if (isDocument || conteudo.documentMessage) {
            const doc = conteudo.documentMessage || quoted.documentMessage;
            await sock.sendMessage(chat, {
                document: buffer,
                mimetype: doc.mimetype || 'application/octet-stream',
                fileName: doc.fileName || 'documento',
                caption: texto || '',
                mentions
            });
            return true;
        }

        return false;

    } catch (e) {
        console.error('❌ Erro ao enviar mídia:', e.message);
        return false;
    }
}

// ==================== COMANDO °MARCATODOS ====================
async function cmdMarcaTodos(chat, sock, sender, msg) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    await reagir(sock, chat, msg.key.id, '📢');

    try {
        const metadata = await sock.groupMetadata(chat);
        const participantes = metadata.participants;

        const admins = participantes.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
        const membros = participantes.filter(p => !p.admin);

        const totalMembros = participantes.length;
        const totalAdmins = admins.length;
        const totalNormais = membros.length;

        const allIds = participantes.map(p => p.id);

        const grupoNome = metadata.subject || 'Grupo';
        const dataAtual = new Date().toLocaleDateString('pt-BR');
        const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const mensagemBase = `开启 ${CONFIG.botNome} - 📢 MARCA TODOS 〛
╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🏠 ${grupoNome}
┃ 📅 ${dataAtual} | 🕐 ${horaAtual}
╰━━━━━━━━━━━━━━━━━━━━━⬢

📊 ESTATÍSTICAS
┃ 👥 Total: ${totalMembros} membros
┃ 👑 ADMs: ${totalAdmins}
┃ 👤 Membros: ${totalNormais}

🔔 ATENÇÃO!
┃

━━━━━━━━━━━━━━━━━━━━━⬢
👥 MEMBROS:`;

        const totalParts = Math.ceil(allIds.length / MAX_MENCOES);

        if (totalParts === 1) {
            const listaMembros = gerarListaMembros(allIds);
            const textoFinal = `${mensagemBase}\n\n${listaMembros}\n╰━━━━━━━━━━━━━━━━━━━━━⬢\n『 ${CONFIG.botNome} 』`;

            await sock.sendMessage(chat, {
                text: textoFinal,
                mentions: allIds
            }, { quoted: msg });

        } else {
            await enviarResposta(chat, sock, `📢 Grupo com ${totalMembros} membros! Enviando em ${totalParts} partes...`, msg);

            for (let i = 0; i < totalParts; i++) {
                const inicio = i * MAX_MENCOES;
                const fim = Math.min(inicio + MAX_MENCOES, allIds.length);
                const parteMembros = allIds.slice(inicio, fim);
                const parteNumero = i + 1;

                const listaMembros = gerarListaMembros(parteMembros);

                const textoParte = `开启 ${CONFIG.botNome} - 📢 MARCA TODOS 〛
╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 📌 Parte ${parteNumero}/${totalParts}
┃ 👥 ${parteMembros.length} membros
╰━━━━━━━━━━━━━━━━━━━━━⬢

${listaMembros}
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

                await sock.sendMessage(chat, {
                    text: textoParte,
                    mentions: parteMembros
                }, { quoted: msg });

                if (i < totalParts - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }
        }

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        console.error('❌ Erro no marcatodos:', error);
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== COMANDO °MARCARADM ====================
async function cmdMarcarAdm(chat, sock, sender, msg) {
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    await reagir(sock, chat, msg.key.id, '👑');

    try {
        const metadata = await sock.groupMetadata(chat);
        const admins = metadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');

        if (admins.length === 0) {
            await enviarResposta(chat, sock, '📊 Nenhum administrador encontrado!', msg);
            return;
        }

        const adminIds = admins.map(p => p.id);
        const grupoNome = metadata.subject || 'Grupo';

        let listaAdms = '';
        for (const id of adminIds) {
            const nome = id.split('@')[0].split(':')[0];
            listaAdms += `@${nome}\n`;
        }

        const texto = `开启 ${CONFIG.botNome} - 👑 ADMINS 〛
╭━━━━━━━━━━━━━━━━━━━━━⬢
┃ 🏠 ${grupoNome}
┃ 👑 ${admins.length} administradores
╰━━━━━━━━━━━━━━━━━━━━━⬢

${listaAdms}
╰━━━━━━━━━━━━━━━━━━━━━⬢
『 ${CONFIG.botNome} 』`;

        await sock.sendMessage(chat, {
            text: texto,
            mentions: adminIds
        }, { quoted: msg });

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        console.error('❌ Erro:', error);
        await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== COMANDO °CITAR (MEGA COMPLETO) ====================
async function cmdCitar(chat, sock, msg, args, sender) {
    // 🔥 VERIFICA SE É ADM OU DONO
    const isAdmin = await verificarAdmin(sock, chat, sender);
    const isDonoBot = await isDono(sender);

    if (!isAdmin && !isDonoBot) {
        await enviarResposta(chat, sock, '🚫 Apenas administradores!', msg);
        return;
    }

    await reagir(sock, chat, msg.key.id, '📢');

    try {
        // ============================================================
        // 🔥 PEGA A MENSAGEM RESPONDIDA
        // ============================================================
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;

        // ============================================================
        // 🔥 PEGA OS MEMBROS DO GRUPO
        // ============================================================
        const metadata = await sock.groupMetadata(chat);
        const participantes = metadata.participants;
        const allIds = participantes.map(p => p.id);
        const totalMembros = allIds.length;
        const totalParts = Math.ceil(totalMembros / MAX_MENCOES);

        // ============================================================
        // 🔥 SE TIVER MENSAGEM RESPONDIDA
        // ============================================================
        if (quoted) {
            // 🔥 EXTRAI O CONTEÚDO (com suporte a VU)
            const isVU = !!(quoted.viewOnceMessage || quoted.viewOnceMessageV2 || quoted.viewOnceMessageV2Extension);
            const conteudo = isVU
                ? (quoted.viewOnceMessage?.message ||
                   quoted.viewOnceMessageV2?.message ||
                   quoted.viewOnceMessageV2Extension?.message ||
                   quoted)
                : quoted;

            // ============================================================
            // 🔥 IDENTIFICA O TIPO
            // ============================================================
            const isImage = !!conteudo.imageMessage;
            const isVideo = !!conteudo.videoMessage;
            const isAudio = !!conteudo.audioMessage;
            const isSticker = !!conteudo.stickerMessage;
            const isDocument = !!conteudo.documentMessage;
            const isLocation = !!conteudo.locationMessage;
            const isLiveLocation = !!conteudo.liveLocationMessage;
            const isContact = !!conteudo.contactMessage;
            const isContactsArray = !!conteudo.contactsArrayMessage;
            const isPoll = !!(conteudo.pollCreationMessage || conteudo.pollCreationMessageV2 || conteudo.pollCreationMessageV3);
            const isStickerPack = !!conteudo.stickerPackMessage;
            const isText = !!conteudo.conversation || !!conteudo.extendedTextMessage?.text;
            const isLinkPreview = !!conteudo.extendedTextMessage?.matchedText;
            const isEvent = !!conteudo.eventMessage;

            // ============================================================
            // 🔥 TEXTO DA MENSAGEM
            // ============================================================
            let texto = conteudo.conversation ||
                        conteudo.extendedTextMessage?.text ||
                        conteudo.imageMessage?.caption ||
                        conteudo.videoMessage?.caption ||
                        conteudo.documentMessage?.caption ||
                        '';

            // ============================================================
            // 🔥 MÍDIAS QUE PRECISAM BAIXAR
            // ============================================================
            if (isImage || isVideo || isAudio || isSticker || isDocument) {
                // 🔥 MONTA A MENSAGEM PRA DOWNLOAD
                const target = {
                    message: quoted,
                    key: {
                        remoteJid: chat,
                        id: quotedInfo?.stanzaId,
                        participant: quotedInfo?.participant
                    }
                };

                const buffer = await downloadMediaMessage(target, 'buffer', {}, { logger: P({ level: 'silent' }) });

                // 🔥 ENVIA PRA TODOS
                if (totalParts === 1) {
                    await enviarMidiaComMencao(sock, chat, quoted, buffer, allIds, texto);
                } else {
                    for (let i = 0; i < totalParts; i++) {
                        const inicio = i * MAX_MENCOES;
                        const fim = Math.min(inicio + MAX_MENCOES, allIds.length);
                        const parteMembros = allIds.slice(inicio, fim);

                        await enviarMidiaComMencao(sock, chat, quoted, buffer, parteMembros, texto);

                        if (i < totalParts - 1) {
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        }
                    }
                }
            }

            // ============================================================
            // 🔥 LOCALIZAÇÃO
            // ============================================================
            else if (isLocation || isLiveLocation) {
                const loc = conteudo.locationMessage || conteudo.liveLocationMessage;
                texto = `📍 *Localização*\n\n📌 ${loc.name || 'Sem nome'}\n📍 ${loc.address || 'Sem endereço'}\n🌐 Lat: ${loc.degreesLatitude}\n🌐 Long: ${loc.degreesLongitude}`;

                if (totalParts === 1) {
                    await sock.sendMessage(chat, { text: texto, mentions: allIds });
                } else {
                    for (let i = 0; i < totalParts; i++) {
                        const inicio = i * MAX_MENCOES;
                        const fim = Math.min(inicio + MAX_MENCOES, allIds.length);
                        const parteMembros = allIds.slice(inicio, fim);
                        await sock.sendMessage(chat, { text: texto, mentions: parteMembros });
                        if (i < totalParts - 1) await new Promise(r => setTimeout(r, 1500));
                    }
                }
            }

            // ============================================================
            // 🔥 CONTATO (vCard)
            // ============================================================
            else if (isContact || isContactsArray) {
                const contatos = isContact
                    ? [conteudo.contactMessage]
                    : conteudo.contactsArrayMessage.contacts;

                texto = `👤 *Contato(s)*\n\n`;
                for (const c of contatos) {
                    texto += `📛 Nome: ${c.displayName}\n📞 Tel: ${c.vcard?.match(/TEL.*:(.+)/)?.[1] || 'N/A'}\n\n`;
                }

                if (totalParts === 1) {
                    await sock.sendMessage(chat, { text: texto, mentions: allIds });
                } else {
                    for (let i = 0; i < totalParts; i++) {
                        const inicio = i * MAX_MENCOES;
                        const fim = Math.min(inicio + MAX_MENCOES, allIds.length);
                        const parteMembros = allIds.slice(inicio, fim);
                        await sock.sendMessage(chat, { text: texto, mentions: parteMembros });
                        if (i < totalParts - 1) await new Promise(r => setTimeout(r, 1500));
                    }
                }
            }

            // ============================================================
            // 🔥 ENQUETE
            // ============================================================
            else if (isPoll) {
                const poll = conteudo.pollCreationMessage || conteudo.pollCreationMessageV2 || conteudo.pollCreationMessageV3;

                texto = `📊 *Enquete:* ${poll.name}\n\n`;
                poll.options?.forEach((opt, i) => {
                    texto += `┃ ${i + 1}. ${opt.optionName}\n`;
                });

                if (totalParts === 1) {
                    await sock.sendMessage(chat, { text: texto, mentions: allIds });
                } else {
                    for (let i = 0; i < totalParts; i++) {
                        const inicio = i * MAX_MENCOES;
                        const fim = Math.min(inicio + MAX_MENCOES, allIds.length);
                        const parteMembros = allIds.slice(inicio, fim);
                        await sock.sendMessage(chat, { text: texto, mentions: parteMembros });
                        if (i < totalParts - 1) await new Promise(r => setTimeout(r, 1500));
                    }
                }
            }

            // ============================================================
            // 🔥 PACOTE DE FIGURINHAS
            // ============================================================
            else if (isStickerPack) {
                const pack = conteudo.stickerPackMessage;
                texto = `🎨 *Pacote de Figurinhas*\n\n📛 Nome: ${pack.name}\n👤 Autor: ${pack.publisher}\n📦 Total: ${pack.stickers?.length || 0} figurinhas`;

                if (totalParts === 1) {
                    await sock.sendMessage(chat, { text: texto, mentions: allIds });
                } else {
                    for (let i = 0; i < totalParts; i++) {
                        const inicio = i * MAX_MENCOES;
                        const fim = Math.min(inicio + MAX_MENCOES, allIds.length);
                        const parteMembros = allIds.slice(inicio, fim);
                        await sock.sendMessage(chat, { text: texto, mentions: parteMembros });
                        if (i < totalParts - 1) await new Promise(r => setTimeout(r, 1500));
                    }
                }
            }

            // ============================================================
            // 🔥 EVENTO
            // ============================================================
            else if (isEvent) {
                const ev = conteudo.eventMessage;
                texto = `📅 *Evento*\n\n📛 Nome: ${ev.name}\n📝 Descrição: ${ev.description || 'Sem descrição'}\n📍 Local: ${ev.location?.name || 'Sem local'}\n📅 Início: ${ev.startTime ? new Date(ev.startTime * 1000).toLocaleString('pt-BR') : 'N/A'}`;

                if (totalParts === 1) {
                    await sock.sendMessage(chat, { text: texto, mentions: allIds });
                } else {
                    for (let i = 0; i < totalParts; i++) {
                        const inicio = i * MAX_MENCOES;
                        const fim = Math.min(inicio + MAX_MENCOES, allIds.length);
                        const parteMembros = allIds.slice(inicio, fim);
                        await sock.sendMessage(chat, { text: texto, mentions: parteMembros });
                        if (i < totalParts - 1) await new Promise(r => setTimeout(r, 1500));
                    }
                }
            }

            // ============================================================
            // 🔥 TEXTO PURO (com ou sem link preview)
            // ============================================================
            else if (isText || isLinkPreview) {
                const textoParaCitar = texto || 'Mensagem sem texto';

                if (totalParts === 1) {
                    await sock.sendMessage(chat, {
                        text: textoParaCitar,
                        mentions: allIds
                    }, { quoted: msg });
                } else {
                    for (let i = 0; i < totalParts; i++) {
                        const inicio = i * MAX_MENCOES;
                        const fim = Math.min(inicio + MAX_MENCOES, allIds.length);
                        const parteMembros = allIds.slice(inicio, fim);

                        await sock.sendMessage(chat, {
                            text: textoParaCitar,
                            mentions: parteMembros
                        }, { quoted: msg });

                        if (i < totalParts - 1) {
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        }
                    }
                }
            }

            // ============================================================
            // 🔥 FALLBACK (não reconheceu)
            // ============================================================
            else {
                texto = texto || '📎 Mensagem não suportada';

                if (totalParts === 1) {
                    await sock.sendMessage(chat, { text: texto, mentions: allIds });
                } else {
                    for (let i = 0; i < totalParts; i++) {
                        const inicio = i * MAX_MENCOES;
                        const fim = Math.min(inicio + MAX_MENCOES, allIds.length);
                        const parteMembros = allIds.slice(inicio, fim);
                        await sock.sendMessage(chat, { text: texto, mentions: parteMembros });
                        if (i < totalParts - 1) await new Promise(r => setTimeout(r, 1500));
                    }
                }
            }

            await reagir(sock, chat, msg.key.id, '✅');
            return;
        }

        // ============================================================
        // 🔥 SE NÃO TIVER MENSAGEM RESPONDIDA (SÓ TEXTO)
        // ============================================================
        const textoDigitado = args.join(' ').trim();

        if (!textoDigitado) {
            await enviarResposta(chat, sock,
                `📌 *COMO USAR:*\n\n` +
                `▸ Responda uma mensagem e use ${CONFIG.prefix}citar\n` +
                `▸ Ou: ${CONFIG.prefix}citar <mensagem>\n\n` +
                `💡 *Suporta:*\n` +
                `📝 Texto, 🖼️ Imagem, 🎥 Vídeo, 🎵 Áudio, 🎨 Figurinha,\n` +
                `📄 Documento, 📍 Localização, 👤 Contato, 📊 Enquete,\n` +
                `🎁 Pacote de Figurinhas, 📅 Evento, 🔗 Link preview`,
                msg
            );
            await reagir(sock, chat, msg.key.id, '❌');
            return;
        }

        if (totalParts === 1) {
            await sock.sendMessage(chat, {
                text: textoDigitado,
                mentions: allIds
            }, { quoted: msg });
        } else {
            for (let i = 0; i < totalParts; i++) {
                const inicio = i * MAX_MENCOES;
                const fim = Math.min(inicio + MAX_MENCOES, allIds.length);
                const parteMembros = allIds.slice(inicio, fim);

                await sock.sendMessage(chat, {
                    text: textoDigitado,
                    mentions: parteMembros
                }, { quoted: msg });

                if (i < totalParts - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }
        }

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        console.error('❌ Erro no citar:', error);

        try {
            const texto = args.join(' ').trim() || 'Mensagem citada';
            const metadata = await sock.groupMetadata(chat);
            const allIds = metadata.participants.map(p => p.id);

            await sock.sendMessage(chat, {
                text: texto,
                mentions: allIds
            }, { quoted: msg });

            await reagir(sock, chat, msg.key.id, '✅');
        } catch (e) {
            await enviarResposta(chat, sock, `❌ Erro: ${error.message}`, msg);
            await reagir(sock, chat, msg.key.id, '❌');
        }
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    initModule,
    cmdMarcaTodos,
    cmdMarcarAdm,
    cmdCitar
};