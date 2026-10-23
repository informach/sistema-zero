# Jornada adulta com etapas planejadas

Pedido aprovado: pré-carregar sete etapas sem inventar cursos nem liberar ferramentas
antes dos requisitos. A jornada de produção estava sem política; não havia curso adulto
da trilha publicado. O No Comando da IA foi retirado separadamente.

## Implementação

- A política admite etapa sem requisitos como planejamento. O projetor exige ao menos
  um curso vinculado para abrir ou concluir a etapa e para conceder capacidades.
- Uma lacuna impede novos avanços posteriores mesmo que o aluno já tenha feito um
  curso de uma etapa seguinte. Piso e ferramentas anteriormente conquistados permanecem.
- O seed inicial cria todas as sete etapas, relata as pendentes e conserva o insert-if-absent;
  nenhuma configuração existente do Admin é substituída automaticamente.
- Capacidades de IA podem ser planejadas sem curso; ao vincular cursos, a mesma validação
  exige um curso adulto avançado na etapa ou numa anterior.
- Admin permite planejar, adicionar e esvaziar etapas, mostrando que aguardam cursos.
  Progresso e página da etapa do adulto explicam o bloqueio, sem sugerir uma etapa zero.
- Não há migração SQL, alteração da jornada Kids, matrícula criada ou roteiro reescrito.

## Evidência local

- RED: 2 regressões do projetor e 9 do seed reproduziram os contratos anteriores.
- GREEN: Core + Members unit/HTTP, 43 testes/254 asserções, zero falhas.
  Inclui autenticação, política via PUT, leitura como aluno, recusa de ferramentas,
  privilégio Admin, ausência de cursos, cadeia com lacuna, piso e CAS concorrente.
- Admin: editor React real em processo isolado com API controlada. Mostra as sete
  etapas, permite planejar uma oitava e salva sem identificadores fictícios de curso.
  A verificação do título foi corrigida para ler o valor dos inputs, não textContent.
- Community: controles da jornada/continuidade, 15 testes/74 asserções.
- Biome e diff check dos arquivos alterados aprovados.

Implantação e conferência do seed real ainda devem ser registradas após o rollout.
