# Lote 6.3 — Gestos de pontos, worker e autoria

18/11/2026 · continuidade de `5febdc33c` na staging. **Lote 6 aberto.** Este recorte entrega e verifica a API dos gestos e da autoria; os controles numéricos e a ligação com a aba Caminhos continuam pendentes.

## Implementado e revisado

- Criar, selecionar, mover, inserir e remover controles na cena, com mínimos de linha/polígono e limite de pontos. A captura reutiliza `CapturedPaintInput` do Molda; girar a câmera no vazio não acrescenta pontos. Escape, perda de foco, nova cabeça e segundo dedo cancelam o arraste. Delete respeita o mínimo e não compete com o atalho global de remoção de objetos.
- O arraste conserva o deslocamento entre o clique e a alça, inclusive para cabeceiras elevadas. A edição pode conservar a altura de referência da ponte. A seleção é destacada, e as alças usam o componente compartilhado com a água. Buffers são reaproveitados e o intervalo de desenho contém só os pontos ativos; não se substituem atributos GPU a cada movimento.
- Água e caminhos compartilham um único dono de prévia de terreno. Cancelar uma ferramenta não apaga a prévia da outra; respostas de uma cabeça antiga são recusadas. A ordem dos caminhos é conservada na prévia, preservando a precedência dos encontros.
- Preparação de caminho em worker cancelável, com transferência da cópia privada do campo. O terreno que está sendo desenhado permanece íntegro. A opção de editar sem repetir o molde conserva o campo de uma estrada existente quando só seu acabamento é alterado.
- Estrada e peças do campo entram juntas na fila, em uma revisão de histórico. O helper de autoria é compartilhado com a água e reutiliza a preparação de recursos do terreno. Falha de upload, resposta perdida, nova tentativa, cancelamento, troca de cabeça e reabertura foram testados.

Não há outro histórico, motor de pontos ou armazenamento. Não há revisões por quadro do arraste. O documento permanece intacto até a confirmação autoral, e Testar/retratos ficam bloqueados enquanto há edição aberta.

## Provas locais

| Verificação | Resultado |
|---|---|
| Núcleo | 274 testes / 10.203 asserções, sem falhas |
| Motor | 122 testes / 3.763 asserções, sem falhas |
| Oficina | 100 testes / 642 asserções, sem falhas |
| Tipagem núcleo, motor e oficina | aprovada |
| Build da oficina | aprovado; permanece o aviso de chunk acima de 500 kB |
| Workers já ligados à interface, no build | terreno, PNG 16 e água aprovados; três workers compilados |
| API de Caminhos no Chrome/Vite | criar, inserir, mover, Delete, Escape, órbita e segundo dedo passaram |
| Worker de Caminhos no Chrome/Vite | transferência, cancelamento e preservação do campo publicado passaram |
| Estrada no Palco e host de ensaio | uma estrada + uma peça em uma revisão; desfazer retornou a 10 m, refazer carregou 9,74960 m |
| Regressão de Água | quatro layouts, histórico, nível, rio, represa, cachoeira, cancelamento e reabertura sem erros |

O ensaio precisou ligar explicitamente `conteudoDoTerreno` do host ao Palco para recarregar o recurso após undo/redo; isso foi corrigido no próprio ensaio. Nenhuma falha de carregamento foi ignorada para fazê-lo passar.

[Alças](evidencias/lote6-pontos/pontos.png) · [Estrada guardada](evidencias/lote6-pontos/estrada.png) · [Gestos em vídeo](evidencias/lote6-pontos/gestos.webm) · [Resultados](evidencias/lote6-pontos/resultado.json).

As imagens e o vídeo exercitam a API pública do Palco em um laboratório sem interface. Não são evidência da nova aba Caminhos concluída nem de composição artística. O novo worker foi verificado pelo Vite; sua inclusão no build da interface será conferida quando a aba estiver ligada.

## Próxima frente exclusiva

Concluir a integração dos controles de pontos e da preparação com a oficina, incluindo coordenadas editáveis, direção/fechamento, modelo/material e avisos. Em seguida, revisar a aba Caminhos completa e executar 6.5. **Não fechar o lote 6 nem iniciar o 7 antes disso.**

Lotes 0–5 permanecem concluídos localmente; 7–10, composição final da Faísca, full review, CI e implantação/validação remota continuam pendentes. Não há aceite artístico ou homologação de aparelhos físicos neste recorte.
