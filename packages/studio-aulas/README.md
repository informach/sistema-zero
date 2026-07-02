# @sistemazero/studio-aulas

Pipeline para produzir as aulas do curso infantil com ajuda de IA: transforma um
**roteiro** em **vídeo**, etapa por etapa, sem editar no Premiere e sem gravar a
tela na mão. Pacote de FERRAMENTA, isolado: **não altera nenhum outro package**
(só importa `@sistemazero/studio` no harness de gravação).

## As etapas

| # | Etapa | Como | Precisa de chave? |
|---|-------|------|-------------------|
| 1 | Roteiro | skill `aula-roteiro` → `aulas/<slug>/roteiro.yaml` | não |
| 2 | Voz | `aula:voz` — ElevenLabs, voz clonada, 1 mp3 por cena | ELEVENLABS |
| 3 | Avatar | `aula:avatar` — HeyGen, lip-sync sobre chroma | HEYGEN |
| 4 | Tela | `aula:tela` — Playwright dirige o Estúdio, grava o passo a passo | não |
| 5 | Balões | montados no Remotion a partir da timeline da etapa 4 | não |
| 6 | Teoria | biblioteca de ilustrações animadas (Remotion) | não |
| 7 | Montagem | `aula:render` — junta tudo num mp4 (sem legenda) | não |

Sem legenda no vídeo de propósito: a legenda é gerada depois no Vimeo.

## Setup (uma vez)

```bash
cd packages/studio-aulas
cp .env.example .env      # preencha quando for usar voz/avatar
```

- **Voz**: clone sua voz no ElevenLabs (Instant Voice Clone) e ponha
  `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` no `.env`.
- **Avatar**: pegue `HEYGEN_API_KEY` + `HEYGEN_AVATAR_ID` no HeyGen.
- **Cenários**: coloque as imagens de fundo em `cenarios/` (`cenario-a.png` para
  abertura/fecho, `cenario-b.png` para o meio). Sem elas, a montagem usa um
  gradiente de cortesia.

## Fluxo por aula

```bash
# 1. Roteiro: invoque a skill /aula-roteiro (ou edite aulas/<slug>/roteiro.yaml)
bun run src/cli.ts validar <slug>

# 2 e 3 (quando houver chaves)
bun run src/cli.ts voz <slug>
bun run src/cli.ts avatar <slug>

# 4. Grava a tela do Estúdio (não precisa de chave)
bun run src/cli.ts tela <slug>

# 7. Monta o vídeo final
bun run src/cli.ts render <slug>     # → aulas/<slug>/out/aula.mp4

# atalho: tela → plano → render
bun run src/cli.ts all <slug>
```

Aula-cobaia pronta: `aulas/dia-1-a-nave-ganha-vida/`.

## Ver as peças isoladas

```bash
bun run harness      # abre o Estúdio no harness de gravação (127.0.0.1:5273)
bun run remotion     # abre o Remotion Studio (preview da montagem)
```

## Estado / o que falta calibrar

- Etapas 1, 5, 6, 7 e o esqueleto: prontos.
- Etapa 4 (tela): **rodando de ponta a ponta pelo CLI** — `aula:tela dia-1…` gera
  `out/tela/tela.webm` (VP8 1280×720) + `timeline.json`. **Arrasto REAL**: o bloco
  desliza da paleta até a conexão do frame acompanhando o cursor e dá o "snap" no
  fim (encaixe determinístico, sem drag físico frágil). **Zoom**: aproxima ao
  configurar campos e a ação `zoom` (perto/longe/ajustar) enquadra quando precisa.
  A automação **centraliza o workspace no bloco** (senão o frame nasce fora do
  quadro 1280). ⚠️ **O recorder roda sob NODE** (`node --import tsx`), não Bun: o
  Playwright não conecta o pipe de debug do browser sob Bun. O browser é **headful**
  (o headless-shell trava no launch no Windows) — você vê a janela montando a aula.
  Refino natural: preencher soquetes de valor numéricos (x/y) e afinar tempos.
- Etapas 2 e 3: clientes prontos; ativam com as chaves no `.env`.
- Chroma do avatar: hoje o HeyGen entrega fundo verde e o cantinho redondo
  mascara. Acabamento ideal = exportar **transparente** no HeyGen (webm alpha),
  aí o avatar compõe direto sobre o cenário.
