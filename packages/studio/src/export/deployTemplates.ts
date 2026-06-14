/**
 * Arquivos de deploy (Dockerfile / railway.json / .dockerignore / README) que
 * acompanham o ZIP, prontos para o Railway. Tudo é string pura e testável.
 *
 * Servidor estático: `serve` (npm). Escuta na porta que o Railway injeta em
 * `$PORT` e faz fallback de SPA (`-s`). É o mesmo modelo do runtime do pro.
 * Copy em pt-BR, sem travessão e sem jargão de IA (regra "Voz da copy").
 */

const CLASSIC_DOCKERFILE = `# Site estatico gerado pelo Sistema Zero Studio.
# Os arquivos ja vem prontos e minificados em public/.
FROM node:22-alpine
WORKDIR /app
RUN npm install -g serve@14
COPY public ./public
ENV PORT=3000
EXPOSE 3000
# -s: qualquer rota desconhecida volta para o index.html. A porta vem do Railway.
CMD ["sh", "-c", "serve -s public -l tcp://0.0.0.0:\${PORT:-3000}"]
`

const PRO_DOCKERFILE = `# App Vite gerado pelo Sistema Zero Studio.
# Etapa 1: instala as dependencias e roda o build (gera a pasta dist/).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
# Sem lockfile: o npm install resolve as versoes ja fixadas no package.json.
RUN npm install
COPY . .
RUN npm run build

# Etapa 2: serve os arquivos estaticos de dist/ na porta do Railway ($PORT).
FROM node:22-alpine AS runtime
WORKDIR /app
RUN npm install -g serve@14
COPY --from=build /app/dist ./dist
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:\${PORT:-3000}"]
`

const CLASSIC_DOCKERIGNORE = `node_modules
.git
*.zip
`

const PRO_DOCKERIGNORE = `node_modules
dist
.git
*.zip
`

function railwayJson(): string {
  return `${JSON.stringify(
    {
      $schema: 'https://railway.com/railway.schema.json',
      build: { builder: 'DOCKERFILE', dockerfilePath: 'Dockerfile' },
      deploy: { restartPolicyType: 'ON_FAILURE', restartPolicyMaxRetries: 3 },
    },
    null,
    2,
  )}\n`
}

function classicReadme(name: string): string {
  return `# ${name}

Seu projeto esta pronto para publicar. Os arquivos do site ficam em \`public/\` e ja vem minificados.

## Publicar no Railway

1. Crie um projeto novo no Railway e escolha "Deploy from Dockerfile" (ou arraste esta pasta para o Railway).
2. O Railway le o \`Dockerfile\`, sobe a imagem e injeta a porta em \`$PORT\` sozinho.
3. Quando o deploy terminar, abra a URL gerada e o site estara no ar.

## Rodar no seu computador (opcional)

\`\`\`
npx serve -s public
\`\`\`

## Observacoes

- Se o projeto usa um jogo 2D ou 3D, as bibliotecas sao carregadas pela internet (esm.sh) quando a pagina abre. Quem acessa precisa estar online.
- Para usar o Caddy no lugar do "serve": \`caddy file-server --root public --listen :$PORT\`.
`
}

function proReadme(name: string): string {
  return `# ${name}

Projeto Vite pronto para publicar. O build, com a minificacao incluida, roda no Railway durante o deploy.

## Publicar no Railway

1. Crie um projeto novo no Railway e escolha "Deploy from Dockerfile" (ou arraste esta pasta para o Railway).
2. O Railway roda \`npm install\` e \`npm run build\`, e serve a pasta \`dist/\` na porta \`$PORT\`.
3. Quando o deploy terminar, abra a URL gerada.

## Rodar no seu computador (opcional)

\`\`\`
npm install
npm run build
npx serve -s dist
\`\`\`

## Observacoes

- Este pacote nao traz \`package-lock.json\`. As versoes ja estao fixadas no \`package.json\`. Para um build 100% reproduzivel, rode \`npm install\` uma vez e versione o lockfile gerado.
`
}

export function classicDeployTemplates(projectName: string): Record<string, string> {
  return {
    Dockerfile: CLASSIC_DOCKERFILE,
    'railway.json': railwayJson(),
    '.dockerignore': CLASSIC_DOCKERIGNORE,
    'README.md': classicReadme(projectName),
  }
}

export function proDeployTemplates(projectName: string): Record<string, string> {
  return {
    Dockerfile: PRO_DOCKERFILE,
    'railway.json': railwayJson(),
    '.dockerignore': PRO_DOCKERIGNORE,
    'README.md': proReadme(projectName),
  }
}
