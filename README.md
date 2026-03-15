# VideoGenerator

Aplicação desktop para geração de vídeos e imagens com IA, utilizando o modelo **Google VEO 3** com o conceito **Bring Your Own Key (BYOK)** — suas chaves de API ficam armazenadas localmente, criptografadas, nunca saem do seu computador.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Desktop | Electron 41 |
| Frontend | Ionic 8 + Angular 20 + Signals |
| Backend | .NET 9 Web API |
| Banco de dados | SQLite (via Entity Framework Core) |
| IA | Google VEO 3 (`generativelanguage.googleapis.com`) |

## Funcionalidades

- **Text to Video** — gera vídeo a partir de um prompt de texto
- **Image to Video** — anima uma imagem de entrada
- **First + Last Frame** — gera a transição entre o primeiro e o último frame
- **BYOK** — gerencie suas próprias Google API Keys com criptografia AES-256
- **Histórico** — todas as gerações ficam salvas localmente com status em tempo real

## Pré-requisitos

- [Node.js](https://nodejs.org) 18+
- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- Google API Key com acesso ao **VEO 3** ([Google AI Studio](https://aistudio.google.com))

## Instalação

### 1. Backend

```bash
cd backend
dotnet restore
dotnet run
```

A API sobe em `http://localhost:5000`. O banco SQLite (`videogenerator.db`) é criado automaticamente na primeira execução.

### 2. Frontend

```bash
cd frontend
npm install
```

## Executando

### Modo browser (desenvolvimento rápido)

Terminal 1 — backend:
```bash
cd backend && dotnet run
```

Terminal 2 — frontend:
```bash
cd frontend && npm start
```

Acesse `http://localhost:4200` no navegador.

### Modo desktop com Electron

```bash
# Terminal 1
cd backend && dotnet run

# Terminal 2 — inicia Angular + Electron juntos
cd frontend && npm run electron:dev
```

### Build do instalador Windows

```bash
cd backend
dotnet publish -c Release -o publish

cd ../frontend
npm run electron:build
```

O instalador `.exe` será gerado em `frontend/dist-electron/`.

## Configuração

### Chave de API (BYOK)

1. Acesse [aistudio.google.com](https://aistudio.google.com)
2. Gere uma **API Key** com acesso ao VEO 3
3. Na aba **Configurações** do app, cole a chave

> As chaves são criptografadas com **AES-256** antes de serem salvas no SQLite. O segredo de criptografia pode ser configurado em `backend/appsettings.json`:
> ```json
> { "Encryption": { "Secret": "SEU_SEGREDO_AQUI" } }
> ```
> Em produção, use variável de ambiente para não expor o segredo no repositório.

## Estrutura do Projeto

```
VideoGenerator/
├── backend/                        # .NET 9 Web API
│   ├── Controllers/
│   │   ├── ApiKeysController.cs   # CRUD de API Keys (BYOK)
│   │   └── GenerationsController.cs # Geração + polling de status
│   ├── Data/
│   │   └── AppDbContext.cs        # EF Core + SQLite
│   ├── Models/
│   │   ├── ApiKey.cs
│   │   └── Generation.cs
│   ├── Services/
│   │   ├── EncryptionService.cs   # AES-256
│   │   └── Veo3Service.cs         # Integração VEO 3
│   └── Program.cs
└── frontend/                       # Ionic + Angular + Electron
    ├── electron/
    │   ├── main.js                # Processo principal Electron
    │   └── preload.js             # Bridge segura Electron ↔ Angular
    └── src/app/
        ├── pages/
        │   ├── generate/          # Tela de geração (3 modos)
        │   ├── history/           # Histórico de gerações
        │   └── settings/          # Gerenciar API Keys
        └── services/
            ├── api.ts             # HttpClient → backend
            └── generation.ts     # Polling de status
```

## API REST (Backend)

### API Keys

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/apikeys` | Lista chaves (valor mascarado) |
| `POST` | `/api/apikeys` | Adiciona nova chave |
| `PUT` | `/api/apikeys/{id}` | Atualiza label / ativa / desativa |
| `DELETE` | `/api/apikeys/{id}` | Remove chave |

### Gerações

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/generations` | Lista histórico (paginado, filtrável por `type`) |
| `GET` | `/api/generations/{id}` | Detalhe de uma geração |
| `POST` | `/api/generations/video` | Inicia geração (text, image ou first+last frame) |
| `POST` | `/api/generations/{id}/check-status` | Consulta status da operação no VEO 3 |
| `DELETE` | `/api/generations/{id}` | Remove do histórico |

### Exemplo — iniciar geração text-to-video

```bash
curl -X POST http://localhost:5000/api/generations/video \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A fox running through a snowy forest at golden hour, cinematic",
    "mode": "text-to-video",
    "durationSeconds": 8,
    "aspectRatio": "16:9",
    "generateAudio": true
  }'
```

Resposta:
```json
{ "id": 1, "status": "processing", "operationName": "operations/abc123" }
```

Faça polling em `POST /api/generations/1/check-status` até `status` ser `completed` ou `failed`.

## Modos de Geração

### `text-to-video`
Campos obrigatórios: `prompt`

### `image-to-video`
Campos obrigatórios: `prompt`, `imageBase64`, `imageMimeType`

### `first-last-frame`
Campos obrigatórios: `prompt`, `firstFrameBase64`, `firstFrameMimeType`, `lastFrameBase64`, `lastFrameMimeType`

> **Nota:** `negativePrompt` e `enhancePrompt` são aceitos apenas no modo `text-to-video`.

## Observações

- O VEO 3 é um modelo de geração assíncrona — o app faz **polling a cada 5 segundos** até a operação concluir
- Tempo médio de geração: **2 a 5 minutos** por vídeo
- O VEO 3 pode estar em **acesso restrito** (waitlist) — verifique se sua API Key tem permissão
- Os vídeos gerados ficam nos servidores do Google; o campo `outputPath` guarda a URI retornada pela API
