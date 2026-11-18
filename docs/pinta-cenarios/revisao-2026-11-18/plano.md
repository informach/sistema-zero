# Full review do Pinta — plano de execução

Base inicial: `567b93f95`, staging atualizada e limpa em 18/11/2026. Novo fetch durante
a revisão trouxe `42b395d93`, integrado sem conflitos; gates repetidos na árvore integrada.
Branch: `pinta-full-review-20261118`, worktree isolado.
Especificação de aceite: [R01–R33](../../../.compozy/tasks/pinta-full-review-20261118/_prd.md).

1. Auditar dados/segurança, editor/UX e integrações/exportadores, distinguindo código, teste
   e prova real; revisar as correções de 18/11 sem presumir que encerram a missão.
2. Reproduzir achados por severidade e corrigir a causa com teste que falha antes da correção.
   Conservar modelos, blocos antigos, bytes, perfil e histórico; nenhuma alteração de estilo.
3. Validar edição/reabertura, teste com personagem, envio e atualização no Studio usando
   fluxos públicos. Usar Playwright do repositório para regressões críticas e artefatos.
4. Abrir os pacotes atuais nos motores/ferramentas disponíveis. Conferir Tiled, Phaser,
   Pygame e Godot separadamente, registrando versão, comando e resultado; medir limites.
5. Confrontar os recursos profissionais restantes com a missão completa: não declarar
   automapping, projeção ou carregamento por chunks apenas por existirem campos ou cache.
6. Reexecutar gates dos pacotes atingidos, uma verificação pesada por vez. Publicar matriz
   de aceite com estados completos/parciais/pendentes e PR de revisão, sem merge/deploy.

Os nomes exatos de comandos, arquivos de regressão e correções serão registrados por achado
depois da reprodução. Qualquer dependência externa indisponível fica identificada como tal,
sem converter testes unitários em alegação de validação física/produção.
