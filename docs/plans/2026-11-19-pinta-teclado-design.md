# Pinta: concluir ações por teclado e respostas de edição

Etapa 6 da missão. O usuário autorizou executar as etapas sem novas aprovações,
preservando identidade visual, curadoria, recuperação e limites. A interface é a
mesma oficina nos três níveis; não introduzir painel, tema ou editor alternativo.

## Diagnóstico

A lista de objetos e seus campos já permitem seleção e edição pelo teclado.
Criar um marcador vazio, porém, exige clicar no palco. A biblioteca permite
inserir arte por botão, mas não substitui a criação de um ponto sem arte.
Além disso, `commitIfChanged` declara sucesso mesmo quando o host recusa a
edição: `commit` não devolve resultado. Isso pode limpar uma seleção que não
foi apagada. A recuperação já recusa um documento de outra linhagem; seu
resultado também precisa chegar à ação que pediu a edição.

Opções consideradas: tornar todo o canvas uma grade de controles DOM causaria
um custo proporcional ao mapa; criar outra interface de teclado duplicaria a
autoria. A opção adotada é completar os controles atuais: botão de marcador
na lista existente, reaproveitando ponto de inserção, operações e campos.

## Implementação

1. O store informa sincronamente se aceitou o commit. As recusas continuam
   anteriores ao histórico/autosave. A guarda comum repassa esse resultado.
   Apagar não limpa seleção quando a edição é recusada.
2. O painel Objetos recebe ação opcional “Pôr um marcador”, com o mesmo Button,
   tokens, tamanho e foco existentes. Cria um ponto no local de inserção já
   compartilhado pela biblioteca/colar. Respeita offset herdado uma vez,
   grade opcional, camada trancada, limite, curadoria de `object-point` e host.
   Só seleciona o ponto realmente aceito. Não inventa comportamento de jogo.
3. Auditar o fluxo por Tab/Enter, campos, Esc, desfazer/refazer e reabertura;
   medir alcance dos controles em desktop, notebook e toque emulado. Preservar
   os gestos já qualificados e mostrar recursos avançados quando selecionados.

Não é certificação WCAG nem teste com crianças ou aparelhos físicos externos.
Referências: WCAG 2.2, critério Keyboard, e ARIA APG Toolbar; os botões existentes
continuam controles nativos. Navegação por setas de toolbar será avaliada pela
interação real, sem atribuir atalhos que capturem edição de campos.

## Aceite

Criar ponto, escolher papel/forma e editar nome/coordenadas/propriedades sem
ponteiro, um histórico por ação, foco visível e sem perder seleção por recusa.
Recuperação, curadoria e limite de aula não podem ser contornados pelo botão.
Testes de regressão do store e UI, ensaio nativo e gates dos pacotes afetados.
