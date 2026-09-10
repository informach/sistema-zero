# Articulação na sessão de poses, lote 130

`SceneAnimationPoseGesture` usa união discriminada entre transformação direta e
dois ossos. A mesma publicação abastece viewport, controles de gravação, estado
pendente e erros. `beginTwoBone` devolve uma entrada revogável com sample/record/
cancel, vinculada ao dono exato; não consulta o dono atual para redirecionar input.
Campos de alcance pertencem ao snapshot da sessão, nunca ao documento.

Articulação sempre exige gravação explícita, mesmo com autokey das alças ativo.
Callbacks de alças não escrevem sobre articulação; cancelar permite voltar às
alças. O único commit usa o comando preparado e o mesmo histórico existente.
Tempo, clip, revisão, preview de preset, erro, desconexão e cancelamento revogam
a entrada. O contrato atual do player/viewport também revoga em miniatura/save
que substitui o documento: não prometer a tolerância COW do domínio na UI ainda.

## Revisão e RED/GREEN

1. Durante a remoção da prévia para gravar, um assinante podia iniciar outra pose
   na mesma revisão. Só conferir documento/clipe/tempo não distingue essas sessões.
   Um ticket de geração agora impede o commit antigo e não apaga a sessão nova.
   Remover a guarda fez dois testes falharem; restaurá-la fez ambos passarem.
2. Cancelar durante uma troca de seleção podia disparar seek com nenhum dono
   instalado. A captura seguinte ainda publicava o tempo anterior. Novo teste
   falhou com pose obsoleta; validar o contexto antes de instalar o dono corrigiu.

15 testes novos cobrem 120 amostras sem escrita/autosave, gravação explícita e um
undo/redo igual ao playback, nove interrupções, callbacks antigos, entradas
inválidas, no-op, alcance, exclusividade e reentrância. Os 13 testes anteriores da
sessão de alças continuam passando. Fixture de cadeia é compartilhada com o
domínio; não foi criada API de produção só para teste.

Integral: **1.597 testes, zero falhas, 235 arquivos, 90,05 s**. Tipos, Biome/702
e Vite/967 ms passaram. Kids: compilação/5,5 s, tipos/8,5 s, 59 páginas/817 ms,
exit 0. Diff check passou. Three mantém aviso de chunk >500 kB.

Ainda não há controle visível de articulação: o lote seguinte conectará a entrada
ao inspetor. Sem validação de GPU/browser/toque/crianças, limites de juntas ou bake.
