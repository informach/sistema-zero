# Arrastar artes da biblioteca para o cenário

Recorte da etapa 4a, já autorizada na missão. Preservar componentes, paleta e
estilos da oficina. A biblioteca atual já possui miniaturas reais e inserção por
clique; falta arrasto com prévia e cancelamento. Não criar um segundo editor.

## Decisão

Usar Pointer Events com captura na miniatura, como os gestos existentes. O drag
nativo do HTML não cobre o toque de maneira equivalente; um modo separado de
carimbo por clique não satisfaz o arrasto pedido. A captura permite atravessar
a coluna e chegar ao palco sem uma camada global que intercepte os controles.

Extrair o cálculo atual de tamanho, offset, encaixe e inserção para um módulo
único, compartilhado pelo clique e pelo arrasto. A posição é local à camada,
incluindo deslocamentos herdados; documentos continuam no formato existente.
Reutilizar `MapObjectArtwork` para a prévia na escala do palco, inclusive conjuntos.

## Contrato do gesto

- Clique ou Enter/Espaço mantém a inserção atual.
- Movimento mínimo distingue clique de arrasto; um único ponteiro é dono.
- A prévia não altera documento, persistência nem histórico.
- Só aceitar a soltura dentro do papel e da parte visível do palco; grade é opcional.
- Gravar um objeto/instância, com um desfazer, somente na soltura válida.
- Bloqueio herdado, alvo ausente, mudança de documento/camada/arte, Escape,
  `pointercancel`, perda de captura ou saída da janela cancelam o gesto.
- Cancelamento não desfaz modificações externas adotadas durante o arrasto.
- Não converter conjunto vinculado em cópia independente ao arrastá-lo.
- Feedback curto e acessível; manter a busca, foco e miniaturas atuais.

## Verificação

Testes de geometria e orçamento; UI integrada com offset, grade, bloqueio,
ponteiro incorreto, cancelamento, histórico e recuperação; navegador com mouse e
toque nativo emulado. Conferir que a arte da prévia é real, o clique/teclado
continua útil e o documento reaberto conserva a instância.
