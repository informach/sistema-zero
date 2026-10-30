# Orientação durante o final do Farol

Lote A04 da auditoria, iniciado em `9af68cb3e` e integrado à base `8c89b2565` antes do
fechamento. O final conserva acesso, história e recompensas. Na sala, o lembrete indica a
mesa da Íris. Durante a leitura e os fachos, a própria cena orienta. Lembretes de rotina,
mochila e tutorial ficam suspensos e voltam ao descer.

## Provas

O teste de desmontagem usa o componente e a loja reais, React em StrictMode e Happy DOM.
Antes da correção, a indicação `tela.cartao` ficava ligada após desmontar. Depois, a limpeza
retira apenas tela e guia 3D, mantendo a fala, a fila de dicas e o salvamento. Remontar recupera
o cartão. Os 28 testes dirigidos de primeiros passos e desmontagem passaram.

A inspeção do print de retomada revelou outro caso: `useRecado` renovava os sete segundos
de uma fala antiga ao remontar. O teste foi ampliado, falhou antes da correção e passou
depois. A loja marca `expiraEm` na emissão, fora do salvamento, e HUD/tutorial usam o mesmo
prazo. A prova avança o relógio em oito segundos, conserva a fala e a fila do tutorial,
recusa reapresentar o recado antigo e aceita um novo recado. O navegador repete a espera
de oito segundos com o menu aberto na sala e confere o cartão ao voltar.

O verificador do Farol foi ampliado para observar o DOM e o estado real da cena. Compara as
pendências antes e depois, percorre sala, página, fachos e menu, e repete a entrada com um
tutorial ainda aberto. Confere a mesma fala e a mesma marca local ao descer. O cenário de
tutorial aguarda o medidor e posiciona o corpo na porta, como preparação explícita do caso.
Não conclui tarefas para chegar ao final.

A versão adulta também entra e sai da sala nos dois tamanhos. A orientação nova não fala da
plataforma nem muda de sentido por público. O layout móvel usa uma coluna com 8 px de espaço
entre lembrete e botão; o texto pode quebrar a linha. A inspeção anterior mostrou os dois se
encostando e motivou esse ajuste. Há asserções para texto sem corte e separação do botão.

Uma repetição anterior, ainda antes da integração dos avatares da outra sessão, sinalizou
crescimento de texturas. O verificador agora grava cada medida antes de uma eventual falha,
preservando a evidência. Não foi ampliada a tolerância nem removida a prova de remontagem.

## Comandos

Na execução final integrada, computador e celular passaram o roteiro completo, sem erro de
página. Ambos conservaram 388 geometrias e 53 texturas nos quatro registros de aquecimento
e remontagens. A prova do tutorial e da pele adulta também passou nos dois tamanhos.
Os jogos independentes usam contextos próprios, isolando inclusive o diário IndexedDB;
a reabertura que testa persistência continua no mesmo contexto do jogo que a produziu.
Os prints da sala Kids/adulta foram inspecionados depois do ajuste de espaçamento.
Depois da correção do prazo dos recados, os cenários adicionais foram repetidos nos dois
tamanhos, com a espera real de oito segundos e sem recado vencido ao retomar. Os logs
`navegador.txt` e `recados.txt` distinguem as duas execuções.

No pacote do jogo:

```text
bun test tests/passos-desmontagem.test.ts tests/primeiros-passos.test.ts
bun --smol test --timeout 30000
NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit
bun build playground/verificar-final-farol-browser.ts --target=node --external playwright-core --outfile .cache/verificar-prioridade-farol.mjs
ARQUIPELAGO_PRINTS=<esta pasta> node .cache/verificar-prioridade-farol.mjs
```

O verificador completo inclui ainda falha de carregamento, bloqueio antes da Lenda, diário
persistido e três remontagens após aquecer. `ARQUIPELAGO_SO_PRIORIDADE=1` permite executar só
os cenários adicionais de tutorial e público adulto; não substitui a conferência completa.

## Limites

Chrome com SwiftShader, computador 1280 × 720 e celular emulado 390 × 844. No celular,
abrir a leitura usa o botão Usar; a caminhada até a mesa usa eventos de teclado dentro
da página, como no verificador anterior. Os prints não são uma qualificação de aparelho
físico, leitor de tela ou taxa de quadros. Nenhum banco remoto, arte ou push neste lote.

Resultado final: 1.308 testes aprovados, 1 ignorado (integração que exige Postgres local),
zero falhas e 175.370 asserções em 152 arquivos. Tipagem com teto de 8 GB e Biome nos nove
arquivos TS/TSX tocados aprovados. `git diff --check` aprovado. A revisão conferiu a limpeza
do tutorial, a propriedade do prazo dos recados, os controles preservados, os estilos móveis
e os casos do verificador. Nenhuma alteração de formato persistido ou pedido de arte.
