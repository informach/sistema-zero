# QA compartilhado entre leitor e gravador

As duas correções de QA já verificadas no gravador foram aplicadas ao leitor.
O teste do passeio escolhe um destino determinístico; o diagnóstico de assets
aceita somente o aviso exato de modo leve previsto pelo runtime. Erros, avisos
de carregamento e mensagens adicionais continuam reprovando. Não há alteração
funcional nos motores nem mudança visual.

Na revisão integrada passaram 386 testes do Mundo 3D, os dois casos reais de
navegador GLB/HDR e classificação de diagnósticos, os tipos completos do Estúdio
e o lint do repositório. Zero skip, falha ou flaky nos dois casos de navegador.
A fonte de produção de Core/Pinta/Worker/Python permanece intacta. A nova CI
geral e o rollout continuam pendentes.

Também foram recuperados os logs históricos já indexados nos dois relatórios
originais, mas ignorados pela regra geral de Git. Os bytes foram conferidos
contra os hashes originais antes da cópia e preservados por atributo local.
`source.json` distingue essa recuperação dos ensaios novos.
