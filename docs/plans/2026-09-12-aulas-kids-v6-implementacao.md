# Implementação das experiências v6

Referência: [proposta aprovada](2026-09-12-brilliant-experiencias-ricas-proposta-v6.md).

## Escopo autorizado

Implementar o runtime versionado, persistência confirmada, demonstração executável, palco de experimentação, comparações, autoria, evidência docente e catálogo de candidatos. Preservar atividades v1/v2 e alterações concorrentes. Não publicar nem converter aulas existentes automaticamente.

## Acompanhamento

- [x] Contrato v3, execução incremental, eventos, desfazer e checkpoints.
- [x] Segmentos idempotentes, concorrência e validação no servidor.
- [x] Demonstrações executáveis, com reprodução e sem manipulação pelo aluno.
- [x] Experimentações independentes, delimitadas pela missão e sem desafios extras.
- [x] Palco SVG, controles acessíveis, comparação e pistas contextuais.
- [x] Autoria, ensaio, evidências e candidatos de conteúdo.
- [x] Testes de comportamento, tipos, verificação visual local e documentação.

## Base verificada

A orientação posterior do usuário restringiu o escopo pedagógico: demonstrações não viram experimentações; o professor escolhe os blocos independentemente; cada experimentação termina no objetivo previsto. A implementação e os candidatos seguem essa orientação, detalhada no [guia de funcionamento](../aulas-interativas/como-funciona-v6.md).

Os 14 testes da exploração v2 passam em 12/09/2026. A v5 atual já corrige a dependência do tamanho dos quadros nas descobertas de população e placar. O relatório da pesquisa documenta a versão observada anteriormente; essas correções não serão duplicadas.

Gravações de áudio, observação com crianças/dispositivos físicos e publicação seguem etapas editoriais e operacionais posteriores. Renderizadores 3D/Pixi e tutor generativo continuam condicionados a evidência, conforme a proposta.

Os resultados e limites da verificação estão no [relatório do piloto v6](../aulas-interativas/qa/piloto-v6-2026-09-12.md). A execução dos testes com PostgreSQL permanece pendente por indisponibilidade de um banco descartável; os testes HTTP utilizaram repositórios em memória.

## Revisão posterior das 13 aulas, autorizada pelo usuário

- [x] Ler os roteiros originais das 13 gravações e mapear conceitos, cortes e correções de continuidade.
- [x] Refazer os 13 roteiros interativos, manifestos e mapas de montagem, com demonstrações e experimentos separados.
- [x] Acrescentar critérios de quantidade, ordem e conexões específicas no avaliador compartilhado, catálogo, APIs e formulário do professor.
- [x] Validar os programas finais independentes das 13 aulas, inclusive carregamento/salvamento no Blockly e geração de JavaScript.

O resultado editorial atual é o [guia completo do Corre Dino](../aulas-interativas/corre-dino-v6/README.md). Ele substitui a descrição anterior dos candidatos como simples preservação da sequência v5. A produção e vinculação dos vídeos continuam uma etapa de mídia: foram fornecidos roteiros, sem arquivos de gravação ou timecodes.

O [full review posterior](../aulas-interativas/qa/full-review-2026-09-12.md) acrescentou execução dos 13 projetos e corrigiu colisão, HUD, relações de ordem, divisão indevida de fórmulas, fidelidade da retomada e contratos de rascunho da API. A verificação inicial de sintaxe não demonstrava jogabilidade.
