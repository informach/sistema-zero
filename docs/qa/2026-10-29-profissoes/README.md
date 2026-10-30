# Profissões, pagamento e reabertura

Conferência local do lote L07, em 29/10/2026. Nenhuma escrita em banco remoto.

## Provas do serviço

- Members, Postgres descartável: 4 testes e 22 asserções. Teto de 100 por semana,
  concorrência, mesma chave, débito que não reabre teto, virada de São Paulo e preservação
  dos créditos antigos acima de 100.
- Serviço do jogo, Postgres descartável e borda HTTP real: 5 testes e 40 asserções. Reserva
  única, seis bandejas verificadas, perda de resposta, teto retomado em outra semana,
  público, dono, conta, suporte, ilha fechada e corpo com prêmio adulterado.
- Contrato: 2 testes e 45 asserções na primeira prova; datas e coerência da conclusão
  receberam validação adicional antes da conferência visual r4.
- Jogo, recompensas, galeria e fronteiras: 47 testes e 769 asserções antes do ajuste da HUD.
- Regressão causal da HUD: 6 passaram e 1 falhou com saldo 80 em vez de 85; depois da
  correção, 7 passaram e 34 asserções, relendo o saldo do serviço.

Os testes de banco usam `arquipelago_test_profissoes_r1` e o harness local já existente
do Members `kids_journey_arquipelago_economia_r1`, no Postgres descartável da porta 62751.
O adaptador da carteira é controlado no teste do serviço; a carteira real foi exercitada
separadamente no teste do Members. Isso não é teste de implantação conjunta.

## Navegador

Comando: compilar `packages/arquipelago/playground/verificar-turnos-browser.ts` para Node,
empacotando os contratos e mantendo `playwright-core` e `three` externos; executar na pasta
do pacote. Variáveis `ARQUIPELAGO_PUBLICO`, `ARQUIPELAGO_CELULAR` e `ARQUIPELAGO_PRINTS` escolhem
o caso e a pasta. Chrome headless com SwiftShader, uma instância por vez, DPR 0,5.

| Caso r4 | Resultado | Largura visível/conteúdo |
|---|---|---|
| Kids, computador | Passou | 560/560 |
| Kids, celular emulado | Passou | 350/350 |
| Adulto, computador | Passou | 560/560 |
| Adulto, celular emulado | Passou | 350/350 |

Cada caso abre o balcão pela conversa com Bento, erra uma bandeja, atende os seis pedidos,
confere duas estrelas, ingredientes e crédito de 5 moedas, abre sorveteria e sucos e recarrega.
Saldo 85 e fubá 1 permanecem. Há cinco prints e um `resultado.json` por pasta r4.
Celular usa o botão Usar. O playground simula a API e a carteira, não se conecta ao Members.

O print r4 revelou a HUD atrasada, ainda mostrando 80. A correção já passou na regressão
do estado e a conferência visual r5 acrescenta a espera explícita pelo saldo 85 na HUD.
r5 Kids/celular passou: HUD 85 antes do print, saldo e ingredientes preservados depois de
recarregar, largura 350/350 e nenhum erro de página. O print foi inspecionado.

## Tentativas preservadas e limites

- r1: o runner externo para Node deixou o contrato TypeScript sem empacotar; parou antes
  do navegador. O build seguinte empacota contratos e mantém somente bibliotecas externas.
- r2: expectativa de pontuação do convite desatualizada no verificador. Não foi falha do jogo.
- r3: o verificador recarregava com `em=`, que manda o playground criar uma partida naquela
  posição; isso provocou conflito com o rascunho. r4 remove os parâmetros de inicialização
  antes de recarregar e espera o salvamento confirmado. Print e texto da falha preservados.
- O pagamento em ingredientes cheio agora é recusado inteiro; presente/pedido não são
  consumidos. Testes cobrem o caso em que pagamento cabe, mas pagamento junto da receita nova não.

Não prova dispositivo físico, desempenho de produção, compra entre quarto e jogo, todos os
pedidos de moradores remunerados ou aceite integral do programa. Commit e push aguardam a
entrega completa solicitada.
