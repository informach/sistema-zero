# C01b2b: controles da corrida da Vila sem curso opcional

## Decisão

A corrida e suas três variações dependem do clique em grupo, cuja única fonte local é
Cadê Todo Mundo, um extra. Usar Enter ou + do controle de toque para dar a largada.
O extra passa a ser Espaço ou A para recomeçar. Ambos usam o evento de tecla ensinado
na trilha. Retirar o desenho de botão clicável do cenário e mostrar instruções claras;
o controle de toque verdadeiro continua acessível. Não conceder blocos manualmente.

Preservar os cinco primeiros quadros, as rotas, prazos, contatos, contagem, IDs históricos
dos objetivos e recompensas. O ID `recomecar-enter` permanece histórico, com rótulo e prova
de Espaço/A. Publicações antigas e criações aprovadas não são reescritas. Este recorte
corrige a dependência, não declara que a Vila já aplica pulo/gravidade do Inventor.

## Etapas

- [x] Provar que a cobertura atual depende de extra e retirar essa dependência dos projetos.
- [x] Atualizar instruções e provas comportamentais, inclusive ausência do reinício extra.
- [x] Regenerar os dois manifestos e os relatórios com as fontes locais.
- [x] Conferir executor real, Blockly, teclado e toque nos quatro projetos.
- [x] Suítes, tipagem, Biome e revisão completa.
- [x] Commit `5eeeb0836` e merge local `0ca840100`.

Push de staging autorizado no encerramento deste lote. Implementação dos próximos lotes
pausada por solicitação da dona; C01f permanece fora do staging e desse envio.

## Provas e revisão

- O novo teste de cobertura falhou antes com inclusão no grupo e clique em grupo, ambos
  com fonte somente em curso extra. Depois da troca, todos os 18 itens Kids/adulto da Vila
  têm fonte local da trilha, sem requisito manual. Isso não comprova curso publicado.
- Contratos: 209 testes aprovados, 9.046 asserções. Conteúdo, leitor canônico dos 108
  entradas, derivação do Members e Blockly da Vila: 128 aprovados, 12.658 asserções.
- Executor real: um ensaio aprovado, 167 asserções, 290 segundos. Os nove gabaritos passam;
  os iniciais falham em todos os objetivos. Negativos preservados e quatro novos casos
  retirando somente o atalho extra são recusados. Falha de infraestrutura não vale como
  reprovação. Comando: `SZ_CHECK_CHROMIUM` definido para o Chrome local e
  `bun test packages/studio-runtime/tests/vila-doce-browser.test.ts`.
- Runtime completo: `bun test --timeout 30000`, 386 aprovados, 34 ignorados, zero falhas,
  4.153 asserções. Navegadores dos demais conteúdos não configurados nessa execução.
- Navegador visual: oito casos aprovados em 1280 e 390 px, entrada real por teclado/toque,
  conclusão e reinício. Primeiro ensaio encontrou o modo de controle só com setas; corrigido
  para `auto` e todos os casos repetidos. Capturas e limites em
  `docs/qa/2026-10-30-vila-repertorio/README.md`. Não equivale a teste em celular físico.
- Revisão JSON profunda contra a base: quadros 1 a 5 idênticos nos dois públicos; demais
  metadados, recompensas, ajustes manuais e IDs de objetivos preservados. Imagens iguais,
  retirando só o botão não usado. Legendas, eventos e provas concordam em Enter/+ e Espaço/A.
  Fonte e artefatos gerados conferidos por teste. Sem nova regra de movimento ou economia.
- Tipagem de contratos, fontes documentais da Vila e runtime completo, incluindo testes,
  aprovada com 8 GB. Biome dos onze arquivos TS/MJS/JSON pequenos, lint dos dois manifestos
  grandes (teto de leitura de 4 MB) e `git diff --check` aprovados. Manifestos conservam
  a formatação determinística do gerador, conferida pelo teste de correspondência.

## Encerramento autorizado

A dona pediu concluir este lote, revisar, commitar e fazer merge local e push de staging,
e então pausar os próximos lotes. O recorte C01f começou a ser estudado no mesmo worktree,
mas não entra neste commit nem neste envio. Seu plano e alterações locais ficam preservados.

## Pedidos de arte e limites

Nenhum. Preservar os SVGs existentes, apenas retirar o botão desenhado que não será mais
clicável. Não alterar arte do jogo nem GLBs. Sem publicação de conteúdo remoto ou migração.
Push de staging autorizado pela orientação de encerramento acima.
A aplicação de pulo/gravidade e ritmo continua no próximo recorte curricular da Vila.
