# Lote 3.4 — Pastas, camadas e seleção por área

17/11/2026 · staging · recorte implementado, testado e revisado. A parte 3.4 e o lote 3 permanecem abertos para a área de transferência e sua revisão integrada.

O botão Objetos e camadas abre o painel de organização no inspector existente. A árvore oferece pesquisa com acentos normalizados, pastas recolhíveis, nome, olho, cadeado, seleção, arrasto e controle explícito de destino. A lista virtual mantém no máximo 14 linhas no DOM; teclado e busca alcançam itens fora da janela. A interface usa os componentes, cores e estilos do Molda, com controles de pelo menos 44 px e painel recolhível no celular.

As camadas são dados autorais independentes das pastas. Podem ser criadas, renomeadas, atribuídas, ocultadas, trancadas e removidas com transferência explícita dos membros. Ocultação e cadeado acumulam os efeitos do objeto, da camada e das pastas ancestrais. Os painéis indicam estados herdados e desabilitam alterações que dependem de destrancar o pai.

As operações de organizar e remover árvores são intenções atômicas, com até 20.000 IDs de entrada. Selecionar uma pasta mantém seu contexto no controlador e escolhe seus objetos descendentes para composição; pastas vazias também podem ser selecionadas e apagadas. O índice de escrita acompanha grupos/camadas modificados e restaurações dentro do lote. Agrupar preserva os pivôs e as coordenadas; remover pasta inclui os descendentes e recusa filhos bloqueados e referências externas que ficariam quebradas, sem exclusão parcial.

Área e Laço reutilizam a captura de ponteiros limitada do Molda e a seleção de centros projetados. O traço é uma sobreposição de sessão; não grava dados nem cria revisão. Objetos ocultos, bloqueados ou fora dos planos de recorte são ignorados. Shift soma à seleção; o botão Somar também permite o fluxo por toque. Escape cancela, limpa a escolha e retorna ao ponto. As alças ficam desligadas durante a seleção por área e o fechamento libera a captura.

## Revisão e correções

- O alvo da árvore pertence ao controlador da oficina. Não há seleção paralela em um estado de React nem necessidade de conservar referência local para distinguir pastas de seus objetos.
- Uma área de soltar que aparecia durante o arrasto deslocava os destinos. A região Fora das pastas agora ocupa um lugar estável, sem mudar o ponto de chegada enquanto se arrasta.
- Modelos GLB compartilhados também respeitam os cadeados ao redefinir uma referência. A regressão demonstrou a brecha antes da correção e passou depois; a inversão abre e repõe os cadeados necessários para restaurar a definição.
- A ordem das listas continua sem significado no contrato do documento. Os testes de remoção conferem conteúdo, vínculos e transformações, sem impor uma ordem que o histórico não promete restaurar.
- Os nomes acessíveis dos seletores são explícitos, sem incluir o texto de todas as opções. A tela estreita usa o nome curto Área, com nome acessível Retângulo e atalho B.

## Verificação local

- Núcleo: 120 testes, 3.254 asserções; motor: 42 testes, 581 asserções; oficina: 45 testes, 304 asserções; nenhuma falha.
- Postgres 17 descartável em 55439: 21 testes, 157 asserções; camadas, cadeados, revisão recusada, JSONB e undo/redo após reabrir o serviço conferidos.
- Captura e ciclo de render do Molda: 8 testes, 37 asserções, incluindo limites do laço, segundo ponteiro, cancelamento, troca de ferramenta, encerramento e recuperação do contexto gráfico.
- Tipagem do núcleo, motor, oficina, Molda e Members aprovada. Build local da oficina aprovado, mantendo visível o aviso existente de chunk acima de 500 kB.
- Chrome para árvore/camadas: 1.440 claro/escuro, 1.024 claro e 390 escuro; grupos, pesquisa, recolher/abrir, renomear, camada herdada, ocultar/trancar, remover, agrupar/desagrupar, exclusão de pasta completa/vazia, recusa de ciclo, undo/redo, reentrada e mil objetos com janela limitada.
- Chrome para área/laço: claro/escuro e 390 px; projeção, seleção aditiva, ocultos e bloqueados ignorados, Escape, toque emulado e ausência de revisão autoral. Não é teste em aparelho físico.

## Evidências e reprodução

| Fluxo | Evidência |
| --- | --- |
| Árvore, claro | [1.440 px](evidencias/lote3-organizacao/arvore-light-1440.png) |
| Árvore, escuro | [390 px](evidencias/lote3-organizacao/arvore-dark-390.png) |
| Camadas | [Claro](evidencias/lote3-organizacao/camadas-light-1440.png) · [Escuro em 390 px](evidencias/lote3-organizacao/camadas-dark-390.png) |
| Busca na lista virtual | [1.024 px](evidencias/lote3-organizacao/busca-light-1024.png) |
| Seleção retangular | [Traço](evidencias/lote3-organizacao/retangulo-light-1440.png) |
| Laço | [Contorno](evidencias/lote3-organizacao/laco-light-1440.png) |
| Movimento | [Gravação do ensaio](evidencias/lote3-organizacao/selecao.webm) |
| Resultados | [Organização](evidencias/lote3-organizacao/organizacao.json) · [Seleção](evidencias/lote3-organizacao/selecao.json) |

Scripts: `verificar-arvore-camadas.mjs` e `verificar-selecao-area.mjs`, em `packages/molda-cenarios/playground/oficina`. Usam a oficina local na porta 4541 e formas autorais, sem arquivos privados de arte.

Faltam copiar, recortar e colar com fragmentos validados, preservação das referências, teste entre cenários do mesmo espaço, recusa entre espaços e regressão integrada de toda a parte 3.4. Ainda não iniciar 3.5 nem o lote 4. Implantação e validação em staging permanecem no encerramento global.
