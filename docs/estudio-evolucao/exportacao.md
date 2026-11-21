# Exportação: levar o projeto para fora do Estúdio (lote 7, 21/11/2026)

Seção 14 da missão: "Uma criança deve conseguir exportar um projeto Pro e continuar seu
desenvolvimento em ferramentas externas, com arquivos, recursos, configurações e instruções
adequadas", com "builds reproduzíveis" e "exportação portátil".

## As três saídas do menu ⋯ ("Levar o jogo")

| Item | O que vem | Para quê |
| --- | --- | --- |
| Baixar o projeto | `.szproject.json` com o projeto inteiro (arquivos, blocos, materiais, extensões) | levar para outro Estúdio (importar na lista) |
| Baixar o código | ZIP de código-fonte legível, com `LEIA-ME.txt` | continuar no VSCode ou em outro editor |
| Baixar para publicar | ZIP pronto para um servidor (minificado, `Dockerfile`, `railway.json`) | pôr no ar por conta própria |

## O ZIP de código-fonte, por tipo de projeto

- **Clássico (blocos e Ponte, JavaScript):** `index.html`, `style.css`, `script.js`, `sz-ext/` (os
  motores das extensões), `sz-assets.js` (as imagens e sons embutidos) e `sz-audio.js`. O LEIA-ME
  explica como abrir com um servidor local (Live Server ou `npx serve`): abrir o `index.html` com
  dois cliques não carrega tudo.
- **Pro em JavaScript (Vite):** a árvore do projeto como está, os materiais em `public/` com o
  `studio-assets/manifest.json`, os créditos e o LEIA-ME com os comandos (`npm ci` ou `npm install`,
  `npm run dev`, `npm run build`), escolhidos pelo `package.json` e pela trava.
- **Python:** os arquivos `.py` da criança e os materiais; com o Pygame Zero, os arquivos para rodar
  no computador (o `pygame-ce` e o `pgzero` sem dependências), nunca o adaptador do navegador.

## Builds reproduzíveis

Desde o lote 7, a exportação do Pro leva um `package-lock.json` quando o projeto não tem o seu e
todas as dependências estão no grafo **aprovado**, com as versões exatas. O grafo aprovado é a trava
do build hospedado (`packages/studio-runtime/runtime/package-lock.json`, com os hashes de
integridade de todas as plataformas); o Studio guarda uma cópia gerada
(`src/export/approvedDependencyLock.generated.ts`, conferida no CI pelo `check:pro-kits`) e tira
dela o recorte que as dependências do projeto alcançam (`src/export/approvedDependencyLock.ts`).

- Os 14 modelos do Pro saem com a trava, e o LEIA-ME manda `npm ci`.
- Uma biblioteca que a criança instalou e o grafo não tem (ou outro gerenciador declarado) faz a
  exportação sair sem trava, com `npm install` e a orientação de versionar a trava gerada.
- Antes disto, só as dependências diretas tinham versão exata; as indiretas (as do Vite) mudavam
  com o tempo, e o mesmo ZIP instalava outra coisa meses depois.

## Conferido fora do Estúdio

`packages/studio/scripts/verify-exports.ts`: cada projeto é exportado pelo mesmo
`exportProjectSource` do "Baixar o código", aberto numa pasta limpa, instalado (`npm ci` com a
trava, `npm install` sem ela) e construído duas vezes, com a pasta `dist` apagada entre elas; a
impressão SHA-256 de caminhos e bytes tem de bater.

- **CI** (`.github/workflows/studio-export.yml`): os 14 modelos e um projeto com biblioteca fora do
  grafo, no Linux e no Windows, e um passo final que compara os builds das duas máquinas para os
  projetos com trava.
- **Windows local, 21/11/2026:** ver
  [`evidencias/exportacao-2026-11-21/`](evidencias/exportacao-2026-11-21/).

## O que fica de fora, de propósito

- O ZIP não leva histórico de conversa com o Zappy, credenciais da plataforma nem estado do editor.
- Git: avaliado em [`git-no-pro-avaliacao.md`](git-no-pro-avaliacao.md). O Pro não ganha Git agora;
  um `git init` na pasta exportada funciona como em qualquer projeto Vite.
- O jogo clássico 3D carrega o three.js pela rede (a exportação avisa); o Pro leva o three pelo npm.
