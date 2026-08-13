# Verificação final — full review da REMEDIAÇÃO do Reino Zero e do Jogo 2D

**Claim:** o lote de remediação de 13/08 (`15106f15` + os 4 commits do branch) foi revisado, e os
defeitos que ele introduziu ou deixou passar estão corrigidos com regressão.
**Review original desta rodada:** 2026-08-13, America/Sao_Paulo
**Escopo:** `packages/studio/src/official-extensions/game-2d` (extensão + exemplo Reino Zero), mais
os pontos de `src/ir` e do `game-2d-advanced` que os contratos compartilhados alcançam.
**Verdict:** **PASS**

## Por que esta rodada existe

O `verification-report` de 12/08 fechou em PASS depois de uma remediação que reescreveu ~1800 das
2710 linhas de `reinoZero.ts` e mexeu em seis módulos de runtime. **Ninguém revisou a remediação** —
e este repositório já registrou duas vezes que *correção de review é código novo e merece review*.
A régua do produto continua sendo a declarada pela dona: **réplica autoral do Super Mario**, mesmas
mecânicas com arte e nomes próprios.

Método: três lentes adversariais independentes (runtime · cadeia bloco/IR · pedagogia e copy) mais
leitura própria. A lente do runtime e a da cadeia **convergiram sozinhas** no mesmo defeito do filtro
de contato de tile, sem se conhecerem.

## Resultado

**12 defeitos corrigidos**, todos com reprodução que falha antes e passa depois; **7 lacunas de copy**
fechadas; **8 redes novas**, uma delas provada que morde por reinserção do defeito.

### Alto — nasceram NESTE lote

| # | Defeito | Prova |
|---|---|---|
| BUG-101 | O lado **"dentro"** do "Para cada tile" não filtrava: era idêntico a "qualquer" | sonda: `inside` devolvia o contato de chão junto com o da moeda |
| BUG-102 | **`z` e ESPAÇO viraram pulo** em todo jogo de plataforma que já existia | sonda: `platformerWithTerrain` com ESPAÇO → `vy = −11` |
| BUG-103 | **Chutar um casco parado cobrava vida** no quadro seguinte | medido: fuga de 0,08 px/quadro na 2ª jornada |
| BUG-104 | **Morrer sem zerar a vida devolvia o herói GRANDE** | aritmética do teto + playthrough |
| BUG-105 | Com a **estrela**, encostar num espinho rendia 200 pontos por QUADRO e não matava | playthrough: 0 baixas, ganho ilimitado |

### Médio

| # | Defeito |
|---|---|
| BUG-106 | A estrela não cobria a barra de fogo nem o tiro do guardião |
| BUG-107 | O casco parado não caía — e a rede da BUG-004 congelava isso como contrato |
| BUG-108 | O Reino Zero nunca aplicava gravidade aos `cascos` (nem o casco nem o bicho caíam de uma beirada) |
| BUG-109 | O bloco `?` pagava moeda **e** prêmio na mesma cabeçada |
| BUG-110 | As partículas de derrota nasciam invisíveis (ninguém as desenhava) |
| BUG-111 | O `Ç` da fonte de pixel ficava uma linha acima da base das vizinhas |
| BUG-112 | O aviso do `useFont` mandava a criança fazer o que ela já tinha feito |

### Copy que descrevia um produto que não existe mais

- O manual ensinava um **soquete revertido em 02/08** a pedido da dona (`um x aleatório para
  largura …`), com uma instrução inexecutável.
- Chamava um bloco por um nome inexistente (**"Escrever o placar"**) e a afirmação estava
  **invertida** — o bloco parecido segue a fonte escolhida. Mais seis nomes inventados.
- A abertura dos **dois** manuais (g2d e gk) ainda descrevia a fonte embutida no runtime, desenho que
  este mesmo lote desfez.
- A regra do `useFont` era falsa nas duas metades (o bloco é `start-only`; o resolvedor varre a IR
  inteira). O caso real — dois blocos, vale o último — não estava documentado.
- Nenhuma das três superfícies contava o **gesto novo do casco**, e o **"Atualizar os cascos"**, que
  é obrigatório e não tem aviso quando falta, não era nomeado em lugar nenhum.
- "aba **Assets**" (o produto diz painel **Imagens e sons**) em dois pontos de entrada.
- A dica do "Ajustar" tinha **787 caracteres**, sete vezes a mediana: virou manual.
- Travessão no manual do aluno e em três avisos do Console.

## Gates finais

| Command | Exit code | Output summary | Verdict |
|---|---:|---|---|
| `bun test src/official-extensions/game-2d/__tests__` | 0 | 1.551 pass, 0 fail (baseline 1.524) | PASS |
| `bun test src` | 0 | 7.600 pass, 0 fail, 482 arquivos | PASS |
| `bun run typecheck` | 0 | TypeScript sem erros | PASS |
| `bunx biome check` no escopo | 0 | 283 arquivos, nenhuma correção pendente | PASS |
| `bunx playwright test e2e/reino-zero-classic.spec.ts --project=chromium` | 0 | 2 pass, build e servidor novos | PASS |

## Redes acrescentadas

| Rede | O defeito que ela pega |
|---|---|
| lados de contato do runtime × dropdown × `classicContracts.ts` | BUG-101 (o contrato tinha CINCO cópias literais) |
| papéis de peça e opções de fonte do g2d × contrato/catálogo | dropdown que coage o valor da criança para a 1ª opção |
| pad não empresta tecla de pulo aos blocos antigos | BUG-102 |
| casco chutado, quadro a quadro | BUG-103 (o teste antigo consagrava o defeito) |
| morrer por causa que não zera a vida | BUG-104 |
| estrela × inimigo imortal, e estrela × castelo | BUG-105 e BUG-106 |
| casco pisado NO AR | BUG-107 |
| quique nunca ganha altura | tripwire de igualdade de ponto flutuante |
| `blockAudit`: zod não pode ENGOLIR campo | dez tipos com forma TS e zod em arquivos diferentes |
| todo helper da API é mencionado no `ai.ts` | bloco que o tutor nunca sugere porque não sabe que existe |
| catraca de tamanho de dica (580) e travessão no manual/avisos | copy que ninguém lê e a regra de voz sem rede |
| `ctx.font` com `var(--…)` nos TRÊS runtimes que leem a fonte | falha muda; antes só o da gk era varrido |

## Reproduções encerradas

| Flow | Observable result after the fix | Verdict |
|---|---|---|
| "Para cada tile" no lado "dentro" com chão na cena | só o tile atravessável entra no laço | PASS |
| ESPAÇO num jogo com o bloco de plataforma comum | não pula; a seta para cima continua pulando | PASS |
| Chutar o casco e continuar correndo atrás dele | vida intacta até os dois se descolarem | PASS |
| Morrer de tempo / cair fora do mundo estando grande | renasce pequeno | PASS |
| Estrela + espinho por 30 quadros | uma baixa, um pagamento | PASS |
| Estrela + barra de fogo e estrela + tiro do chefe | vida intacta (com anti-vácuo sem estrela) | PASS |
| Casco pisado no ar | cai e assenta no topo de uma peça | PASS |
| Cabeçada no bloco `?` | dá o prêmio OU a moeda, nunca os dois | PASS |
| Travessia das 32 fases nas duas jornadas | zero erro e zero aviso do motor | PASS |

## Falso positivo registrado

⚠️ A primeira versão da rede do quique acusou um ganho de **284px que não existe**: o herói tinha
sido estacionado em `x = 1200` numa fase de 1152px, morreu, a morte recarregou a fase e o `−100` de
"estrela guardada" virou "altura". **Piloto fora do mundo mede o próprio piloto.** E a primeira
versão da rede de cobertura da IA acusou **39 blocos corretos** por casar palavras da face em vez do
nome do helper — teste que acusa quem está certo é tão ruim quanto aviso que acusa quem está certo.

## Pendências

- **QA dela jogando** — as três lentes e as sondas cobrem comportamento; cor, composição alfa e
  ordem de camada só o navegador prova, e o painel desta máquina fica oculto (o `requestAnimationFrame`
  congela e todo `getBoundingClientRect` volta zero).
- ⚠️ A árvore tem **WIP de outra sessão** (`e2e/examples-gallery.spec.ts` e `src/examples/qaContracts.ts`,
  sobre o tempo de montagem do Reino Zero Ultra). Stagear por caminho, nunca `git add -A`.
