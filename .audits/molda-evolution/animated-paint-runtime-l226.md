# Lote 226 — consumidor da pintura animada no runtime do Estúdio

Estado: implementado, revisado e verificado, 10/09/2026.
Design: `docs/plans/2026-09-10-molda-animated-paint-bridge.md`. Público/cloud continuam v1.
Segundo de três: o contrato saiu do Molda no lote 225; a oficina liga o destino no 227.

## Decisão de arquitetura: uma linha do tempo por MATERIAL

O aviso do mapeamento era que mexer no `offset` do material do cache animaria todas as
instâncias juntas. Medida a alternativa, ela é pior:

| Opção | Custo | Consequência |
| --- | --- | --- |
| Relógio por entidade | Uma cópia da FOLHA na GPU por boneco (1024² = 4 MiB cada) | 50 moedas = 200 MiB de textura |
| Relógio por material | Uma folha, um `offset` por quadro | Todas as cópias tocam juntas |

Escolhido o segundo, e a sincronia virou contrato declarado, não acaso: geometria e
material já vêm do cache compartilhado, e `Object3D.clone`/`SkeletonUtils.clone` não
duplicam material. Nada entra na contabilidade de posse do lote 118 porque nada novo é
criado: a textura pertence ao cache do modelo e morre com ele em `disposeCachedModels`.

Consequência declarada: uma pintura sem repetição toca uma vez por MODELO, não por boneco.
Um relógio por entidade é capacidade separada, para quando existir necessidade real.

## Implementação

- `collectModelFlipbooks(root)` roda uma vez no parse, junto do `_modelCache[k]`, e guarda
  o MATERIAL, não o mapa: uma textura que chegue depois continua sendo animada.
  Recusa em silêncio o que não entende — contrato diferente de 1, grade sem colunas ou
  linhas, fps não positivo, célula fora da folha ou sequência vazia.
- `stepModelFlipbooks(dt)` entra em `stepSystems`, ao lado de `stepEmitters`/`stepParticles`,
  que só roda em `jogando`: a pausa congela a pintura de graça, como congela as faíscas.
- `placeFlipbook` refaz a mesma conta do produtor (célula com origem no topo-esquerda) e
  escreve `repeat` e `offset`. Escrever `repeat` também torna o consumidor independente de
  a extensão ter sido aplicada pelo loader.
- Nenhum bloco novo e nenhum bloco alterado: a pintura que se mexe simplesmente se mexe,
  que é o que a criança pintou. Controlar por bloco é capacidade separada.

## Defeito encontrado pela prova, antes de existir na produção

A primeira versão marcava o passo corrente e só então colocava a célula. Como a textura
pode não existir ainda no primeiro quadro, o passo ficava registrado sem nada ter sido
colocado, e a comparação `step === book.step` do quadro seguinte travava a pintura para
sempre. Corrigido: `placeFlipbook` devolve se colocou, e o passo só é registrado quando
colocou. O teste que expôs isso é o mesmo que cobre o caso.

## Provas

- `moldaFlipbook.test.ts`, runtime e GLTFLoader reais: contrato inteiro em
  `material.userData`; sequência andando no tempo do jogo célula a célula contra o oráculo
  do Molda, com repetição e fora de ordem; volta ao primeiro passo no fim; pausa congela e
  continuar retoma de onde parou; duas cópias vivas compartilham um único material;
  contrato de versão futura não anima nada.
- O caso do contrato futuro usa o MESMO GLB com um caractere trocado dentro do chunk JSON,
  então o arquivo continua válido e o que muda é só o que o runtime pode entender.
- Focal 10/0 nos três testes Molda/Estúdio; integral **7.956/0**, 506 arquivos, 156,21 s;
  `templateGuard` 5/0; tipos e Biome passaram. Zero crases cruas adicionadas ao template.

## Limites

- O GLTFLoader não decodifica PNG fora do navegador, então o teste anexa a Texture que o
  loader teria produzido, como o teste de ossos chama `computeBoneTexture` na fronteira
  simulada. Aparência, GPU e o `map.offset` desenhado seguem sendo gate de browser.
- Não mede memória nem GPU em hardware. Não ativa formato público, não conecta a oficina
  (lote 227) e não cria bloco para a criança controlar a pintura.
