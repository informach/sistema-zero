# Lote 6.3/6.4 — Autoria e interface de Caminhos

18/11/2026 · continuidade de `f7ad3bfcf` na staging. **6.3 e 6.4 implementados, testados e revisados localmente. Lote 6 permanece aberto até a revisão integral 6.5.**

## Entrega

A aba Caminhos oferece trilha, praça, estrada, cerca, muro e ponte no rail da oficina. Usa os controles, biblioteca, seletor de textura, cores e identidade visual do Molda. Os controles numéricos editam o mesmo descritor das alças da cena. Direção, fechamento, largura, alturas, módulos, medidas locais de encaixe e moldagem possuem unidades e limites explícitos.

Criar e editar são rascunhos canceláveis. A prévia prepara uma cópia privada do terreno em worker; guardar publica caminho, campo e referências escolhidas em uma revisão. Alterar somente o acabamento de uma estrada não repete seu corte. A lista permite selecionar, ocultar, trocar camada, copiar e remover; a colagem usa a área de transferência existente. Remover conserva o terreno moldado e a posição dos dependentes, com aviso e histórico.

Modelos e texturas podem ser escolhidos do catálogo sem inserir um objeto na cena. As referências transitórias são carregadas para a prévia e descartadas ao cancelar. A referência publicada não é sobrescrita nem duplicada quando a confirmação chega antes da limpeza do formulário. O encaixe inicial usa as medidas da peça, e o painel pede a conferência do piso real da ponte; não adivinha medidas por nome de arquivo.

Durante a edição, Testar, retratos e ferramentas concorrentes ficam protegidos. Capturar pontos pode fechar o painel em telas pequenas, preservando o formulário ao reabrir. O erro de uma montagem impede guardá-la como se estivesse pronta. Avisos do vão e das juntas permanecem distintos de falhas.

## Correções verificadas na revisão

- Restaurar a textura de um objeto preserva uma textura compartilhada com um caminho. O caso foi reproduzido e coberto no núcleo.
- Um encaixe de GLB fora das medidas reais rejeita a espera por recursos. Terreno ainda carregando é espera, não erro de geometria; esse caso tem teste próprio.
- O cancelamento de um preparo antigo não limpa a prévia de outro preparo. Água e caminhos continuam usando o mesmo contrato de posse.
- O campo controlado pela interface é conferido após sua atualização semântica no ensaio de arraste, sem pausas fixas nem instrumentação privada do Palco.

## Evidências locais

| Verificação | Resultado |
|---|---|
| Núcleo | 275 testes, 10.206 asserções, sem falhas |
| Motor | 124 testes, 3.774 asserções, sem falhas |
| Oficina | 101 testes, 647 asserções, sem falhas |
| Tipagem | núcleo, motor e oficina aprovados |
| Biome | 25 arquivos conferidos, sem problemas |
| Interface real no Chrome | seis variantes criadas/guardadas; alça arrastada com mouse sem revisão intermediária; cancelamento, histórico, visibilidade, copiar/colar/remover aprovados |
| Catálogo na interface | modelo e textura em uma revisão; cancelar não publica referências; nenhuma instância adicional; undo/redo aprovados |
| Layouts | 1.440/claro, 1.366/escuro, 1.024/claro, 390/escuro; prévia e salvamento sem overflow horizontal ou erros; painel reaberto em 390 px conserva valores |
| Workers do build | terreno, PNG 16, água e caminhos executados como arquivos JavaScript compilados, sem erros |
| Regressão de água | quatro layouts; histórico, rio, cachoeira, represa, nível, vazamento/cancelamento, falha/retomada, transferência e reabertura aprovados |

Os ensaios usam o host de laboratório e Chrome local. Não equivalem a implantação em staging nem a homologação de aparelhos físicos. O build mantém o aviso conhecido de chunk acima de 500 kB. A cena de seis ferramentas é laboratório técnico, **não composição artística da Faísca**.

[Catálogo na prévia](evidencias/lote6-interface/catalogo.png) · [Seis ferramentas](evidencias/lote6-interface/ferramentas.png) · [Celular emulado](evidencias/lote6-interface/390-dark.png) · [Layout escuro](evidencias/lote6-interface/1366-dark.png) · [Vídeo da interface](evidencias/lote6-interface/interface.webm) · [Resultados](evidencias/lote6-interface/resultado.json) · [Layouts](evidencias/lote6-interface/layouts.json) · [Workers compilados](evidencias/lote6-interface/workers.json).

## Próxima frente exclusiva

Executar 6.5: comparar os requisitos normativos e a issue 267, conferir os contatos dos dependentes em partes conformadas, reassentamento após moldagem, encontros e percursos do avatar, reentrada, recursos e regressões pertinentes. Fechar o lote 6 somente depois dessa revisão. Lotes 7–10, composição final da Faísca, full review, CI e implantação/validação em staging continuam pendentes.
