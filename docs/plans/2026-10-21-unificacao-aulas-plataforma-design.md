# Unificação das aulas e da linguagem da plataforma

Data: 21/10/2026. Estado: direção registrada; implementação ainda não iniciada.

## Decisão e objetivo

Manter uma única fonte editorial dos cursos para os públicos infantojuvenil e adulto. Cada aula terá o mesmo jogo, explicações, exemplos, passos e objetivos. A professora grava uma versão completa, que funciona sozinha. Na edição kids, trechos expressamente marcados podem ser substituídos pela mesma fala na voz da Debinha ou do Dedé. Isso permite ampliar a produção sem escrever e gravar dois cursos.

A comunidade kids e a adulta continuam existindo. Unificar conteúdo e linguagem não significa juntar contas, acesso, matrículas, progresso ou certificados.

O pedido desta sessão é planejar e registrar o trabalho. Nenhum curso foi migrado, roteiro existente reescrito, áudio gerado ou ambiente publicado por este registro.

## Fontes e continuidade

- [Plano de execução](../superpowers/plans/2026-10-21-unificacao-aulas-plataforma.md).
- [Contrato de voz, arquivos de fala e intervenções](../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).
- [Ponto de retomada](../continuity/2026-10-21-unificacao-aulas-plataforma/README.md).
- As regras pedagógicas de instrução completa permanecem em [Diretrizes pedagógicas](../aulas-interativas-tecnico/DIRETRIZES-PEDAGOGICAS.md).

Esta decisão substitui, como destino editorial, a exigência de linguagem infantil separada e de tradução adulta por trecho. Enquanto a migração não acontecer, os diretórios e geradores antigos continuam descrevendo o estado técnico existente. Não regenerar a versão adulta como estratégia futura de autoria.

## Requisitos confirmados pelo usuário

1. Unificar a linguagem das aulas e da plataforma, incluindo navegação, verificação, envio e conclusão.
2. Substituir as duas árvores `kids/` e `adulto/` por uma árvore única com as aulas, manifestos, roteiros e materiais.
3. Explicar de forma que uma criança iniciante consiga acompanhar, com tratamento respeitoso para pré-adolescentes, adolescentes e adultos.
4. Permitir humor e conversa natural. Usar analogias do cotidiano que os dois públicos entendam.
5. Escrever a fala com direção vocal detalhada para ElevenLabs v4, conforme a documentação indicada.
6. Entregar por aula um arquivo completo, copiável de uma vez, contendo somente falas, tags de áudio e pausas.
7. Usar pausas maiores entre partes para facilitar os cortes.
8. Conservar um roteiro de produção separado, com pouca informação extra e marcação explícita dos trechos substituíveis por Debinha ou Dedé.
9. Gravar a professora falando TUDO, inclusive as frases que receberão outra voz no kids. A edição adulta usa essa gravação integral; a kids substitui somente os intervalos marcados.
10. Entregar também as falas isoladas dos personagens para gravá-las sem procurar ou recortar texto dentro do roteiro de produção.

## Linguagem comum

O vocabulário de trabalho adotado para a implementação é:

| Conceito ou ação | Padrão comum |
| --- | --- |
| curso / aventura como agrupamento de aulas | Curso |
| aula / fase como unidade de ensino | Aula |
| seção / etapa / parte dentro da aula | Parte |
| navegação seguinte | Próxima parte |
| lista de partes | Partes da aula |
| conferir objetivos | Verificar esta parte |
| lista de objetivos | Objetivos desta parte |
| verificação aprovada | Objetivo cumprido! |
| enviar projeto | Enviar meu projeto |
| confirmar envio | Enviar |
| novo envio | Enviar de novo; confirmação Reenviar |
| envio concluído | Projeto enviado! |
| concluir | Concluir aula |
| material de consulta | Passo a passo do projeto |
| quem recebe e responde | A equipe |
| ajuda | Preciso de ajuda; Enviar para a equipe |
| certificado disponível | Baixar meu certificado |
| link público do jogo | Copiar link de jogar |

Os rótulos de certificado e publicação precisam ser aplicados aos controles reais nas duas telas antes de serem narrados. Estados de emissão e download continuam distintos. A tabela é o destino de linguagem, não uma afirmação de que esses botões já existem.

Fase continua disponível para um nível do jogo. Aventura pode nomear a história ou o tema do jogo. Etapa pode continuar no método ZERO/Pensa quando representar uma etapa real do método. Não fazer substituições globais dessas palavras em código, identificadores ou conteúdo dos jogos.

### Tom e clareza

- Usar você, a gente e eu conforme o papel da fala: ação de quem aprende, raciocínio conjunto e demonstração da professora.
- Preferir jogar, criar, montar, experimentar, testar e programar. Para a versão pronta de um jogo, usar jogar.
- Preferir blocos a bloquinhos. Explicar variável, evento, sprite e condição quando aparecerem pela primeira vez.
- Manter instruções completas, caminho da paleta, destino do encaixe, campo, valor e teste. Linguagem simples não permite omitir passos nem acelerar os gestos.
- Mostrar o resultado, explicar por que aconteceu e reconhecer a conquista concreta.
- Manter expressões naturais como Olha aqui, Tá vendo? e Sua vez. Evitar elogios repetidos, voz de bebê e diminutivos sistemáticos.
- Usar humor breve ligado ao jogo. Não transformar toda explicação em encenação ou inserir gírias para parecer adolescente.
- Escolher analogias como placar, campainha, porta com chave, folhas sobrepostas e situações visíveis no próprio jogo. Não pressupor dirigir, trabalhar, pagar contas ou conhecer uma brincadeira específica.
- Cada conceito novo mantém a experiência concreta antes da montagem, conforme a proposta do curso.

## Uma fonte, duas montagens de vídeo

A professora grava uma fala contínua e autossuficiente. As participações infantojuvenis são substituições editoriais da mesma fala, nunca uma segunda versão do conteúdo ou uma interrupção obrigatória para compreender a aula.

Exemplo aprovado na conversa:

> Talvez você esteja pensando: “No meu jogo ainda não funcionou.” Se aconteceu com você, volte aos blocos e confira estes três pontos…

Na versão adulta, tudo é dito pela professora. Na kids, somente `No meu jogo ainda não funcionou.` passa para a Debinha ou para o Dedé. A professora conserva a preparação e a continuação. O roteiro de produção identifica o personagem e as âncoras exatas. A fala da professora fica silenciada no intervalo substituído, sem apagar o áudio de origem.

Aplicar também a descobertas, observações e exemplos que funcionem nas duas vozes. Não introduzir respostas como “Isso mesmo, Debinha” no texto principal, pois o adulto não verá a personagem. Não alternar vozes no meio de um nome de bloco, campo, valor ou gesto obrigatório. Usar a mesma frase no trecho principal e no áudio do personagem; alterações exigem revisar ambas as ocorrências e as âncoras.

Escolher Debinha ou Dedé por aula e manter essa escolha consistente. Não impor quantidade de entradas. A identidade visual e a interpretação dos personagens devem acompanhar o público infantojuvenil.

## Organização final dos arquivos

```text
docs/aulas-interativas/
  README.md
  cade-todo-mundo/
    README.md
    modulos.md
    blocos.json
    projeto-final.szproject.json
    passo-a-passo-do-projeto.pdf
    cade-todo-mundo-aula-1.md
    cade-todo-mundo-aula-1.manifesto.json
    cade-todo-mundo-aula-1.roteiro.md
    cade-todo-mundo-aula-1.elevenlabs.txt
    cade-todo-mundo-aula-1.debinha.elevenlabs.txt
    cade-todo-mundo-aula-1.edicao.json
  desafio-primeiro-jogo/
  nave-contra-asteroides/
  corre-dino/
  o-jogo-do-meu-jeito/
```

Preservar os nomes-base atuais das aulas. O arquivo de personagem só existe quando houver intervenção dele. `edicao.json` é um índice gerado para conferir trechos e pausas; quem edita consulta a tabela legível no roteiro de produção. Não manter uma cópia adulta e outra kids da aula. Vídeos finais podem ter duas montagens, ambas associadas à mesma revisão editorial.

O `.roteiro.md` é o contrato de extração das falas com tags e das intervenções. Quando um gerador existente produz esse roteiro, a alteração editorial também precisa entrar na fonte do gerador; regenerar não pode desfazer a revisão. A cadeia fica fonte editorial do gerador → trio da aula → TXT e índice de edição. Os `.elevenlabs.txt` e o índice são derivados, para que corrigir uma frase não exija manutenção independente em três documentos. Nenhuma tag de voz deve aparecer em legendas, texto da página, quiz ou leitor do material.

## Impacto técnico identificado

| Área | Pontos existentes | Mudança prevista |
| --- | --- | --- |
| Copy compartilhada | `packages/member-shell/src/lib/lesson-copy.ts`, `lesson-copy-kids.ts`, contexto e componentes | Uma voz operacional comum, incluindo mensagens de pendência, erro e leitor de tela |
| Players | `packages/community/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx` e equivalente em `community-kids` | Mesmo rótulo e comportamento de conclusão |
| Quiz | `packages/member-shell/src/components/quiz-block.tsx`, `packages/community-kids/src/components/kids/kids-quiz.tsx` | Alinhar instruções e controles que a aula cita; preservar respostas, tentativas e metas |
| Estúdio/Pinta/publicação | componentes em `packages/member-shell/src/components/studio/` e `creator/`, apresentação kids | Alinhar envio, confirmação, resultado e cópia de link, conservando as permissões |
| Ajuda | `docs/como-fazer/`, `docs/como-fazer-adulto/` | Mesmo vocabulário e instruções para os fluxos compartilhados, preservando URLs e retorno |
| Autoria | `docs/aulas-interativas-tecnico/qa/caminhos.ts`, cinco geradores e recursos | Resolver uma raiz única e gerar um conteúdo comum |
| Guardas antigos | `qa/palavras-da-escola.ts`, `qa/vocabulario-crianca.test.ts`, `community-kids/tests/copy-vocabulario.test.ts` | Trocar a proibição de curso/aula por contratos positivos da linguagem comum, mantendo cobertura |
| Importação | `packages/admin/src/components/editor/lesson-manifest-import.tsx`, exportador e testes | Mesmo manifesto editorial, destinos explícitos e verificáveis por público |
| CI | `.github/workflows/ci.yml` e validadores | Validar 37 aulas únicas, arquivos de áudio e os dois destinos |

A varredura de implementação também precisa alcançar navegação, catálogo, jornada, materiais, certificados, ajuda, prévias do Admin, erros vindos do servidor e acessibilidade. O inventário de ocorrências é parte da execução; a tabela não limita o escopo aos botões principais.

## Publicação e preservação de dados

As duas ofertas atuais podem continuar como registros distintos no Admin. O conteúdo editorial fica único e o destino de importação escolhe o `courseSlug` correspondente. Não remover o sufixo `-adulto` de registros remotos por substituição textual.

Preservar `lessonSlug`, IDs reais de cursos, aulas, partes e blocos já publicados, projetos salvos, anexos, mídias, envios, respostas, certificados e conclusões. A revisão de linguagem não autoriza recriar aulas ou zerar progresso.

Uma diferença admitida no destino é a mídia: vídeo principal no adulto e montagem com substituições no kids. Ela deve ser um vínculo de publicação, com revisão e IDs explícitos, sem duplicar textos e regras do curso. Exportações específicas de destino são artefatos de publicação, não novas fontes editoriais.

Antes de retirar `kids/` e `adulto/`, conferir referências, reproduzir a geração, preservar o histórico no Git e migrar todos os consumidores. Os diretórios atuais continuam no lugar durante este planejamento.

## Sequência e aceite

1. Inventariar rótulos, fontes e correspondências de publicação.
2. Consolidar o vocabulário e alinhar os controles narrados nos dois públicos.
3. Implementar o contrato de roteiro, exportação de falas e intervenções.
4. Fazer a primeira aula do Cadê Todo Mundo? como piloto, com fala principal integral e substituições kids marcadas.
5. Conferir áudio v4, cortes, continuidade e compreensão com pessoas dos públicos previstos.
6. Migrar as cinco pastas de cursos e revisar as 37 aulas, com os materiais e tutoriais associados.
7. Conferir importação nos dois destinos, publicar gradualmente e verificar preservação do progresso.

O aceite exige uma árvore editorial única; uma linguagem operacional comum; arquivos de fala copiáveis integralmente; intervenções localizáveis por personagem e âncora; pausas de corte conferidas no áudio; os dois públicos concluindo o mesmo percurso; e nenhum dado anterior perdido.

O ensaio humano e a escuta são etapas próprias. Um validador pode conferir a correspondência dos textos, mas não comprova compreensão nem naturalidade da voz.
