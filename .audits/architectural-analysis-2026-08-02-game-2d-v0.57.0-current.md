# Full review arquitetural — Jogo 2D (`game-2d`) v0.57.0

**Data:** 2026-08-02  
**Estado analisado:** worktree corrente, com mudanças staged/uncommitted sobre `8c97ae05`  
**Veredito:** **FAIL — não promover a v0.57.0 enquanto AA-01 e AA-02 estiverem abertos**

## Escopo e inventário

- 119 arquivos TypeScript no diretório da extensão, 49.592 linhas.
- 59 arquivos de produção, 34.133 linhas; todos alcançáveis a partir de `game-2d/index.ts`.
- 43 arquivos de suporte/teste, 12.606 linhas; 17 fontes geradas, 2.853 linhas.
- 216 definições de bloco, todas com `type` único; 215 chaves na API pública.
- 31 exemplos, 24 subcategorias de toolbox.
- Runtime injetado: 309.419 caracteres, 110.690 bytes em gzip.
- Documentação do manifest: 32.403 caracteres.
- Também foram auditados os pontos transversais do pipeline: schema/IR, Blockly→IR,
  IR→Blockly, gerador, parser, allowlist/sanitização, níveis e galeria E2E.

## Resumo executivo

O desenho geral é sólido: catálogo, contrato tipado, runtime, gerador, parser e
round-trip possuem cobertura incomumente boa; não encontrei módulo de produção
órfão, ciclo de importação, colisão de nomes entre fragments, `any`, `@ts-ignore`,
rede ativa, `eval` ou `new Function` no bootstrap. As permissões declaradas
(`canvas`, `keyboard`, `mouse`, `audio`) correspondem ao que o runtime usa.

Porém, a versão corrente tem dois problemas de compatibilidade com projetos de
crianças. O primeiro pode descartar o workspace inteiro ao reabrir um projeto. O
segundo muda silenciosamente a física de blocos já publicados. Há ainda um
caminho de colisão capaz de consumir cerca de 100 ms em um único quadro e uma
progressão que libera 179 blocos 2D de uma vez no degrau chamado
`iniciante-3d`. Um gate de catálogo que falhou durante a auditoria foi corrigido
em paralelo no worktree e passou na verificação final.

| ID | Prioridade | Achado | Confiança |
|---|---:|---|---|
| AA-01 | P0 / Crítico | Bloco/API/IR publicados foram removidos sem migração; o workspace pode ser descartado | Alta |
| AA-02 | P1 / Alto | Sete famílias de blocos existentes mudaram a semântica física sem migração | Alta |
| AA-03 | Resolvido durante o review | Snapshot do catálogo estava desatualizado; verificação final passou | Alta |
| AA-04 | P2 / Médio | Colisão de tilemap aceita trabalho de ~100 ms em uma chamada | Alta |
| AA-05 | P2 / Médio | 179/216 blocos 2D são liberados de uma vez no degrau 3D | Alta |
| AA-06 | P3 / Baixo | Bootstrap monolítico de 309 KB amplia custo e superfície de manutenção | Média |
| AA-07 | P3 / Baixo | Comentário do atualizador de tiros contradiz a nova semântica de `updateGroup` | Alta |

---

## Achados

### AA-01 — P0 — Remoção de bloco publicado descarta o workspace

**Evidência**

O bloco `sz_g2d_update_group_no_gravity`, o statement
`g2d:updateGroupNoGravity` e o método `SZGame2D.updateGroupNoGravity` existiam
desde a v0.25.0 (`08fd43ad`). Na v0.57.0, o mesmo lugar do catálogo passou a
conter `sz_g2d_apply_gravity_group` em
`blockCatalogGroups.ts:83`, sem bloco oculto, alias ou migrador para a forma
antiga. O schema atual só aceita a variante nova (`ir/schema.ts:2436,6387`), o
runtime contract só expõe `applyGravityToGroup`
(`runtimeContract.ts:407,728`) e o parser só reconhece o método novo
(`parsers/js.ts:3867`).

A allowlist é derivada apenas do catálogo corrente
(`state/projectStore.ts:485-496`). A sanitização é all-or-nothing
(`state/projectStore.ts:813-843`). A reprodução com uma extensão `game-2d`
instalada retornou:

```json
{"unknown":["sz_g2d_update_group_no_gravity"],"sanitized":null}
```

O schema também confirmou:

```text
g2d:updateGroupNoGravity false
g2d:applyGravityToGroup true
```

E a API corrente devolveu `typeof SZGame2D.updateGroupNoGravity === "undefined"`.

**Impacto**

- Projeto em blocos: ao importar/reidratar, todo o `blocksState` pode virar
  `null`, não apenas o bloco incompatível.
- IR persistida: é rejeitada.
- JavaScript persistido: chama um método inexistente e falha em runtime.
- Afeta qualquer projeto criado entre v0.25.0 e v0.56.0 que usou o bloco.

Isso viola diretamente a regra de `CLAUDE.md:402`: a forma de um bloco já salvo
é congelada e uma variação deve nascer como bloco novo.

**Recomendação**

1. Restaurar `sz_g2d_update_group_no_gravity` como bloco oculto e aceito pela
   allowlist antes de qualquer sanitização.
2. Manter `g2d:updateGroupNoGravity` no schema de entrada e normalizá-lo de forma
   explícita, preservando o comportamento antigo.
3. Aceitar a chamada antiga no parser e manter um alias de runtime durante a
   janela de compatibilidade.
4. Adicionar fixtures de workspace, IR e JS de todas as versões publicadas; o
   catálogo corrente deve ser um superset dos tipos históricos ou declarar uma
   migração executada antes da allowlist.

### AA-02 — P1 — Mudança silenciosa de semântica física

**Evidência**

Entre a v0.56.0 do `HEAD` e a v0.57.0 corrente, os mesmos tipos de bloco e os
mesmos helpers deixaram de aplicar gravidade implicitamente:

| Bloco/helper já publicado | Comportamento até 0.56 | Comportamento em 0.57 |
|---|---|---|
| `platformer` | soma gravidade/fallback 0,6 e move | apenas move/pousa/pula |
| `flap` | soma gravidade e move | apenas move/bate asas |
| `swim` | acrescenta afundamento proporcional à gravidade | só amortece o `vy` recebido |
| `jumpOnGround` | soma gravidade e move | apenas move/pousa/pula |
| `controlDino` | soma gravidade e move | apenas move/pousa/pula |
| `updateGroup` | move e soma `world.gravity` | apenas move |
| `updateEnemyType` | aplica gravidade a terrestres | exige `applyGravityToGroup` antes |

Uma reprodução no runtime corrente, sem teclas, com a gravidade padrão 0,6,
produziu após um quadro:

```json
{
  "platformAfterOneFrame":{"y":10,"vy":0},
  "groupedAfterOneFrame":{"y":0,"vy":0}
}
```

Na implementação 0.56, `platformer` somava 0,6 ao `vy`; `updateGroup` somava a
gravidade configurada. Os exemplos internos foram atualizados com novos blocos
de gravidade e, por isso, os testes atuais ficam verdes. Projetos salvos não
recebem a mesma edição.

**Impacto**

Personagens podem boiar, dinossauros deixar de cair, inimigos saltadores deixar
de saltar e grupos/inimigos terrestres mudar de trajetória sem erro visível. É
uma regressão de comportamento em projetos existentes, exatamente a classe de
problema que a regra de bloco congelado tenta evitar.

**Recomendação**

- Preservar a semântica dos blocos/helpers existentes.
- Criar variantes novas para o modelo de gravidade explícita, ou implementar um
  upgrader versionado que insira os novos blocos e prove equivalência para cada
  forma antiga.
- Não usar apenas o bump minor do manifest como mecanismo de migração: o runtime
  é trocado para todos os projetos instalados.
- Adicionar um golden de comportamento da versão imediatamente anterior e
  fixtures específicas de `platformer`, `flap`, `swim`, dino, grupos e inimigos.

### AA-03 — Resolvido durante o review — Golden dos 31 exemplos

**Evidência**

Na primeira execução, `bun test
src/official-extensions/examplesLoading.test.ts` falhou em
`examplesLoading.test.ts:40`:

```text
Expected: 65bff9fac46115405500f406f0209e6a213e5d6d30b29ba17716dc854634b41d
Received: c7f5657ed78274e40a7d2269a47dd3678c5652a1513dde1cd243eaf2ae6856bc
```

A primeira suíte ampla terminou com 6.461 aprovações e 1 falha. Enquanto o
review estava em andamento, outra alteração no worktree atualizou o golden. A
verificação final passou com 2/2 no teste isolado e 6.462/6.462 na suíte ampla.

**Recomendação residual**

Fazer o teste imprimir o id da extensão antes do hash para reduzir o tempo de
diagnóstico quando o loop falhar. Nenhuma ação bloqueante permanece neste item.

### AA-04 — P2 — Colisão de tilemap excede o orçamento de quadro

**Evidência**

O runtime aceita até 512×512 células e até 512 índices sólidos
(`runtime/worldTiles.ts:13-18`). `isSolidCell` e `isPlatformCell` usam
`Array.indexOf` (`worldTiles.ts:208,216`) dentro do duplo loop de colisão
(`worldTiles.ts:331-332`). Um sprite grande pode cobrir todas as 262.144 células.

Benchmark do runtime real, Bun 1.3.11/Windows, com o índice sólido no fim da
lista de 512 entradas:

| Grade visitada | Células | Uma chamada |
|---:|---:|---:|
| 128×128 | 16.384 | 11,35 ms |
| 256×256 | 65.536 | 28,62 ms |
| 512×512 | 262.144 | 100,63 ms |

Uma chamada máxima consome cerca de seis orçamentos de 16,7 ms, antes de
desenho, lógica ou outras colisões.

**Recomendação**

- Converter sólidos/plataformas para `Set` na criação do mapa.
- Impor um orçamento de células por chamada, com aviso didático, ou subdividir
  sprites/colisores grandes.
- Manter as listas serializáveis para o contrato público, mas usar sets internos
  não enumeráveis/cacheados.
- Adicionar benchmark/regressão com um teto conservador e mapas grandes reais.

### AA-05 — P2 — Progressão despeja 179 blocos 2D no degrau 3D

**Evidência**

`resolveBlockLevel` classifica o perfil essencial em `iniciante-2d` e todo outro
`sz_g2d_*` em `iniciante-3d` (`blockly/blockLevels.ts:235-241`). A contagem
efetiva é:

```text
iniciante-2d: 37 blocos do Jogo 2D
iniciante-3d: 179 blocos do Jogo 2D
```

Nesse mesmo degrau entram todos os blocos `sz_g3d_*`. Assim, a criança sai de um
conjunto bem curado para 179 peças 2D adicionais mais a porta completa do 3D.
O catálogo completo tem 216 blocos em 24 subcategorias; Movimento sozinho tem
21 e os kits somam dezenas de peças.

**Impacto**

O degrau chamado “iniciante 3D” passa a ser também o lugar onde se descobre a
maior parte do Jogo 2D. Isso aumenta a carga de busca e mistura a progressão de
conceitos 2D com a estreia do eixo 3D. Os testes atuais comprovam a regra, mas
não avaliam sua carga cognitiva.

**Recomendação**

- Criar perfis 2D progressivos por curso/objetivo (fundamentos, plataforma,
  aventura, kits) usando `allowBlocks`, sem liberar o restante inteiro.
- Medir tempo para encontrar bloco, erros de escolha e abandono com crianças.
- Se o desbloqueio global continuar, mudar o rótulo/explicação do degrau para
  não sugerir que ele contém apenas 3D.

### AA-06 — P3 — Runtime monolítico de 309 KB

Os fragments estão bem separados no source, mas são concatenados em uma única
string com 215 métodos e injetados integralmente em todo preview que instala a
extensão. Isso amplia o tempo de parse/compilação, a superfície de auditoria e o
custo de qualquer reexecução. Os 42 cenários de navegador passaram, portanto
não há regressão funcional comprovada.

**Melhoria:** instrumentar parse/boot no preview e, se o custo for relevante,
carregar módulos por famílias usadas pelo IR ou gerar um bootstrap mínimo com
dependências declaradas. Não fragmentar sem medida: lifecycle e estado global
compartilhado tornam essa mudança de alto risco.

### AA-07 — P3 — Comentário obsoleto no atualizador de tiros

`runtime/arcadeKitsSpace.ts:445-446` diz para não usar `updateGroup` porque os
tiros devem ficar sem gravidade. Na v0.57, `updateGroup` é justamente o helper
sem gravidade. O loop manual ainda é justificável porque também poda os tiros,
mas o comentário registra uma razão falsa.

**Melhoria:** explicar que o loop integra e poda em uma só passagem, sem afirmar
que `updateGroup` adiciona gravidade.

---

## Arquitetura, segurança e qualidade

### Pontos aprovados

- 59/59 módulos de produção alcançáveis pelo entrypoint; nenhum arquivo morto.
- Nenhum ciclo de importação relativo no grafo da extensão.
- Nenhum nome de função duplicado entre os fragments concatenados.
- Nenhum `any`, `@ts-ignore`, `@ts-expect-error`, `eval` ou `new Function` em
  produção no escopo auditado.
- Nenhuma chamada `fetch`, XHR, WebSocket ou storage no bootstrap.
- Manifest validado cedo; permissões mínimas e coerentes.
- API/contrato/runtime têm inventário único e teste compilável.
- 216 blocos únicos passam pelo pipeline bloco→IR→código→parser→IR→workspace.
- Lifecycle, reinício, pausa, áudio, pointer capture, DPR, HUD acessível e
  limites de grupos/tilemaps possuem defesas e testes relevantes.
- Exemplos têm round-trip, fixpoint textual e smoke real no Chromium.

### Código morto e duplicação

- **Arquivos mortos:** 0.
- **Ciclos:** 0.
- **Grupos de duplicação exata comprovados:** 0.
- **Linhas removíveis com segurança:** 0 identificadas.

Os arquivos grandes são principalmente catálogos, exemplos ou fragments do
runtime. O maior risco não é duplicação, e sim o contrato espalhado: uma mudança
de bloco toca até nove camadas. O teste `blockAudit` reduz bastante o risco, mas
não substitui compatibilidade histórica.

## Verificação executada

| Comando | Resultado |
|---|---|
| `bun install --frozen-lockfile` | PASS |
| testes básicos de `game-2d` (42 arquivos) | 1.000 PASS |
| `bun test src/official-extensions/game-2d` | 2.000 PASS, incluindo advanced pelo padrão do Bun |
| níveis + toolbox + sanitização + compatibilidade | 49 PASS |
| Biome focado em extensão e pipeline | 126 arquivos, PASS |
| `bun run check` | 1.040 arquivos, PASS |
| `bun run typecheck` | PASS |
| `bun test src` | 6.462 PASS / 0 FAIL / 70.626 expects |
| Playwright galeria `game-2d:` | 41 PASS |
| Playwright tremor/viewport | 1 PASS |

## Ordem recomendada de correção

1. **Bloquear promoção da 0.57 e corrigir AA-01.** Recuperar todos os formatos
   persistidos antes de mexer em comportamento.
2. **Definir a política de AA-02.** O objetivo pedagógico é bom, mas precisa de
   blocos novos ou migração equivalente, não de mutação silenciosa.
3. **Otimizar AA-04** com sets/cache e limite de trabalho.
4. **Testar a curadoria AA-05** com perfis menores e usuários reais.
5. Tratar AA-06/AA-07 como manutenção posterior.

## Artefatos relacionados

- Relatório QA: `.audits/game-2d-full-review-2026-08-02-current/qa/verification-report.md`
- Tickets reproduzíveis: `.audits/game-2d-full-review-2026-08-02-current/qa/issues/`
