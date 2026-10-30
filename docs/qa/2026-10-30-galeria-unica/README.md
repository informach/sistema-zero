# Galeria única: conferência local

Base de commit 6461f19c0 com alterações locais ainda sem commit. Nenhuma escrita
em banco remoto, nenhuma migração de ambiente e nenhum deploy nesta prova.

## O que passou

- Contrato estrito, identidade e catálogo compartilhado no Members. Aquário e
  fliperama custam 70, planta 30. Os outros seis itens só têm representação no jogo.
- 33 testes e 175 asserções no conjunto final de banco, contrato, HTTP e transporte.
  O conjunto inclui nove testes do inventário Members e três do exportador com
  Postgres descartável. Há concorrência real de 12 compras
  pelos dois destinos, com um débito e uma posse, e retomada após resposta perdida.
- 125 testes e 1652 asserções de regressão de galeria, quarto, avatar e carteira.
- Autoria existente: nove testes de molde/autorização e oito externos de entrega
  confirmada na conta. O wrapper de diálogo também executa oito casos internos.
- Biome passou nos arquivos do lote. Tipagens finais de Members, API, jogo e
  member-shell passaram com exit 0. Os contratos também passaram. O jogo recebeu
  depois o complemento do primeiro pedido, que terá sua própria reverificação.

## Navegador

Chrome headless com SwiftShader, desenho em qualidade leve e movimento reduzido.
O jogo e os controles são reais; a plataforma e a carteira são locais simuladas.

| Cenário | Resultado | Evidência |
|---|---|---|
| Kids, computador 1280x720 | Passou | [Feira](r5-kids-computador/01-feira.png), [compra](r5-kids-computador/03-comprada.png), [reabertura](r5-kids-computador/04-reaberta.png) |
| Adulto, celular emulado 390x844 | Passou | [Feira](r6-adulto-celular/01-feira.png), [compra](r6-adulto-celular/03-comprada.png), [reabertura](r6-adulto-celular/04-reaberta.png) |

As duas execuções abriram a feira pelo controle do jogo, cancelaram a primeira
confirmação sem cobrar, compraram a planta por 30 moedas, aplicaram no objeto e
reabriram após recarregar. Saldo final 50, uma posse, nenhum botão para cobrar outra
vez, nenhum erro de página. No celular o conteúdo mede 350 px dentro de tela de
390 px, sem rolagem lateral. Os cinco prints e o resultado JSON de cada execução
estão nas pastas indicadas. A resolução raster foi reduzida a 0,5 no emulador;
não é medição de legibilidade ou desempenho em aparelho físico.

## Negativos e correções

A primeira preparação deixou o contrato como import externo incompatível com o
Node; o bundle passou a incluir contratos. r2 tentou reabrir na ilha errada. r3
usou um aquário sem projeto azul: o jogo recusou a compra corretamente. A prova
passou a usar a planta, cujo projeto já pertence ao cenário. r4 comprou e guardou,
mas não focou o canvas depois de recarregar; r5 acrescentou o foco antes do E.
Os diretórios de falha foram preservados, sem atribuir esses erros de roteiro ao
produto. Não houve mudança na regra de desbloqueio para fazer o teste passar.

No banco, um caso novo reproduziu a tentativa de adotar dois itens com a mesma
chave histórica. A correção recusa a segunda adoção. O negativo foi preservado
em `.cache/arquipelago-galeria-adocao-red.log`; a prova verde e o conjunto final
cobrem esse caso. A falha inicial de tipagem era um dado de teste de quarto sem
`theme` e `pet`, corrigido sem cast.

## Limites

Não prova login, navegação real entre o quarto e o jogo, importação operacional
remota nem disponibilidade das ferramentas em uma assinatura real. A posse comum
foi provada pelo banco e pelos contratos; o navegador confere o comportamento do
cartão do jogo. Celular físico, build das imagens, ambientes e revisão final
continuam no aceite integrado. O runbook de corte está em
[operação da galeria](../../operations/arquipelago-galeria-unica.md).
