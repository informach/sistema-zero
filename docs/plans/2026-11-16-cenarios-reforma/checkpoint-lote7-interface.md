# Lote 7.4 — Interface de Jogo e Luz e céu

18/11/2026 · `staging` · continuação de [7.3](checkpoint-lote7-iluminacao.md). **Interface implementada, testada e revisada localmente. O lote 7 permanece aberto para 7.5.** Implantação e validação remotas continuam no encerramento global.

## Entrega

As abas Jogo e Luz e céu agora abrem ferramentas funcionais no rail e no inspector da oficina, mantendo os componentes, tokens, seis abas, gaveta e comportamento responsivo do Molda aprovado.

- Jogo: início principal/secundário, ponto, zonas em caixa/esfera/polígono, rota, câmera, régua, referência de altura e inspeção das colisões físicas. Nome, coordenadas em metros, giro, apoio no chão, associação e camada são editáveis. Criação por coordenadas e colocação por clique no cenário usam a captura compartilhada.
- Rotas e polígonos: mesmas alças e gestos de Caminhos, com modos mover/acrescentar/inserir/remover. A tabela local tem paginação; a zona conserva o plano da base. Régua e rota informam o comprimento pelo cálculo do núcleo. Polígonos não expõem um campo Y sem efeito.
- Câmeras: capturar a vista atual, conferir pela câmera e editar alvo/FOV. Testar permite início automático, início explícito visível ou centro da vista; o giro de entrada não é confundido com a frente do modelo. A referência de altura aproveita a altura do personagem selecionado/testado.
- Propriedades: editor comum de texto/número/booleano, validação e guarda conjunta. Uma edição local não é sobrescrita silenciosamente por propriedades atualizadas. O mesmo editor atende entidades selecionadas e o rascunho de marcador.
- Luz e céu: presets de hora e controles de sol, ambiente, cor/panorama, névoa e qualidade de sombras. Pontuais/focos usam os marcadores existentes, com cor, força, alcance, sombra, decaimento e direção/ângulo/penumbra quando aplicáveis. Parâmetros avançados ficam recolhidos.
- Panorama: seleção da biblioteca, importação de arquivo pelo decoder e contrato de Chãos e seleção do Molda pelo componente existente. Imagens incompatíveis com 2:1 não são oferecidas como panoramas válidos. Sem URL livre, coleção paralela ou alteração do GLB.

## Contratos preservados

`useRascunhoDeAmbiente` coordena os rascunhos de Jogo/Luz sobre a prévia do Palco e `guardarOperacaoComTerreno`, publicando pela fila única do controlador. Não há uma revisão por ajuste. Cancelamento restaura o cenário aceito; cabeça nova invalida o rascunho antigo. A captura de pontos distingue Caminhos/Jogo; a prévia distingue Jogo/Luz. Uma ferramenta inativa não encerra os recursos de outra.

Seleção, organização, duplicação, clipboard, exclusão e histórico continuam comuns. Marcadores colados permanecem selecionados. Transformações e operações que alteram a autoria ficam protegidas durante rascunhos; copiar o conteúdo **já guardado** continua permitido, como exige o fluxo de Água. Arrastes e respostas atrasadas de modelos/conjuntos não substituem um rascunho em andamento.

A inspeção mostra as mesmas fontes do Testar, sem novos colisores. O limite de 200 mil triângulos da inspeção continua explícito no motor; recusa não é apresentada como desenho parcial aprovado. As guias ficam fora do Testar e dos retratos. Geografia, narrativa, inventário e velocidades do Arquipélago não foram alterados.

## Verificações e evidências

| Verificação local | Resultado |
| --- | --- |
| Oficina, `bun test` | 110 testes, 735 verificações, zero falhas |
| Motor, `bun test` | 149 testes, 3.961 verificações, zero falhas |
| Tipagem oficina/motor | Aprovada |
| Biome dos arquivos alterados e novos | Aprovado |
| Build Vite da oficina | Aprovado; permanece o aviso de chunks maiores que 500 kB |
| Chrome, fluxo Jogo/Luz | Nove tipos de marcador e duas luzes criados, prévia sem revisão intermediária, uma revisão por guarda |
| Propriedades/cancelamento/clipboard | Guarda, duplicação, cópia/colagem, exclusão/undo e reabertura com histórico aprovados |
| Captura e Testar | Colocação pelo palco e entrada/retorno pelo centro aprovados; colocação de um ponto também conferida no ensaio de gestos do motor |
| Ambiente | Panorama de biblioteca e arquivo local, seletor Molda, giro, névoa, undo/redo e Testar aprovados |
| Layout | 1440/claro, 1366/escuro, 1024/claro e 390/escuro, sem transbordamento horizontal ou erros registrados; toque e reabertura do rascunho no painel sobreposto |
| Regressão Caminhos | Seis ferramentas, alças pelo mouse, cancelamento e histórico aprovados |
| Regressão Água | Mar, rio, cachoeira, represa, ilha seca, nível/leito, falha/retomada, reabertura e transferência; quatro larguras aprovadas |

Fontes reproduzíveis: `verificar-jogo-luz-oficina.mjs`, `verificar-jogo-luz-layout.mjs`, `verificar-marcadores-gestos.mjs`, `verificar-caminhos-oficina.mjs` e `verificar-agua-oficina.mjs`, no playground da oficina.

- [Resultado do fluxo](evidencias/lote7-interface/resultado.json), [layout](evidencias/lote7-interface/layout.json) e [regressão Água](evidencias/lote7-interface/regressao-agua.json).
- [Jogo no desktop](evidencias/lote7-interface/jogo-desktop.png), [Luz no tema escuro](evidencias/lote7-interface/luz-escuro.png), [Luz em 390 px](evidencias/lote7-interface/luz-toque.png) e [panorama em prévia](evidencias/lote7-interface/panorama-previa.png).
- [Vídeo do fluxo de autoria](evidencias/lote7-interface/oficina.mp4).

## Revisão e limites

A revisão encontrou e corrigiu chaves React duplicadas entre os componentes de pontos/propriedades, uma largura inadequada das linhas da lista e uma proteção excessiva que impedia “Copiar água guardada”. A regressão de Água foi repetida após restringir o bloqueio às operações que alteram autoria. Controles recolhidos mantêm seu estado; mensagens de erro ficam no inspector, sem exceções de evento não tratadas no editor de propriedades.

O ensaio usa o host em memória da oficina. A importação de arquivo percorre o decoder e a biblioteca reais desse host. O seletor Molda foi exercitado com **adaptador externo controlado**; isto não comprova uma chamada ao serviço remoto. Reabrir a oficina no mesmo host comprova histórico local do contrato; recarga autenticada/armazenamento de staging serão validados ao final. Toque é emulação, não teste em dispositivo físico. Os cenários das capturas são técnicos e não constituem aprovação artística da Faísca ou medição de desempenho do mundo povoado.

**Próxima frente exclusiva: 7.5**, conferência integral do plano/PDF, regressões de persistência/integrações, recursos e erros. Lotes 8–10, composição final da Faísca, full review, CI e implantação/validação de staging permanecem pendentes.
