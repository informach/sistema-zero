# Regiões nos cenários 3D: especificação para combinar com a frente do Molda (21/11/2026)

Proposta aprovada pela dona em 21/11/2026 (item 4). A parte 2D (o tocador do Pinta desenhar só os
objetos perto da câmera) está feita em `719fade30`. Este documento é a parte 3D, que depende da
frente do Molda Cenários: o Estúdio **não grava nem aceita formato novo sozinho**. A regra do lado
do Estúdio é recusar sem perder um campo ou uma versão desconhecidos, então ele precisa aprender a
ler o formato novo **antes** de o Molda começar a gravá-lo.

Estado: implementado nos lotes 5 a 7b da conclusão do plano do Estúdio (22/11/2026). O que foi
feito está na seção "O que foi feito", no fim. (Em 21/11 o estado era "aguardando a frente do
Molda"; a sessão consultada naquele dia era de outra frente e confirmou que `packages/molda*` não
tinha mudanças sem commit.)

## O que a criança vê (aprovado)

- **Molda Cenários:** ferramenta "Regiões". Quem monta o cenário desenha retângulos no terreno e dá
  nome a eles ("Vila", "Floresta", "Caverna").
- **Estúdio:** carrega a região onde o personagem está e as vizinhas, e libera o resto. O que a
  criança mudou (moeda pega, porta aberta) continua assim quando ela volta.
- **Bloco novo** em "⚡ Quando acontecer": "Quando ⟨personagem⟩ entrar na região ⟨Vila⟩", com a lista
  de regiões vinda do cenário (como o "Quando entrar em área" do 2D).
- Cenário sem regiões funciona como hoje.

## Proposta de formato (para a frente do Molda confirmar ou ajustar)

No documento (`molda-cenarios-core/src/v2/documento.ts`, hoje `versao: 2` com `.strict()`):

```ts
regioes: z
  .array(
    z.object({
      id,                                  // o mesmo formato de id do documento
      nome: z.string().min(1).max(60),
      caixa: z.object({ x0: z.number(), z0: z.number(), x1: z.number(), z1: z.number() }),
      vizinhas: z.array(id).max(8),
    }).strict(),
  )
  .min(1)
  .max(64)
  .optional()
```

- **Opcional:** cenários de hoje continuam válidos sem mudar nada.
- **Leitor antigo:** com o `.strict()`, um leitor antigo recusa o campo novo. A ordem segura é:
  1. o Estúdio e o motor passam a aceitar `regioes`;
  2. a imagem do studio-runtime é qualificada de novo, como pede cada mudança no motor dos cenários;
  3. só então a oficina começa a gravar regiões.
- **Na cena compilada para o Estúdio (`CenaParaStudio`):** cada região leva a lista do que pertence
  a ela (lotes do "Juntar peças", instâncias, colisões e águas), decidida na compilação pela posição.
  O que atravessa a borda vai para todas as regiões que toca.

## O que o Estúdio faz quando o formato estiver combinado

1. Ler `regioes` no transporte e no saneamento do Estúdio (`core/scene3d`), com o teste de contrato
   (`moldaFullScenario.contract.test.ts`) ganhando um cenário com regiões.
2. No motor 3D: a cada quadro, a região do personagem pela caixa; carregar a dela e as vizinhas
   (geometria, texturas, colisões) e descartar as outras. O estado de jogo (o que a criança mudou)
   fica fora do que é descartado.
3. O bloco "Quando ⟨personagem⟩ entrar na região ⟨nome⟩", no catálogo do Jogo 3D, com a lista de
   regiões vinda da cena.
4. Medir GPU, memória e tempo por quadro indo e voltando entre regiões (homologação E), no molde do
   `engine-gpu-cycles.spec.ts`.

## O que foi feito (lotes 5 a 7b da conclusão, 22/11/2026)

- **A carga mora no motor dos cenários e no SDK do Estúdio, nunca nos motores.** O
  `carregarCenaNoThree` (`molda-cenarios-motor/src/compilar/runtime-three.ts`) ganhou a opção
  `carga: 'tudo' | 'regioes'`, com padrão `'tudo'` (o Arquipélago, o GLB único e a exportação
  portátil não mudam); o SDK do Estúdio (`studio/src/three/scene3d.ts`) pede `'regioes'`. As regras
  (0,5 m de tolerância, pré-carga até `max(40 m, câmera)`, descarte só 20 m além do raio da
  pré-carga e depois de 2 s lá) estão
  em `REGRAS_DA_CARGA` (`molda-cenarios-core/src/compilar/carga-das-regioes.ts`); o teto de 48
  malhas e 128 MiB por janela, em `LIMITES_DA_EXPORTACAO.janela`
  (`molda-cenarios-core/src/compilar/limites.ts`, contado por `janelas.ts`); as novas tentativas em
  1, 4 e 15 s, em `NOVAS_TENTATIVAS` (`runtime-three.ts`). O estado do jogo nunca descarrega.
- **A cena compilada traz a pertença de cada região** (`nos`, `colisoes`, `aguas`), e o leitor a
  confere com a mesma função do compilador (`molda-cenarios-core/src/compilar/schema-regioes.ts`).
- **O interruptor `CENARIOS_REGIOES` do Members** (desligado por padrão) mostra a ferramenta Regiões
  na oficina e deixa o servidor aceitar `regioes`: a ordem segura de cima, com os leitores antes do
  escritor.
- **O bloco "Quando … entrar na região"** nos TRÊS motores 3D do JavaScript (Jogo 3D, Mundo 3D e 3D
  Avançado), pelas regras comuns (`onEnterRegion`); a lista de regiões vem da cena trazida
  (`FieldSceneRegionPicker`, que guarda o nome).
- **Python:** o `cenario.py` do Raylib carrega por regiões com as mesmas regras, e os blocos de
  cenário do Raylib 3D só ligam com o recurso `molda-scene-regions-v1` da distribuição.
- **A medida da homologação E** é o jogo E (`e2e/engine-regions.spec.ts`, no `studio-engines.yml`).
  O mundo dele tem 384 m: 1 km passa dos tetos de hoje pela geometria do relevo
  ([`evidencias/jogo-e-regioes-2026-11-22/`](evidencias/jogo-e-regioes-2026-11-22/README.md)); os
  mundos de 2 km estão em [`../plans/2026-11-23-mundos-de-2km.md`](../plans/2026-11-23-mundos-de-2km.md).
