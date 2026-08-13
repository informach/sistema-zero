# Verificação final — Reino Zero e Jogo 2D

**Claim:** os seis bugs registrados e as lacunas de fidelidade aprovadas para o Reino Zero foram corrigidos com identidade visual e mapas autorais.
**Review original:** 2026-08-12, America/Sao_Paulo
**Remediação verificada:** 2026-08-13, America/Sao_Paulo
**Verdict:** **PASS**

## Resultado

- BUG-001 a BUG-006 estão corrigidos e cobertos pelos gates correspondentes.
- As 32 fases continuam sendo plantas autorais; não foram copiados mapas, nomes, sprites ou áudio da Nintendo.
- A aproximação mecânica foi ampliada com comprimentos variados, power-ups móveis, vida a cada 100 moedas, três estados do herói, tijolos quebráveis, projéteis de fogo, barras de fogo nos castelos, chefes tardios reforçados e segunda jornada mais difícil.
- O exemplo agora usa um descritor canônico de fase e contratos de tile compartilhados pela IR, schema e runtime.

## Gates finais

| Command | Exit code | Output summary | Verdict |
|---|---:|---|---|
| `bun run check` em `packages/studio` | 0 | 1.196 arquivos, nenhuma correção aplicada | PASS |
| `bunx biome check src/official-extensions/game-2d src/ir/schema.ts docs/game-2d-audit-2026-07-20.md e2e/reino-zero-classic.spec.ts` | 0 | 150 arquivos, nenhuma correção aplicada | PASS |
| `bun run typecheck` em `packages/studio` | 0 | TypeScript sem erros | PASS |
| `bun test src/official-extensions/game-2d` | 0 | 2.603 pass, 0 fail, 92 arquivos | PASS |
| `bun test src` | 0 | 7.583 pass, 0 fail, 482 arquivos | PASS |
| `bun test src/official-extensions/game-2d/__tests__/reinoZeroPlaythrough.test.ts` | 0 | 28 pass, 0 fail; regressão das 18 fases sem cano incluída | PASS |
| `bunx playwright test e2e/reino-zero-classic.spec.ts --project=chromium` com `E2E_PORT=55313` e `PW_REUSE_SERVER=0` | 0 | 2 pass em build e servidor limpos | PASS |

## Reproduções encerradas

| Flow | Observable result after the fix | Verdict |
|---|---|---|
| Atalho em fase sem cano | As 18 fases sem cano mantêm o mesmo HUD após o antigo gesto de fallback | PASS |
| Física de 2-2 e 7-2 | `ArrowUp` move o herói para cima nas duas fases aquáticas declaradas | PASS |
| Física de 3-2 | `ArrowUp` preserva a física de plataforma e a gravidade positiva | PASS |
| Casco parado por 60 quadros | `y` constante e `vy = 0` | PASS |
| Contrato `contact`/`inside` | Fonte canônica compartilhada; typecheck completo verde | PASS |
| Fonte manual desconhecida | Permanece `memberCall`; não vira dropdown | PASS |
| Tooltip do bloco de tela | Contrato textual global verde | PASS |
| Travessia das 32 fases | Playthrough determinístico atravessa os maiores poços e alcança o fim | PASS |
| Fidelidade mecânica aprovada | Power-ups, 100 moedas, estados, tijolos, fogo, castelos e segunda jornada exercitados em runtime | PASS |

## Cobertura adicionada

`reinoZeroPlaythrough.test.ts` passou a provar comportamento, não apenas presença na IR:

- vínculo do descritor com água em 2-2, 7-2 e 3-2;
- ausência de warp nas 18 fases sem cano durante uma passagem pelas 32 fases;
- casco estacionário por 60 quadros;
- movimento de broto e estrela;
- vida na centésima moeda;
- estados pequeno, grande e fogo;
- bola de fogo atravessando o mundo e derrotando inimigo;
- barra de fogo, dano e reforço dos chefes tardios;
- composição e tempo da segunda jornada;
- quebra de tijolo pela forma grande.

As auditorias geométricas também travam a largura autoral de cada uma das 32 grades e o catálogo gerado foi atualizado.

## Browser evidence

- **Servidor:** instância nova de `bun scripts/serve-e2e.ts` em `http://127.0.0.1:55313`.
- **Fluxo 1:** galeria informa a tecla de seleção de jogadores — PASS.
- **Fluxo 2:** preview touch em 370 × 844 mantém os nove controles no viewport e executa `select` — PASS.
- **Avisos não bloqueantes:** o build ainda informa chunks acima de 500 kB e tempo significativo em plugins; não houve erro de build, runtime ou teste.

## Issues filed

**Total:** 6 registrados; **6 corrigidos; 0 abertos**.

- High: BUG-001, BUG-002 e BUG-003 — Fixed.
- Medium: BUG-004 e BUG-005 — Fixed.
- Low: BUG-006 — Fixed.

Os detalhes e a evidência individual permanecem em `qa/issues/`.
