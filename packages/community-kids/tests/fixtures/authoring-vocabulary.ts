/** Audited diagnostics, never child-facing labels. Keep file and complete literal exact. */
export const AUTHORING_VOCABULARY_EXCEPTIONS = [
  {
    arquivo: 'core/src/journey/kids-policy.ts',
    trechos: [
      'Posição fora da etapa.',
      'Configure cada etapa uma única vez.',
      'A revisão não pode preceder a entrada na etapa.',
      'Etapa repetida na concessão.',
      'A expansão exige entrada na mesma etapa.',
    ],
    motivo:
      'validação da política na autoria Admin; leitores Kids usam estado canônico, não mensagens do schema',
  },
  {
    arquivo: 'core/src/journey/kids-validation.ts',
    trechos: [
      'Escolha um curso Kids gravado.',
      'O curso de formatura é oferecido no topo e não pode ser requisito para chegar até ele.',
      'O curso não está publicado no catálogo.',
      'O curso depende de um posto que este avanço ainda não conquistou.',
      'Não foi possível conferir a vitrine do curso-base.',
      'O curso-base precisa de uma vitrine alcançável para abrir esta aventura.',
      'A regra exige um curso-base que não está disponível.',
      'Não foi possível conferir a vitrine do curso.',
      'O marco de publicação exige uma vitrine em aula publicada.',
      'Não há curso disponível para este requisito.',
    ],
    motivo:
      'Admin journey-editor exibe problemas do preview; metadados readiness na view Kids não são texto de tela (regressão no card/timeline)',
  },
  {
    arquivo: 'core/src/learning/studio-project-examples.ts',
    trechos: [
      'A aula excede o limite de exemplos ou partes.',
      'Os exemplos excedem 2 MiB de JSON na aula.',
      'A soma dos exemplos privados excede o limite permitido para esta aula.',
    ],
    motivo:
      'registro privado de autoria, lido por SectionProjectExamples e validação draft/import; projeção SQL do aluno remove projectExamples',
  },
  {
    arquivo: 'core/src/learning/lesson-project-examples-gate.ts',
    trechos: [
      'Converta o gabarito global antigo para exemplos por parte antes de guardar a aula.',
      'Exemplos pertencem a um Estúdio incorporado da aula.',
      'A aula com os exemplos excede 2 MiB no corpo de importação, incluindo projeto inicial e critérios. Reduza os snapshots antes de guardar.',
      'A aula não pôde ser preparada para transporte.',
    ],
    motivo:
      'gates de guardar/publicar/importar na autoria Members/Admin, não execução do projeto do aluno',
  },
  {
    arquivo: 'core/src/learning/authoring-manifest-projection.ts',
    trechos: [
      'Converta o gabarito global antes de copiar a aula.',
      'Duas peças da aula geraram a mesma chave de manifesto.',
      'Uma parte aponta para um bloco que não existe na aula.',
    ],
    motivo:
      'projeção de manifesto da autoria, usada por lesson-manifest-export e transporte de rascunhos',
  },
  {
    arquivo: 'core/src/learning/studio-project-example-change.ts',
    trechos: [
      'Escolha um Estúdio incorporado desta aula para os exemplos.',
      'Edite os exemplos por parte no rascunho da aula.',
    ],
    motivo:
      'comando de edição de exemplos privados por parte no rascunho Admin, sem caller no leitor Kids',
  },
  {
    arquivo: 'core/src/learning/legacy-studio-solutions.ts',
    trechos: [
      'O conteúdo da aula precisa ser dados JSON.',
      'A aula mistura gabarito global e exemplos por parte. Revise o conflito antes de converter.',
    ],
    motivo:
      'conversão explícita de gabarito antigo na autoria/migração, não instrução para o aluno',
  },
  {
    arquivo: 'studio/src/blockly/projectCheckAuthoring.ts',
    trechos: [
      'O projeto inicial ainda está sincronizando. Aguarde antes de comparar as ideias da solução com a base da aula.',
    ],
    motivo:
      'studioSectionCompletionIssues para revisão da solução privada em Admin/Members; não avaliador runtime da criança',
  },
  {
    arquivo: 'core/src/studio/publication-reservation.ts',
    trechos: ['Entrega divergente da reserva.'],
    motivo:
      'validação do deliveryId no protocolo interno de retirada; rota interna responde código genérico e mediaErrorResponse oculta detalhe em produção (teste próprio)',
  },
]
