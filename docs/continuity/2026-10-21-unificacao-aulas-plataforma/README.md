# Retomada: unificação das aulas e da plataforma

Atualizado em 21/10/2026. Implementação, revisão e integração local concluídas na branch `feat/unificacao-aulas-plataforma`. O pull de `staging` foi concluído antes da implementação, em `32eb819b4f7746f586b21a5affa4c4098a324366`. Branch de entrega autorizada pelo usuário: `staging`, com commit, merge e push após as verificações. O histórico e o envio efetivo devem ser conferidos no Git (`git log` e comparação de HEAD com `origin/staging`). Não houve importação ou publicação remota de aulas nesta revisão.

## Ler nesta ordem

1. [Decisões e desenho](../../plans/2026-10-21-unificacao-aulas-plataforma-design.md).
2. [Contrato de voz](../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).
3. [Revisão integral](full-review.md) e [reaproveitamento do Cadê](reaproveitamento-cade.md).
4. [Plano e checklist](../../superpowers/plans/2026-10-21-unificacao-aulas-plataforma.md).
5. Fonte, proposta, manifesto e roteiro da aula em execução. Comandos atuais no [README técnico](../../aulas-interativas-tecnico/README.md).

## Decisões aprovadas que prevalecem

- Uma fonte por curso em `docs/aulas-interativas/<posto>/<curso>/`, comum a adultos e infantojuvenil. A explicação precisa ser compreensível para crianças e respeitosa para adolescentes e adultos.
- Vocabulário comum: Curso → Aula → Parte; Próxima parte; Verificar esta parte; Enviar meu projeto; Concluir aula; equipe; Passo a passo do projeto. Aplicar também em início, catálogo, trilhas, ajuda, acessibilidade, quizzes e materiais. Preservar nomes legítimos de fases do jogo e de recursos próprios.
- A professora grava a aula inteira, com conversa contínua. A versão adulta funciona sozinha.
- No kids, substituir somente a MESMA frase indicada pelo áudio e pela camada visual de Dedé ou Debinha. Silenciar apenas esse intervalo da professora; sem duas vozes, repetição ou resposta pelo nome no master.
- Exemplo aprovado: `Talvez você esteja pensando: “No meu jogo ainda não funcionou.” Se aconteceu com você, volte aos blocos…`. Só a frase citada é substituída.
- Roteiro de produção com notas de tela e tabela de trechos; TXT integral da professora pronto para copiar/colar; TXT de personagens quando presentes; JSON de edição derivado.
- Energia e variação de intenção nas falas e tags, adequadas ao momento. Condução envolvente, curiosidade, presença nos resultados, precisão nos gestos, confiança na correção. Evitar voz sempre calma e uniforme.
- `[long pause]` entre partes. Alvo de cerca de três segundos conferido/ajustado na edição. Sem SSML; direções dependem de ensaio na voz escolhida.
- Última orientação: Cadê é o único curso já gravado. A narração será revista/regravada, mas reaproveitar as animações existentes das cócegas/risada do Zappy e do placar de futebol nos dois públicos. Não há necessidade editorial de substituí-las. Ver análise vinculada acima.

## Implementação existente

- Cinco pastas canônicas, 37 aulas: Cadê 3; Farol 4; Nave 9; Dino 13; Meu Jeito 8. Árvores editoriais adultas e tradução por trecho retiradas do fluxo ativo; histórico conservado no Git.
- Cadê e Farol: a fala tem fonte no `.roteiro.md`. Nave, Dino e Meu Jeito: fonte em `qa/*.conteudo.json`. Sempre regenerar a partir da fonte.
- Exportador/parser com validação de trechos exatos e âncoras, pausas, ordem de clipes, tags e modo `--check`. Registro comum de tags em `qa/direcoes-voz.json` usado por TypeScript e Python.
- Escrita de artefatos em arquivo temporário irmão e troca atômica para evitar truncamento em falhas de sobrescrita no Windows.
- Copy comum no member-shell e aliases de compatibilidade. Prompts de tutoria/Pensa revisados sem instruções contraditórias para proibir curso/aula. IDs de bichinhos não devem ser traduzidos.
- Projeção segura de manifesto para o curso canônico ou seu correspondente adulto, validando a mesma aula. Integração no import do Admin preserva o modo de mídia. Nenhuma importação remota realizada.
- Cinco PDFs comuns `passo-a-passo-do-projeto.pdf` gerados, 164 páginas no total. PDFs antigos substituídos. A regeneração mais recente terminou com sucesso; conferir evidência visual/textual final.
- Os 37 TXT principais foram lidos integralmente. Foram retiradas fórmulas escritas, reações redundantes e falas artificiais; preservados passos e dúvidas concretas. Direção energética aplicada a todos.

## Verificações já obtidas nesta revisão

- QA editorial: 311 testes passaram, 0 falhas, 44.318 assertivas.
- 37 manifestos válidos; 203 clipes, 37 roteiros, 0 erros; exportador `--check` passou em todas as aulas.
- Copy/prompts comuns: 4 testes passaram. Admin import/export/sync/blocos: 16 passaram. Compartilhar no Studio: 12 passaram.
- Regressão focal de interface mais recente: 44 testes passaram, 0 falhas. Reaproveitamento do Cadê e contrato de voz: 18 testes passaram, 0 falhas.
- Typechecks finais de comunidade, kids e Admin passaram. As mesmas verificações passaram novamente sobre staging `8583a6e67`; resultados em `verificacao-integracao.json`.
- Os pipelines dos cinco PDFs concluíram as verificações de fontes, imagens, cores e limites. As 164 páginas finais foram renderizadas e conferidas por folhas de contato, com amostra de corpo em tamanho maior. Zero blocos fora da página e zero rótulos antigos. Registro em `pdfs-final.json`.
- Suíte completa kids: 1.596 testes passaram, 0 falhas, 9.101 assertivas. Comunidade adulta: 91 passaram, 0 falhas. Copy/prompts comuns: 4 passaram.
- Biome conferiu as fontes alteradas e a checagem geral `biome ci .` passou: 10.818 arquivos, sem erros. Há um aviso preexistente de `<img>` no editor do Admin; a informação de estilo no helper de roteiro foi corrigida. A CI geral também confere o JSON; índices de edição agora são formatados antes da comparação/escrita, sem mexer na fala. `git diff --check` passou.
- Auditoria de 145 fontes da plataforma: diferenças estruturais somente nos seis pontos previstos (copy comum, prompts, export de learning e import seguro).
- Preservação técnica das 37 aulas aprovada contra staging inicial; apenas rótulos de critérios mudaram, regras e valores iguais. Registro em `preservacao-final.json`.
- Reprodução: 240 arquivos, zero diferenças de conteúdo. Roteiros, TXT e índices iguais mantêm o horário; manifestos JSON podem receber nova data na formatação.

Logs locais em `.tmp/unificacao-*` são auxiliares ignorados pelo Git. Registrar abaixo os resultados finais, sem usar logs de outras frentes como evidência desta mudança.

## Integração e próximos passos

O usuário autorizou expressamente commit, merge em staging e push. O remoto avançou de `32eb819b4` para `8583a6e6724f7bc42542cf1300b59fae27496e3b`, com funil, e-mails do Desafio e Molda. Não havia arquivos em comum. A branch foi avançada e a revisão reaplicada sem conflitos. A única adaptação adicional ao remoto foi corrigir o comentário do seed do catálogo para a pasta editorial comum.

Backup local: branch `backup/unificacao-review-20261021-1717` e stash `c784a9a8bd1f35359ed9db6b74869342c0d4412e`. O stash guarda o review anterior à integração. Não reaplicá-lo sobre a entrega; só serve para recuperação. Conferir a branch atual e o estado no Git antes de retomar. O relatório de verificação identifica a base integrada e os comandos que passaram.

A entrega solicitada é a revisão integrada em `staging`, com push normal. O envio ao Git não representa importação/publicação das aulas ou aprovação dos áudios. CI/deploys automáticos seguem o fluxo do repositório; não foi feita implantação manual.

## Gravação já iniciada pelo usuário

O usuário informou que gerou o áudio da Aula 1 do Cadê às 17:02 e confirmou o trecho “Sabe quando alguém faz cócegas em você e você não consegue parar de rir? A cócega é a ação e a risada é a reação. No seu jogo, o toque é a ação.” É a fala atual. Pelo histórico desta execução, nenhuma fala, tag ou pausa do Cadê mudou após aquela exportação. A rodada das 17:11 regravou arquivos iguais; o áudio pode ser aproveitado inteiro. Registro e SHA atual em `gravacao-cade-confirmada.json`. Não houve escuta desse áudio pelo agente.

A etapa de produção continua separada: escuta, montagem das duas versões, sincronismo com as animações reaproveitadas, ensaio com iniciantes e publicação de conteúdo. Não marcar essas etapas como concluídas por passar testes locais.

## Limites do estado atual

O agente não gerou áudios pagos nem escutou ou editou áudio; a geração da Aula 1 pelo usuário está registrada acima; não houve publicação/import remoto nem navegação E2E em desktop/celular desta revisão. Os projetos e critérios existentes são preservados por contrato e testes; isso não substitui um ensaio real com os públicos. As gravações antigas do Cadê foram informadas pelo usuário; os arquivos de animação final não foram assistidos nesta revisão.

A limpeza de disco do começo da conversa é outra frente. Não retomar exclusões de caches nem handoffs de outros trabalhos como parte desta implementação.

## Conferência antes da entrega Git

Staging remoto reconferido em `8583a6e67`, sem novos commits durante a revisão final. QA editorial: 311 testes; Kids: 1.596; comunidade adulta: 91; Admin: 16; copy/prompts: 4; compartilhamento: 12, todos sem falhas. Typechecks dos três apps aprovados sobre a base integrada. CI geral e `git diff --check` aprovados. O arquivo de voz do Cadê mantém o SHA registrado e não exige nova geração.
