# Faísca: mapa, ritmo e região piloto

> Execução inline com `executing-plans`, conforme autorização da sessão. Conferir cada entrega antes da seguinte.

**Goal:** construir um blockout artístico jogável da Faísca, com seis distritos e uma região pequena com arte real.

**Architecture:** dados puros de lugares/rotas e altura da Faísca; terreno e física usam a mesma altura. Arte privada por manifesto de commit, carregador com liberação explícita e instâncias estáticas; controlador, animação e câmera existentes.

**Tech Stack:** Bun, TypeScript, Three.js, R3F, Rapier e React existentes.

**Spec:** `docs/plans/2026-11-15-faisca-blockout-artistico-design.md`.

## Restrições globais

- Escala do avatar 1; a pedido posterior do usuário, testar exploração 1,5/3,4 m/s com ampliação da passada por IK e cadência ajustada. Comparar com a referência anterior, sem alterar os comprimentos dos ossos.
- Seis distritos, anel e atalhos, seis cabeceiras; lago separado do oceano.
- Nenhuma migração de posições nem alteração dos dados compartilhados da plataforma.
- Moradores são criaturas, humanos são visitantes; protótipos de corpo não equivalem aos papéis completos do capítulo.
- Preservar identidade visual de adulto/Kids. Sem redesenho do HUD de produção.

## 1. Registrar a fundação aceita

- [x] Criar `feat/arquipelago-v2` sem descartar mudanças.
- [x] Reexecutar suíte, tipagem e build da base; revisar os diffs de dependências do avatar.
- [x] Commit do jogo, catálogo/tipos/scripts do avatar necessários e relatórios macro. Documentos de outras áreas ficam fora. Checkpoint `4f73b5370`.

## 2. Mapa e altura

Arquivos: criar `src/sistemas/faisca.ts` e `tests/faisca.test.ts`; modificar `src/sistemas/geografia-do-arquipelago.ts` e `playground/macro-estado.ts`.

Interfaces: `PontoDaFaisca {x,z}`, `LUGAR_DA_FAISCA`, `DISTRITOS_DA_FAISCA`, `ROTAS_DA_FAISCA`, `comprimentoDaRota(pontos,altura)`, `pontosAoLongo(pontos,intervalo)`, `relevoDaFaisca(x,z)`.

- [x] Escrever testes de conectividade do anel, alcance de seis distritos, espaço de lote, tempos reais, intervalos de curiosidade e inclinação dos trajetos.
- [x] Implementar dados e funções puras e conferir invariantes com testes de conectividade, inclinação e passagem livre.
- [x] Aplicar relevo específico e patamares sem mexer nas outras seis ilhas; mover partida do ensaio para a porta reservada.

Verificação principal:

```ts
const horta = comprimentoDaRota(rota('casa-horta'), altura)
expect(horta / MUNDO_DA_AVENTURA.andar).toBeLessThan(35)
for (const r of ROTAS_DA_FAISCA)
  expect(pontosAoLongo(r.pontos, 26).length).toBeGreaterThan(0)
```

## 3. Manifesto e arte piloto

Arquivos: criar `scripts/exportar-arte-faisca.ts`, `src/mundo/faisca/arte.generated.ts`, `src/mundo/faisca/piloto.tsx` e `src/sistemas/composicao-faisca.ts`; modificar `playground/servidor.ts` e entrada macro.

Interfaces: manifesto com `commit`, caminho, digest, dimensões, caixa, triângulos e clipes por peça. Exportação opcional em diretório local ignorado; rota serve apenas os arquivos do manifesto. Composição fornece id/peça/x/z/giro/escala uniforme, colisão e distrito.

- [x] Exportar somente modelos do commit aprovado, conferir digest e dimensões; nenhuma leitura da pasta de trabalho da arte.
- [x] Instanciar decoração repetida, clonar esqueleto para criaturas e usar animação existente; preservar materiais.
- [x] Desenhar referências de bloco enquanto carrega ou falha; oferecer diagnóstico e repetição explícita no ensaio.
- [x] Instalar colisões proporcionais, ponte curta real e indicadores de peças/recursos; liberar recursos quando o piloto sai da vizinhança.

## 4. Percursos, mapa e ritmo

Arquivos: criar `src/mundo/faisca/caminhos.tsx` e `playground/faisca-mapa.tsx`; modificar interface e entrada macro; testar regras de visita/medição em `tests/faisca.test.ts`.

- [x] Desenhar caminhos aderentes ao terreno, lugares internos e referências de curiosidade.
- [x] Mostrar mapa local, três direções do começo, seis cabeceiras e tempos sem prometer os valores do perfil antigo.
- [x] Medir percurso com relógio ativo e distância real, sem contar teleporte de ferramenta; retorno apenas a marcos visitados, liberando o movimento depois do chão pronto.

## 5. Conferência e checkpoint da entrega

- [x] Executar testes novos e regressões relevantes, typecheck, build e Biome.
- [x] Jogar percursos reais e ponte piloto, conferir parada/pausa/retomada, falha de arte, liberação/reentrada e toque.
- [x] Capturas dia/noite, mapa e erro; anotar métricas sem certificar celular físico.
- [x] Relatório `docs/qa/2026-11-15-faisca-blockout-artistico.md`, README/CLAUDE e commit na branch V2.
