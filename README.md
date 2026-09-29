# BOT-JUFUFU

**JUFUFU BOT — UM BOT COMPLETO PARA WHATSAPP, COM DIVERSAS FUNCIONALIDADES**

<div align="center">
  <img src="IMG-20260928-WA0303.jpg" alt="JUFUFU BOT" width="900">
</div>

<br>

<p align="center">
  Bot de WhatsApp desenvolvido em Node.js, com diversos comandos de diversão, moderação, mídia, RPG e utilidades.
</p>

---

## 📖 Sobre o Jufufu

O **Jufufu** é um bot completo para WhatsApp feito em **Node.js**.

Cada pessoa que baixar o projeto roda **sua própria cópia**, conectando **sua própria conta do WhatsApp**. O bot **não é um servidor público** — é um projeto **open source** para você instalar, personalizar e usar como quiser.

---

## ✨ Funcionalidades

O Jufufu inclui, entre várias outras funções:

- 🎵 **Play** — busca e envia músicas
- 📹 **YouTube** — download e envio de vídeos
- 🖼️ **Imagem com IA** — geração de imagens por texto
- 📌 **Pinterest** — busca de imagens
- 🎨 **Figurinhas** — criação e conversão de stickers
- 🎬 **Sticker → GIF** — converte figurinha animada em GIF
- 🔊 **TTS** — texto em áudio (formato PTT)
- 🎙️ **Efeitos de áudio** — diversos efeitos em áudios
- 👋 **Boas-vindas** — mensagem personalizada na entrada e saída
- 🛡️ **Anti-link, anti-mídia e anti-palavrão**
- ⬛ **Lista negra** — por número ou @, com ban automático
- 📅 **Agendamentos** — abrir e fechar grupos automaticamente
- 🏆 **Rankings** — feio, bonito, gay, corno, etc.
- 🎭 **Interações** — tapa, abraço, beijo, etc.
- 💍 **Casamento** entre usuários
- 👁️ **Revelar** — revela mídias de visualização única
- 👑 **Menus** administrados por app externo
- 🎮 **RPG** — completo com empregos, mineração, favo de mel, cassino
- 💤 **AFK**, **perfil**, **porcentagens divertidas** e muito mais

---

## 📱 Instalação no Termux

### 1. 📥 Instale o Termux

Baixe o **Termux** pelo **F-Droid** (recomendado):

🔗 [Termux no F-Droid](https://f-droid.org/packages/com.termux/)

> ⚠️ **Não use** a versão antiga da Play Store — ela está desatualizada.

<div align="center">
  <img src="IMG-20260928-WA0294.jpg" alt="JUFUFU BOT" width="900">
</div>

### 2. 🔄 Atualize o Termux

Abra o Termux e execute:

```bash
pkg update && pkg upgrade -y
```

### 3. 📦 Instale os requisitos

Execute:

```bash
pkg install git nodejs ffmpeg -y
```

Isso instala:

- **git** — para clonar o projeto
- **nodejs** — para rodar o bot
- **ffmpeg** — para processar áudios, vídeos e figurinhas

### 4. 🧰 Conceda acesso ao armazenamento (opcional)

Execute:

```bash
termux-setup-storage
```

Aceite a permissão que aparecer na tela.

---

## 📥 Baixar o projeto

### 5. Clone o repositório

Execute:

```bash
git clone https://github.com/elnataalves12-lang/BOT-JUFUFU-zzz.git
```

### 6. Entre na pasta

Execute:

```bash
cd BOT-JUFUFU-zzz
```

### 7. Instale as dependências

Execute:

```bash
npm install
```

> 💡 Todas as dependências do Jufufu funcionam direto no Termux.

---

## ⚙️ Configuração

### 8. Abra o arquivo de configuração

Execute:

```bash
nano config.js
```

### 9. Edite os campos principais

| Campo | O que é |
|-------|---------|
| `prefix` | Prefixo dos comandos (ex: `°`) |
| `botNome` | Nome do bot |
| `versao` | Versão exibida no `°bot` |
| `canalLink` | Link do seu canal do WhatsApp |
| `donos` | Lista dos números autorizados como dono |
| `menuApp.token` | Token do app de menus (se for usar) |
| `jufufuAPI.apiKey` | Chave da API usada por alguns comandos (se for usar) |

> 💡 O `config.js` tem comentários explicando cada campo. Se não for usar algum comando específico, deixe a chave vazia.

Salve com **Ctrl+O** → **Enter** → **Ctrl+X**.

---

## ▶️ Iniciando o bot

### 10. Rode o bot

Execute:

```bash
npm start
```

### 11. Conecte seu WhatsApp

O terminal vai pedir:

```
👉 Digite seu número (ex: 5599999999999):
```

Digite seu número **com DDI e DDD** (só números, sem `+` ou espaços).

Vai aparecer um **código de pareamento**, tipo:

```
📱 CÓDIGO DE PAREAMENTO:
👉 ABCD-EFGH
```

**No celular:**

1. Abra o **WhatsApp**
2. Toque em **3 pontinhos** → **Dispositivos vinculados**
3. Toque em **Vincular um dispositivo**
4. Escolha **"Vincular com número de telefone"**
5. Cole o código

### 12. Verifique se está funcionando

Quando o bot conectar, vai aparecer no Termux:

```
✅ 𝙹𝚄𝙵𝚄𝙵𝚄-ᶻᶻᶻ_b̶o҈꓄ está ONLINE! 🚀
```

Agora manda `°menu` em qualquer grupo onde o bot está, e ele deve responder.

---

## 📂 Estrutura básica do projeto

```
BOT-JUFUFU-zzz/
├── index.js              → arquivo principal do bot
├── bot.js                → gerenciador de conexão com WhatsApp
├── config.js             → configurações do bot
├── package.json          → dependências do projeto
├── database.json         → banco de dados (criado automaticamente)
├── services/             → módulos dos comandos
│   ├── play.js
│   ├── youtube.js
│   ├── imageAI.js
│   ├── sticker.js
│   ├── stickerToGif.js
│   ├── welcome.js
│   ├── menus.js
│   ├── rpgSystem.js
│   ├── blacklist.js
│   ├── revelar.js
│   └── ... (diversos outros)
└── session/              → sessão do WhatsApp (criada ao parear)
```

---

## 🔁 Iniciar novamente depois

Para ligar o bot novamente, execute:

```bash
cd BOT-JUFUFU-zzz
npm start
```

A sessão fica salva na pasta `session/`, então **não precisa parear de novo** — desde que não tenha feito logout.

---

## 🔄 Atualizar o bot

Se você já tem o projeto e quer atualizar para a versão mais nova, execute:

```bash
cd BOT-JUFUFU-zzz
git pull
npm install
npm start
```

> ⚠️ Antes de atualizar, faça backup do seu `config.js` e `database.json`, caso tenham sido alterados.

---

## 🔒 Segurança

Nunca publique ou compartilhe:

- ❌ Tokens de API
- ❌ Chaves (`apiKey`)
- ❌ Senhas
- ❌ Sessões do WhatsApp (pasta `session/`)
- ❌ Códigos de conexão
- ❌ Credenciais pessoais

**Cada pessoa deve rodar sua própria cópia e conectar sua própria conta do WhatsApp.**

Coloque essas pastas e arquivos no seu `.gitignore`:

```
session/
database.json
config.js
```

---

## 📢 Canal oficial

Atualizações, avisos e suporte acontecem no canal oficial do Jufufu:

🔗 [Canal do Jufufu no WhatsApp](https://whatsapp.com/channel/0029VbDHw0fAO7RBFTJ3rn1e)

---

## 🔗 Links importantes

- 📦 **Repositório oficial:** [BOT-JUFUFU-zzz](https://github.com/elnataalves12-lang/BOT-JUFUFU-zzz.git)
- 📢 **Canal oficial:** [WhatsApp](https://whatsapp.com/channel/0029VbDHw0fAO7RBFTJ3rn1e)
- 🎛️ **App de menus:** [Quick Menu Bot](https://quick-menu-bot.lovable.app/inicio)
- 🌐 **Portal das APIs:** [JU API Web](https://ju-api-web-app-qgj9.bolt.host/)

---

## ⭐ Apoie o projeto

Se o Jufufu foi útil para você, considere deixar uma **⭐** no repositório do GitHub.

---

<div align="center">

### 🤖 JUFUFU BOT

**Feito para a comunidade.** ❤️

</div>