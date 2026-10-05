// ==================== COMANDO PDF ====================
// services/pdf.js
//
// Gera PDF a partir de texto ou imagem
// Uso:
//   °pdf <texto>              → PDF com o texto
//   (responder texto) °pdf    → PDF com o texto respondido
//   (responder imagem) °pdf   → PDF com a imagem
// ============================================================

const PDFDocument = require('pdfkit');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// ==================== NOME FIXO DO PDF ====================
// 🔥 MUDE AQUI SE QUISER OUTRO NOME
const NOME_PDF = 'Jufufu Bot';

// ==================== TEMP DIR ====================
const TEMP_DIR = path.join(os.tmpdir(), 'jufufu_pdf');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ==================== CORES ====================
const COR_PRIMARIA = '#FFC107';
const COR_TEXTO = '#333333';
const COR_MARCA_AGUA = '#FFC107';
const COR_RODAPE = '#888888';

// ==================== GERAR NOME DO ARQUIVO ====================
function gerarNomeArquivo() {
    const agora = new Date();
    const data = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
    const hora = `${String(agora.getHours()).padStart(2, '0')}-${String(agora.getMinutes()).padStart(2, '0')}-${String(agora.getSeconds()).padStart(2, '0')}`;

    const nomeLimpo = NOME_PDF
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 20) || 'Jufufu';

    return `${nomeLimpo}_${data}_${hora}.pdf`;
}

// ==================== DESENHAR MARCA D'ÁGUA ====================
function desenharMarcaDagua(doc) {
    const largura = doc.page.width;
    const altura = doc.page.height;

    doc.save();
    doc.opacity(0.08);
    doc.translate(largura / 2, altura / 2);
    doc.rotate(-45, { origin: [0, 0] });

    doc.fontSize(70)
       .font('Helvetica-Bold')
       .fillColor(COR_MARCA_AGUA);

    const larguraTexto = doc.widthOfString(NOME_PDF);

    doc.text(NOME_PDF, -larguraTexto / 2, -35, {
        align: 'center'
    });

    doc.restore();
}

// ==================== DESENHAR RODAPÉ ====================
function desenharRodape(doc, pagina, total) {
    const largura = doc.page.width;
    const alturaPagina = doc.page.height;

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(COR_RODAPE);

    const texto = `${NOME_PDF} • Página ${pagina} de ${total}`;

    doc.text(texto, 50, alturaPagina - 40, {
        align: 'center',
        width: largura - 100
    });
}

// ==================== DESENHAR CABEÇALHO ====================
function desenharCabecalho(doc) {
    const largura = doc.page.width;

    doc.rect(0, 0, largura, 80)
       .fill(COR_PRIMARIA);

    doc.fillColor('#000000')
       .fontSize(24)
       .font('Helvetica-Bold')
       .text(NOME_PDF, 50, 28, {
           align: 'center',
           width: largura - 100
       });

    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#555555')
       .text(dataFormatada, 50, 92, {
           align: 'right',
           width: largura - 100
       });
}

// ==================== GERAR PDF DE TEXTO ====================
function gerarPdfTexto(texto) {
    return new Promise((resolve, reject) => {
        try {
            const chunks = [];

            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                bufferPages: true,
                info: {
                    Title: 'Documento',
                    Author: NOME_PDF,
                    Subject: 'Documento gerado pelo bot',
                    Creator: NOME_PDF
                }
            });

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // CABEÇALHO
            desenharCabecalho(doc);

            // CORPO
            doc.moveDown(3);

            doc.fillColor(COR_TEXTO)
               .fontSize(12)
               .font('Helvetica')
               .text(texto, 50, 130, {
                   align: 'justify',
                   width: doc.page.width - 100,
                   lineGap: 5
               });

            // MARCA D'ÁGUA + RODAPÉ
            const range = doc.bufferedPageRange();
            const total = range.count;

            for (let i = range.start; i < range.start + range.count; i++) {
                doc.switchToPage(i);
                desenharMarcaDagua(doc);
                desenharRodape(doc, i - range.start + 1, total);
            }

            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}

// ==================== GERAR PDF DE IMAGEM ====================
async function gerarPdfImagem(imageBuffer) {
    return new Promise((resolve, reject) => {
        try {
            const chunks = [];

            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                bufferPages: true,
                info: {
                    Title: 'Imagem',
                    Author: NOME_PDF,
                    Creator: NOME_PDF
                }
            });

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // CABEÇALHO
            desenharCabecalho(doc);

            // IMAGEM
            const areaDisponivelY = 120;
            const areaDisponivelAltura = doc.page.height - areaDisponivelY - 60;
            const areaDisponivelLargura = doc.page.width - 100;

            try {
                doc.image(imageBuffer, 50, areaDisponivelY, {
                    fit: [areaDisponivelLargura, areaDisponivelAltura],
                    align: 'center',
                    valign: 'center'
                });
            } catch (imgErr) {
                doc.fontSize(14)
                   .fillColor('#CC0000')
                   .text('Erro ao carregar imagem', 50, areaDisponivelY + 100, {
                       align: 'center',
                       width: areaDisponivelLargura
                   });
            }

            // MARCA D'ÁGUA + RODAPÉ
            const range = doc.bufferedPageRange();
            const total = range.count;

            for (let i = range.start; i < range.start + range.count; i++) {
                doc.switchToPage(i);
                desenharMarcaDagua(doc);
                desenharRodape(doc, i - range.start + 1, total);
            }

            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}

// ==================== COMANDO PRINCIPAL ====================
async function cmdPdf(chat, sock, sender, msg, args, enviarResposta, reagir, downloadMediaMessage, P, CONFIG) {
    await reagir(sock, chat, msg.key.id, '📄');

    try {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        // 🔥 CASO 1: TEM MENSAGEM RESPONDIDA
        if (quoted) {
            const isImage = !!quoted.imageMessage;

            // 🔥 IMAGEM
            if (isImage) {
                const target = { message: quoted, key: msg.key };

                const imageBuffer = await downloadMediaMessage(
                    target, 'buffer', {},
                    { logger: P({ level: 'silent' }) }
                );

                if (!imageBuffer || imageBuffer.length < 100) {
                    throw new Error('Imagem inválida');
                }

                const pdfBuffer = await gerarPdfImagem(imageBuffer);
                const nomeArquivo = gerarNomeArquivo();

                await sock.sendMessage(chat, {
                    document: pdfBuffer,
                    mimetype: 'application/pdf',
                    fileName: nomeArquivo
                }, { quoted: msg });

                await reagir(sock, chat, msg.key.id, '✅');
                return;
            }

            // 🔥 TEXTO
            const textoRespondido =
                quoted.conversation ||
                quoted.extendedTextMessage?.text ||
                '';

            if (textoRespondido && textoRespondido.trim()) {
                const pdfBuffer = await gerarPdfTexto(textoRespondido.trim());
                const nomeArquivo = gerarNomeArquivo();

                await sock.sendMessage(chat, {
                    document: pdfBuffer,
                    mimetype: 'application/pdf',
                    fileName: nomeArquivo
                }, { quoted: msg });

                await reagir(sock, chat, msg.key.id, '✅');
                return;
            }

            await enviarResposta(chat, sock,
                `📌 *O que posso transformar em PDF:*\n\n` +
                `▸ Texto (digitado ou respondido)\n` +
                `▸ Imagem (respondida)\n\n` +
                `⚠️ Outros formatos não são suportados.`,
                msg
            );
            await reagir(sock, chat, msg.key.id, '⚠️');
            return;
        }

        // 🔥 CASO 2: TEXTO DIGITADO
        const textoDigitado = args.join(' ').trim();

        if (!textoDigitado) {
            await enviarResposta(chat, sock,
                `📌 *Como usar o PDF:*\n\n` +
                `▸ *Digite um texto:*\n` +
                `   ${CONFIG.prefix}pdf Olá mundo\n\n` +
                `▸ *Responda um texto:*\n` +
                `   ${CONFIG.prefix}pdf\n\n` +
                `▸ *Responda uma imagem:*\n` +
                `   ${CONFIG.prefix}pdf`,
                msg
            );
            await reagir(sock, chat, msg.key.id, '⚠️');
            return;
        }

        const pdfBuffer = await gerarPdfTexto(textoDigitado);
        const nomeArquivo = gerarNomeArquivo();

        await sock.sendMessage(chat, {
            document: pdfBuffer,
            mimetype: 'application/pdf',
            fileName: nomeArquivo
        }, { quoted: msg });

        await reagir(sock, chat, msg.key.id, '✅');

    } catch (error) {
        await enviarResposta(chat, sock, `❌ Erro ao gerar PDF: ${error.message}`, msg);
        await reagir(sock, chat, msg.key.id, '❌');
    }
}

// ==================== EXPORTAR ====================
module.exports = {
    cmdPdf,
    gerarPdfTexto,
    gerarPdfImagem,
    gerarNomeArquivo,
    NOME_PDF
};