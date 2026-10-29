# Mini estúdio dos Lumis, fase2-14

Objetivo: montar a rotina com Blockly na plataforma, prever sem alterar a ilha e devolver somente a rotina compacta já aceita pelo salvamento V10.

## Decisões e fronteiras

Confirmado pela dona: ferramenta somente em JavaScript/TypeScript, sem Python, seletor de linguagem ou edição livre de JavaScript. Os blocos representam o programa compacto da rotina.

- Ferramenta `rotina-lumi`, propósito `rotina`, molde e resultado com versão 1 e identificador da abertura. O molde contém espécie, rotina atual, quantidade de cartões das outras rotinas, resposta de `/cartas` e um mundo pequeno: canteiros, mochila, geladeira e indicação de que ela está posta. Sem conta, sessão ou salvamento inteiro.
- A plataforma relê `/cartas` ao abrir e ao guardar. O molde não concede direitos. Uma resposta indisponível não libera controles. Os cartões bloqueados continuam visíveis com os cursos de `aprendaEm` (onde aprender).
- O resultado devolve espécie, identificador da abertura e rotina validada por `RotinaSchema`. O jogo relê as conquistas e aplica `guardarRotina` sobre o salvamento atual, conferindo espécie, teto conjunto e alterações ocorridas durante a edição. Cancelamento ou falha preservam o rascunho do painel.
- Intérprete, validação e operações puras de horta ficam no contrato, sem React, three ou dependência do jogo. O jogo adapta seu salvamento para `MundoDaRotina`; a prévia usa uma cópia do mesmo mundo e as mesmas funções. A operação de guardar alimento na geladeira também é compartilhada, preservando a regra existente.
- O editor fica em uma entrada própria, sem usar projetos, cursos ou a paleta geral. (Revisão de 29/10/2026, com a dona: saiu do Studio para `member-shell/src/components/arquipelago-rotina/`, para o Studio não depender dos contratos do jogo; do Studio ele usa só o visual do Blockly, `@sistemazero/studio/blockly-theme`.) Reaproveita Blockly e o tema oficial da comunidade Kids, conforme pedido, incluindo tipografia, botões, cartões, foco e área dos blocos. Cada cartão tem seu bloco; o chapéu inicia uma única cadeia. Desconectados, controles vazios, cartões bloqueados e excesso de limites impedem guardar.
- No computador, blocos e prévia lado a lado. No celular, botões “Blocos” e “Prévia”, com ações acessíveis sem rolagem horizontal. A prévia representa canteiros, geladeira e Lumi com desenho leve, sem exigir arte nova, destaca o bloco executado e permite avançar, reiniciar e interromper.
- O painel atual continua como reserva e mantém “Testar”, “Da última vez” e a execução real. O novo botão abre a ferramenta por cima do jogo pausado. A mesma ponte atende Kids e adultos.

## Decisões em aberto para a dona

- Aparência futura da miniatura: nesta entrega, desenho esquemático legível da horta; não carregar outra cena 3D para prever uma sequência curta. Pode receber arte própria depois, sem mudar o contrato.
- Não alterar a classificação de “Contar mais um”: hoje é CONTROLE em `CARTAS_LUMI`, liberado por `sz_js_var_increment`. Mantém a régua atual, como solicitado.
- Não acrescentar editor livre de código nesta fase: o formato curto é o programa e os blocos são a autoria. Uma visualização textual pode ser acrescentada sem executar JavaScript.

Alternativas consideradas: importar o jogo no editor viola a fronteira; copiar o intérprete cria duas regras divergentes. Extrair o núcleo puro mantém uma única regra testável.

## Lotes e provas

- [x] Extrair núcleo e adaptador; testes existentes de rotina, horta, geladeira e teto V10 permanecem verdes; comparar prévia e execução real passo a passo.
- [x] Contrato versionado e recusas; testar molde inválido, resultado de outra abertura, rotina inválida, teto conjunto, cartão bloqueado e serviço fora.
- [x] Blockly e conversão bidirecional; todos os cartões, casos, condições, valores extremos, níveis e quantidade; bloquear peças soltas sem descarte silencioso.
- [x] Editor e ponte com carregamento sob demanda, cancelamento, descarte e releitura das conquistas. Plataforma falsa com a mesma validação e parâmetro de playground.
- [x] Navegador local: montar, prever sem mutação, guardar, voltar e testar no mundo; computador e celular emulado; guardar prints e comandos em `docs/qa`.
- [x] Revisão completa, testes e tipagem dos pacotes tocados, lint; documentos e README. Sincronização e envio pelo ramo staging, preservando alterações concorrentes.

Restrições: nenhum campo novo no salvamento, nenhum Blender/GLB, banco remoto, `.env` ou workflow. Textos da criança sem travessão ou exclamação. Testes de navegador exclusivamente locais. As provas executadas e os limites de validação estão em `docs/qa/2026-10-29-mini-estudio-lumis/README.md`.
