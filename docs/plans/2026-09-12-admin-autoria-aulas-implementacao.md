# Implementação da autoria de aulas no admin

Proposta aprovada em 12/09/2026: [proposta](2026-09-12-admin-autoria-aulas-proposta.md).

Revisão posterior: [full review, correções e compatibilidade dos 54 manifestos](2026-09-12-admin-autoria-aulas-full-review.md).

O professor cria principalmente do zero. Preservar os ajustes locais anteriores a esta implementação, os contratos de publicação/progresso e todos os tipos de conteúdo.

## Trabalho

- [x] Percurso recolhível, resumos, preferências por professor/aula e ações de organização.
- [x] Criação do zero, catálogo de conteúdos, estruturas opcionais e duplicação com vínculos explícitos.
- [x] Editor contextual amplo, áreas Seções/Materiais/Dados, revisão com atalhos.
- [x] Avanço legível, sugestões compatíveis, objetivos detalhados sob demanda.
- [x] Vídeo unificado, capa atual/escolhida, seleção no Vimeo e preservação de capa legada.
- [x] Upload ligado à aula, sem interrupção ao trocar ou recolher a seção.
- [x] Roteiro de demonstração com edição visual de ações e JSON preservado.
- [x] Testes de integridade, componentes, tipos, lint, build e conferência visual.

## Direção visual

Roteiro de trabalho do professor: resumos de conteúdo, projeto e avanço identificam cada seção. Usar os tokens e a tipografia existentes do admin, ciano para ação, verde para confirmação e âmbar para pendências. Superfícies do tema com bordas discretas, espaçamento em múltiplos de 4 px. Editor ocupa a largura útil; campos especializados abrem quando o professor escolhe configurá-los. Nenhuma sequência pedagógica obrigatória.

## Verificação

Executado em `packages/admin`, em 12/09/2026, após os ajustes finais:

| Comando | Resultado |
| --- | --- |
| `bun test` | 258 testes passaram, 0 falhas; 871 asserções, 64 arquivos. Fixtures isoladas verificam também transporte TUS e adapter Vimeo. |
| `bun run typecheck` | Passou, sem erros. |
| `bun run check` | Passou; 420 arquivos, sem alterações ou erros. |
| `bun run build` | Passou; Next.js compilou, verificou tipos e gerou 53 páginas estáticas. |
| `git diff --check -- packages/admin` | Passou. |

Testes novos cobrem cópias compartilhadas/independentes, identidades e referências de respostas,
metadados legados de vídeo, critérios compatíveis, limite de conteúdos e consistência de cada
operação ao mover um projeto para entrega. Componentes reais verificam criação do zero,
recolhimento, retomada, catálogo completo e edição visual das 14 missões nativas.

O ciclo real de registro/hook do upload foi exercitado com a fronteira TUS substituída:
iniciar transferência, trocar de editor, concluir upload e processamento, confirmar atualização
apenas no bloco original. Outro teste remove o bloco durante processamento e confirma que o
resultado tardio não o recria. A suíte existente de rascunho, conflito, critérios estruturais,
simulação, tipos de bloco e publicação também passou.

## Conferência no navegador

Ensaio local com o `LessonEditorClient` real e CSS do admin, serviços simulados em memória.
O servidor do ensaio verifica que cada bloco continua associado a exatamente uma seção ou
ao apoio depois de cada alteração. Nenhuma aula real foi modificada por esse ensaio.

- Aula com 12 seções; criar mais uma do zero, renomear, buscar Zappy, editar e salvar,
  recolher todas e recarregar preservando conteúdo e preferências.
- Abrir vídeo no editor amplo, visualizar capa atual, escolher imagem, conferir a prévia
  separada e aplicar; confirmação depende da leitura da capa aplicada.
- Criar estrutura com projeto novo; criar entrega selecionando esse projeto pelo nome e origem;
  conferir o workspace das seções anteriores e definir o envio como critério.
- Duplicar seção continuando o mesmo projeto; conferir conteúdo novo e workspace compartilhado.
- Criar seção de material; conferir livro/PDF e sugestão explícita de abrir ou baixar.
- Revisar pendências e usar o atalho que abre o editor de avanço da seção correta.
- Larguras 1366, 768 e 390 px, incluindo tema escuro, sem transbordamento horizontal.
  Capturas locais em `.cache/admin-autoria-*.png`; o contraste escuro foi conferido depois
  de concluir as transições de tema.

O ensaio é reproduzível com `bun run packages/admin/tests/visual/serve-lesson-authoring-preview.ts`
na raiz, usando somente `127.0.0.1:4413`. Ele não substitui o ambiente autenticado com integrações.

## Inventário preservado

| Conteúdo/configuração | Local após reorganização |
| --- | --- |
| Texto rico/HTML, imagem, áudio, Zappy/poses, quiz, HTML livre, certificado e Em breve | Catálogo e editor contextual; os respectivos formulários e construtores de conteúdo continuam disponíveis. |
| Livro 3D/PDF e referência ao Zappy | Editor do livro, mantendo o vínculo e a atualização do anexo pelo fluxo existente. |
| Estúdio/Pinta, projeto inicial, modos, ferramentas, cadeia, atividade e Mural | Editor contextual amplo; curadoria e opções avançadas preservadas. |
| Entrega pela galeria, mínimos/máximos | Editor da ferramenta, com escolha de trabalho dentro da aula ou na ferramenta completa. |
| Interações e versões anteriores, pistas, narração, missão e parâmetros | Editor da atividade; seleção da cena antes do roteiro. |
| Regras, contagens, parâmetros, encaixes, relações, variáveis/funções e simulação | Editor de avanço; cada objetivo abre seus detalhes. |
| Título, slug, duração e importação | Dados da aula. |
| Apoio e anexos | Materiais e anexos. |
| Autosave, recuperação, conflitos, publicação, despublicação, prévia e ensaio | Sessão e serviços atuais, com navegação reorganizada. |

## Limites e decisões

- A comunicação com uma conta real do Vimeo e uploads reais para Vimeo/R2 não foram executados.
  Contratos do provedor, guard de autorização, seleção, geração de capa e respostas foram
  conferidos com adapters reais e respostas controladas. A geração de capa usa o primeiro quadro;
  não promete recuperar uma imagem automática antiga que o provedor não disponibiliza.
- Trocar/recolher editores preserva os uploads enquanto a aula está aberta. Fechar/recarregar a aba
  durante transferência aciona a proteção do navegador; não há promessa de upload em segundo
  plano depois de fechar a aba.
- Não houve implantação, migração de conteúdo ou mudança nos critérios publicados dos alunos.
- Biblioteca pessoal de modelos entre aulas permanece como evolução posterior, conforme a proposta.
