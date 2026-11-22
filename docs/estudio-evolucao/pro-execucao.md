# Como o Pro escolhe onde o jogo roda (20/11/2026)

> Corrigido em 22/11/2026 (lote 4 da conclusão): a tabela dizia que o Estúdio livre do Kids e da
> comunidade usava a execução leve. Ele não entrega o compilador do servidor ao editor Pro, então
> o Pro em JavaScript dele roda no WebContainer (a execução completa). A leve e a hospedada são das
> aulas, do Admin, da oficina ao vivo e do desafio do Arquipélago.

Etapa 3 do plano (Pro em escala), critério "a escolha de execução (leve, completa, hospedada) é
pela capacidade real e está documentada". Vale para o Pro em JavaScript; o Python tem o caminho
próprio do worker protegido (`runtime/python/`) e não passa por aqui.

## As três execuções

| Execução | Quem usa | O que faz | Custo |
| --- | --- | --- | --- |
| **Leve** | Todo host que entrega o compilador do servidor (aulas, Admin, oficina ao vivo, desafio do Arquipélago), quando o projeto cabe nela | Monta o projeto no próprio navegador: tira os tipos com o Sucrase e roda os módulos como ES modules nativos, ligados por um mapa de importação (`modes/pro/lightProBuild.ts`) | Sem ida ao servidor; o montador (parser e Sucrase) baixa só no primeiro Rodar |
| **Hospedada** | Os mesmos hosts, quando o projeto não cabe na leve | O servidor roda o Vite de verdade no contêiner do `studio-runtime` e devolve o documento ou o artefato | Ida e volta ao servidor e o contêiner |
| **Completa** | Host que NÃO entrega o compilador do servidor: o Estúdio livre do Kids e da comunidade (`studio-pro-client.tsx` monta o `StudioProEditor` sem `proRuntime`) e o playground de desenvolvimento | WebContainer no navegador: `npm install`, `npm run dev`, terminal e HMR | Exige COOP/COEP na página; instalar as dependências leva o tempo da rede |

A escolha mora em dois lugares, e cada um decide pelo que é capaz:

1. **O host** decide entre "com servidor" e "completa", porque só ele sabe se a página tem o
   isolamento que o WebContainer exige e se a família tem o compilador hospedado. Ele passa ou
   não o `proRuntime` (`studio-pro-editor.tsx`, `studio-block.tsx`, `live-workspace.tsx`,
   `arquipelago-challenge-dialog.tsx`, `admin/.../studio-embed.tsx`).
2. **O projeto** decide entre "leve" e "hospedada" (`withLightProBuild` em
   `modes/pro/lightProRuntime.ts`, que embrulha o compilador do host). A pergunta é uma só: o
   navegador consegue montar este projeto IGUAL ao Vite? Se a resposta não for um sim certo, o
   projeto vai ao servidor, como antes.

## O que cabe na execução leve

Cabe:
- o `index.html` com scripts de módulo e folhas de estilo locais;
- módulos `.ts`, `.mts`, `.js` e `.mjs` com importação relativa ou a partir da raiz, com a
  resolução do Vite (extensões na ordem dele, `index`, `.js` que aponta para o `.ts`);
- CSS importado só pelo efeito (`import './tema.css'`), JSON com o padrão e os nomes;
- importação dinâmica com caminho escrito, ciclos e `await` no topo.

Vai ao servidor:
- qualquer biblioteca (no `package.json` ou numa importação);
- `vite.config` diferente do modelo;
- materiais (imagens, sons, modelos);
- JSX ou TSX, `import.meta`, decoradores, importação dinâmica com caminho calculado e consultas
  do Vite (`?raw`, `?url`);
- CSS Modules, CSS importado com nome, `url()` ou `@import` no CSS (também nos `<style>` e
  atributos `style` do HTML);
- script de módulo escrito dentro do HTML, script comum com arquivo local, `<base>`, mapa de
  importação próprio e qualquer outra referência local no HTML (ícone, imagem, página).

Os modelos "JavaScript" e "TypeScript" do Pro cabem; os de Three.js e React vão ao servidor.

As cotas do compilador do servidor (80 arquivos, 256 mil caracteres por arquivo, 1,5 milhão no
total, o tamanho do pedido) valem na execução leve também: o projeto que passaria delas vai ao
servidor, que dá a mensagem certa. Com o host declarando as cotas (`proRuntime.limits`), o editor
já recusa a mudança que passaria delas (`projectStore`); sem declarar, o montador usa as padrão
(`STUDIO_PRO_BUILD_LIMITS`). Nada roda no navegador que o servidor recusaria pelo tamanho.

## Por que módulos nativos, e não o CommonJS do Sucrase

O modo `imports` do Sucrase troca as variáveis exportadas por propriedades de `exports`. Num
`export let pontos = 0` com `function ganhar() { pontos++ }`, a função passava a mexer em
`exports.pontos` e a leitura local (`return pontos`) ficava parada no 0. E `export { x as y }`
virava uma cópia. Num jogo, é o placar errado. Por isso o Sucrase só tira os tipos (com o mesmo
descarte de importação usada só como tipo do esbuild do Vite), e os módulos continuam ES modules:
cada um vira um blob criado dentro do quadro, e o mapa de importação, inserido no topo da página,
liga `sz-light:N` a cada blob. A entrada fica num `<script type="module">` estático no lugar do
original, então ela roda depois de o HTML ser lido, um erro chega como o erro de sempre da janela
e o `DOMContentLoaded` espera o módulo, como num documento montado pelo Vite.

## Segurança

O documento da execução leve leva a MESMA política do documento hospedado (`LIGHT_PRO_CSP`, igual
à do `studio-runtime/runtime/inline-preview.mjs`: só scripts em linha e `blob:`, nada de rede) e
roda no mesmo quadro isolado da `RemoteProPreview` (`sandbox="allow-scripts allow-pointer-lock"`,
origem opaca), com a mesma ponte do console. O código do projeto nunca roda na página do Estúdio:
lá ele só é lido e reescrito como texto. Nenhum `</script>` do código escapa do documento (os
módulos vão como JSON com `<` escapado).

## Provas

- `src/modes/pro/lightProBuild.test.ts`: 28 casos (os modelos, os tipos, a resolução, ciclos,
  `await`, a ordem do CSS, o JSON, a importação dinâmica, o fechamento de script e os 20 motivos
  de ir ao servidor, mais as cotas do compilador).
- `e2e/pro-light-runtime.spec.ts`, no Chromium, no Firefox e no WebKit: o jogo escreve na tela o
  que só sai certo com ES modules de verdade (o placar vivo lido de dentro e de fora do módulo, o
  ciclo, o `await`, o JSON, o `.js` que aponta para o `.ts` e o CSS na ordem do Vite) sem chamar
  o compilador do servidor; o projeto com biblioteca chama.
- O que NÃO foi conferido: o jogo do mesmo projeto rodando lado a lado pelo servidor de staging
  (o compilador hospedado só existe com a sessão logada), e projetos reais de alunos.
