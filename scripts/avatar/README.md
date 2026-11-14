# Avatar: trazer o pack da arte para a plataforma

Os scripts desta pasta levam a biblioteca do avatar (o pack Cute Characters e as peças nossas) do
repositório da arte (`informach/artes-3d`, pasta `biblioteca_aventura/avatar`, branch `main`) para
o catálogo da plataforma (`packages/core/src/avatar/catalog.generated.ts`) e para os buckets
PRIVADOS do R2. Rodam sob pedido, de tempos em tempos (não há rotina automática).

## O que a conferência acusa

`bun run avatar:conferir` só lê; não muda nada. Compara a arte com o catálogo e lista:

- **Novas:** peças da arte que a plataforma ainda não tem.
- **Mudaram:** peças que a arte alterou depois da última migração, em qualquer uma destas coisas:
  - o modelo 3D (o blob do GLB no git da arte);
  - a miniatura;
  - os DADOS da peça no `catalogo.json` da arte: nome, gênero, grupo, conjunto, expressão, cor de
    amostra, triângulos (a impressão `origin.meta`, calculada por `impressaoDaPeca`).
- **Saíram:** peças que sumiram da arte.
- **O próprio avatar (o esqueleto)**, dizendo o que mudou:
  - o arquivo do esqueleto (os ossos e as animações do pack, usadas na cabine de fotos e no jogo);
  - os dados do esqueleto (`esqueleto/catalogo.json`: ossos, encaixes, medidas do corpo e os campos
    de cada animação, como passada e apoios dos pés);
  - qualquer outro arquivo da pasta `esqueleto/` (a árvore no git), inclusive as animações em
    arquivo próprio (`esqueleto/glb/animacoes/<id>.glb`);
  - as animações do jogo que faltam no catálogo.
- **As regras de combinação** (`regras.json`: grupos, sorteio, o que não combina com o quê).

O corpo, o rosto e as orelhas são peças (pastas `corpos/`, `rostos/`, `orelhas/`) e entram na
conferência das peças; a textura compartilhada vem dentro dos GLBs das peças. `LEIA.md` e
`pagina/` são da arte (a página de conferência dela) e não vão para a plataforma.

Sai com código 1 quando há o que migrar e diz "Tudo migrado." quando não há.

⚠️ **Pendente:** a migração ainda não lê animação em arquivo próprio (`pacote: false` com `arquivo`
na lista `animacoes` do esqueleto, o formato combinado com a arte para as animações novas do jogo).
A conferência já acusa quando elas chegam; ensine o `migrar.ts` a juntá-las ao GLB do jogo nesse dia.

## Roteiro (o que fazer quando pedirem para conferir o pack)

1. **Conferir.** Na raiz do monorepo: `bun run avatar:conferir`. Ele busca a arte do remoto antes
   (`git fetch` só das referências; a pasta de trabalho de lá nunca é tocada). O repositório da arte
   precisa estar clonado em `../artes-3d` (ou defina `ARTES_3D_DIR`).
2. **Migrar.** Havendo o que migrar: `bun run avatar:migrar --tudo --destino r2`.
   - Prepara cada peça nova ou mudada, envia GLB e miniatura aos DOIS buckets privados
     (`testes-privado` e `comunidade-sistema-zero-privado`; nunca a um bucket público) e reescreve
     o catálogo. Arquivo com o mesmo conteúdo tem o mesmo nome e não é reenviado.
   - Usa as credenciais do `packages/admin/.env` (wrangler). Falha passageira da API do Cloudflare
     tenta de novo até três vezes (`balde.ts`).
   - **O que é editorial se preserva** numa peça que já existia: público (menino/menina/todos),
     faixa (grátis, moedas…), preço e a marca de revisão. O resto vem da arte.
   - **Peça nova** entra com o preço PROPOSTO pela faixa (`proposta.ts`) e a marca `review`.
   - **Peça que saiu** da arte fica no catálogo como `retired` (quem tem continua tendo).
   - Para trazer só o esqueleto (ossos, encaixes, animações do jogo): `--so-esqueleto`.
   - Ensaio sem enviar ao R2: `--destino pasta:<caminho>`.
3. **Conferir de novo:** `bun run avatar:conferir` tem de dizer "Tudo migrado."
4. **Revisar com a dona** os preços das peças novas e qualquer nome que a arte trocou (o diff do
   `catalog.generated.ts` mostra). Ajuste de preço é editorial: muda no catálogo e a próxima
   migração preserva.
5. **Testes** (um de cada vez):
   - `cd packages/core && bun test src/avatar` (regras, sorteio, contrato do personagem);
   - `cd packages/members && bun test tests/db/avatar-swap.test.ts` (o banco de 200 fotos da troca
     tem de continuar batendo com o sorteio grátis de menino; se uma peça GRÁTIS nova mudar o
     sorteio, ou se tira a peça do sorteio em `FORA_DO_SORTEIO_DA_PLATAFORMA`, no
     `catalogo.ts`, ou se gera o banco de novo);
   - `cd packages/member-shell && bun test tests/avatar-pack.test.ts tests/avatar-editor-hook.test.ts tests/cosmetics-skin.test.tsx tests/kids-cosmetics-layout.test.tsx tests/avatar-seasonal-choices.test.tsx`
     (as abas do configurador: todo grupo novo do pack precisa cair numa aba).
6. **Enviar:** commit escopado (`catalog.generated.ts` e o que mais mudou) e envio à `staging`;
   produção vai pelo PR `staging` → `main`.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `conferir.ts` | a conferência (só leitura) |
| `migrar.ts` | a migração (envia e grava o catálogo) |
| `arte.ts` | lê a arte pelo git (`git cat-file` no `origin/main`), nunca a pasta de trabalho |
| `catalogo.ts` | lê e grava o catálogo, `comparar`, `impressaoDaPeca`, encaixes e as listas do sorteio |
| `glb.ts` | prepara os GLBs (peças, esqueleto, animações do jogo) e mede os clipes |
| `balde.ts` | envia aos buckets (wrangler) ou a uma pasta de ensaio |
| `proposta.ts` | o preço e o público propostos para uma peça nova |
