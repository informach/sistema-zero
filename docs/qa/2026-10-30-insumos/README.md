# Compra de sementes e ingredientes

Conferência local de 30/10/2026, ainda sem publicação ou migração em ambiente remoto.

## Evidência

- `r5-kids-computador`: Chrome com SwiftShader, 1280 × 720, público Kids.
- `r5-adulto-celular`: Chrome com SwiftShader, 390 × 844 e toque emulado, público adulto.
- Em ambos: escolher três leites, conferir seis moedas, cancelar sem cobrança, confirmar,
  receber três unidades, recarregar e reabrir a feira. Saldo final 74, um débito e nenhuma
  mensagem de erro de página ou console. Painel sem transbordamento horizontal.
- Os quatro PNGs de cada pasta mostram entrada, confirmação, entrega e reabertura. Os JSONs
  registram o público, o saldo, a quantidade, o número de débitos e as dimensões do painel.
- Executor: `playground/verificar-feira-browser.ts`, com `ARQUIPELAGO_INSUMOS=1` e os mesmos
  controles `ARQUIPELAGO_CHROMIUM`, `ARQUIPELAGO_PRINTS` e público/celular do verificador.

As tentativas anteriores foram preservadas: r1 encontrou associação incompleta do rótulo ao
campo; r2 encontrou uma suposição errada do teste sobre a persistência do saldo inicial. R3 e
r4 completaram a compra, mas a inspeção do print revelou um aviso de conexão indevido quando
havia apenas progresso ainda não enviado. O produto foi corrigido e r5 verifica sua ausência.

## Consistência financeira e fechamento

`arquipelago-api/tests/db/insumos.test.ts`: seis testes e 68 verificações com Postgres local,
rotas reais, concorrência, revisão, isolamento de conta/público, limite do inventário, falha
de resposta e PUT concorrente. `insumos-members.test.ts`: um teste com 20 verificações,
carteira e banco reais do Members, repetido para Kids e adulto. O transporte local interrompe
a resposta depois do commit da carteira; a retomada conserva um evento de menos seis moedas
e entrega os três itens uma vez. Nenhuma chamada à rede de staging ou produção.

`arquipelago/tests/insumos.test.ts`, `salvar.test.ts` e `salvamento-duravel.test.ts`: 23 testes,
120 verificações. Incluem diário IndexedDB antes do débito, resposta perdida e reabertura,
outro aparelho sem recibo, capacidade, disco cheio, alteração concorrente, clique repetido e
encerramento antes do microtask. Esse último caso falhava com duas consultas depois de fechar;
a correção recusa iniciar a retomada em sessão já encerrada.

## Limites

O navegador usa a plataforma falsa e armazenamento local. A prova financeira usa os dois
bancos descartáveis e as rotas do Members em processo, não um deploy. Isso não substitui a
conferência autenticada entre serviços hospedados, celular físico, GPU real, teste prolongado
ou revisão integrada de todos os lotes. Os pedidos remunerados dos moradores são outra etapa
de L07 e não estão homologados por esta evidência.

## Regressão da confirmação compartilhada

O lote dos pedidos passou a preservar painéis durante a pausa transitória. R6 reproduziu
que a feira mantinha a confirmação antiga depois de comprar. O componente agora limpa essa
confirmação no resultado conhecido e pede uma nova escolha antes de outra compra.
`r7-adulto-celular` passou a sequência completa com saldo 74, três leites, um débito,
reabertura e ausência de erro. O painel permanece aberto, com a mensagem de entrega e sem
reutilizar o botão da compra anterior. Os testes do jogo passaram depois dessa correção.
