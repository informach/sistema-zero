# Objetivos da parte na conta administrativa

Relato: aula 1 de Cadê Todo Mundo?, parte final do Estúdio, em staging. O roteiro
pedia “Verificar esta parte”, mas a conta administrativa não mostrava o botão.

## Causa e correção

A configuração publicada contém o objetivo `revelar-ao-toque`. A leitura privilegiada
da aula omite `sectionProgress` para não apresentar progresso de aluno ao administrador.
O player condicionava os objetivos à presença desse estado, embora a aula também traga
`structureRevision`, a revisão autoritativa publicada. Na conta de aluno o botão aparece.

O player passa a usar a revisão da estrutura quando não há progresso. Nenhuma revisão,
regra ou progresso fictício é criado; sem revisão conhecida, a ação permanece ausente.
O servidor recebe o projeto e usa os mesmos critérios publicados. Para ator privilegiado,
a operação é um ensaio: devolve resultados, sem gravar evidência, conclusão ou XP.
Contas de aluno conservam os gates, a persistência e a deduplicação das recompensas.
A classificação privilegiada continua vindo da identidade validada no servidor.

Não foram alterados roteiro, manifestação pedagógica, mídia ou projeto do aluno.

## Evidência

- Aula real de staging: publicado e rascunho têm o objetivo e o workspace correto.
  A conta de aluno autenticada exibiu “Objetivos desta parte” e o botão no Estúdio.
- RED do player completo em DOM isolado: botão ausente sem `sectionProgress`.
  GREEN após a revisão da estrutura; ausência de ambas as revisões continua bloqueada.
- RED do servidor: a chamada administrativa anteriormente concedia 30 XP.
  GREEN: retorna a avaliação, mas não cria progresso, evidência ou recompensa.
- Members: 61 testes/292 asserções, zero falhas, incluindo objetivos estruturais,
  execução, Python, revisões obsoletas e gates de partes futuras para alunos.
- Player e lifecycle da conferência: dois runners isolados aprovados.
- A implantação e o teste no navegador com conta administrativa devem ser registrados
  depois que a nova versão chegar ao staging.
