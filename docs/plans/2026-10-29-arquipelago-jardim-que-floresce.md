# Minijogo do Estúdio "Jardim que floresce", fase4-10

**Objetivo:** o pacote de desafios da Ilha das Nuvens (proposta: "Minijogo do Estúdio: Jardim que
floresce: simulação e variáveis"), no formato do Recife e do Pico: um Quadro das Cores e três
desafios do dia, com as provas no executor real. Importar e publicar no Admin fica para outra etapa.
**Arquitetura:** IR JavaScript em blocos, arte SVG embutida, objetivos de comportamento, gerador
determinístico (`docs/desafios-do-jogo/nuvens/`). Provas no contrato, no Blockly, no HTTP em memória
e no executor real. Nenhum código do jogo, salvamento ou serviço muda.

## Decisões

- **Posto e blocos:** as Nuvens abrem em `champion` (Gênio da Criação), recompensa `avancado-2d`. O
  Arquiteto e o Gênio ainda não têm cursos autorados; vale a união dos cursos até lá (a mesma do
  Pico), sem blocos acrescentados à mão.
- **Simulação e variáveis:** quatro variáveis (água, sol, tempo, crescimento) e um passo fixo de
  1 s. A criança completa os botões (Regar e Sol) e a simulação; a troca de desenho da flor vem
  pronta. Números: começo 0 de água e 3 de sol; Regar e Sol guardam 3; cresce 10 por passo e gasta 1
  de cada; floresce em 100.
- **Variações, uma regra só cada:** rega forte (5), sol forte (20 com sol de 6 para cima, um se e
  senão) e chuva (1 de água por passo, antes do crescimento). O teste da pasta confere que muda só o
  botão Regar ou só a simulação.
- **Objetivos sem depender do relógio exato:** cada conferência acontece depois de toda a água ou
  todo o sol disponível ter sido gasto (por exemplo, 3,6 s com 3 de água e 3 de sol), então não
  importa em que ponto do segundo o clique caiu. Nenhuma espera passa de 10 s (o limite do
  executor); o florescer usa duas esperas (6 e 5 s).
- **Sol forte em duas fases** (9 de sol e depois 6, 5 e 4), para separar "sempre 20" (120), o certo
  (100) e "sempre 10" (60). **Chuva** confere a água que sobra, para pegar uma chuva dobrada.
- **Extra:** Enter recomeça o jardim. Como um segundo pode virar logo depois do Enter (e, na chuva,
  cair água e a flor crescer 10), a conferência aceita até um passo novo.
- Quadro 6, ordens 60 a 63, `atracao: 'jardim-que-floresce'`, moedas de `MOEDAS_PADRAO_POR_TIPO`.

## Pedidos de arte

Nenhum. A arte do minijogo é SVG embutido no pacote.

## Etapas

- [x] `projetos.ts`, `objetivos.ts`, `gerar-manifesto.ts`, `nuvens.manifesto.json` e README.
- [x] Teste da pasta: JSON igual à fonte, IR válido, nível dos blocos, orçamento, uma regra por
  variação, o principal incompleto só nos botões e na simulação.
- [x] Contrato (`manifesto-das-nuvens.test.ts`): posto, quatro desafios, moedas, blocos dos cursos,
  arte embutida e textos.
- [x] Blockly (`nuvensManifest.test.ts`) e HTTP em memória (`manifestos.test.ts`).
- [x] Executor real (`studio-runtime/tests/nuvens-browser.test.ts`): gabaritos aprovam, iniciais e
  dez casos incorretos reprovam.
- [x] Conferência visual (computador, celular emulado e janela compacta), prints e relatório.
- [x] Revisão completa, tipos e Biome, commit local.

## Resultado (29/10/2026)

Tudo aprovado. Relatório: `docs/qa/2026-10-29-nuvens-manifesto.md`. A conferência visual achou que
o primeiro toque no palco do Jogo 2D só ativa a tela (não chega ao botão); está anotado no relatório
para quem cuida do runtime (o executor do Estúdio não é afetado).
