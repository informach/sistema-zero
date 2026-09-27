# Revisão — autoria de Jogo pronto para jogar

## Entrega

O admin oferece Jogo pronto para jogar como terceiro tipo de atividade. Permite carregar um
projeto exportado, criar/editar uma cópia no Estúdio, aplicar/cancelar, configurar o palco e o
critério de conclusão e ensaiar a atividade real. Todos os campos do manifesto são editáveis.
Não altera o projeto inicial da criança nem acrescenta botões de jogabilidade ao jogo.

Novas atividades escrevem `completion: participation`. Manifestos sem o campo mantêm os alvos;
nenhum dos 34 manifestos foi modificado. Cadê Todo Mundo? continua cobrando os três achados.
O vídeo permanece um critério separado; a obrigatoriedade é definida no bloco e na seção.

## Achados corrigidos durante a revisão

- Avaliação por participação compartilhada entre core, autoenvio e reinício, evitando divergência.
- O carregamento do player não equivale a jogar. Eventos sintéticos de restauração, hover e
  navegação de foco não registram participação. A origem é explícita e o host verifica o iframe.
- Reinício também funciona em jogos clássicos sem grupo Jogo 2D: prontidão vem do documento final.
- Campos de alvos têm identidade local estável, sem perder foco ao editar seu identificador.
- Importação assíncrona usa o estado e o callback atuais, sem desfazer outra edição. Um teste
  reproduziu a perda das dimensões antes da correção e passou depois. Desmontagem invalida a operação.
- O import relativo de StudioEmbed permite reutilizar o formulário nos testes visuais do app
  infantil sem resolver o alias do admin no aplicativo errado.
- O teste de participação passou a copiar a atividade antes de modificá-la, evitando contaminar
  os testes do manifesto legado.

## Verificações

Comandos executados dentro de cada pacote quando indicado:

- Core: `bun test src/learning tests` — 885 passaram.
- Member-shell: `bun test` — 956 passaram.
- Members: testes `project-play-contract`, `learning-dto-conformance`, `lesson-draft-contract` —
  36 passaram, incluindo publicação, rascunho e rota HTTP tipada.
- Studio: `StudioProjectPlayer.test.tsx` e `inputBridge.test.ts` — 33 passaram.
- Admin: `learning-builder`, `scene-authoring-rules`, `project-play-authoring`,
  `project-play-editor`, `project-play-preview` — 30 passaram.
- `bun run typecheck` em core, members, member-shell, studio, admin e community-kids — passaram.
- `bun docs/aulas-interativas/qa/validar-manifestos.ts` — 34 válidos, nenhum aviso ou reprovação.
- Biome nos 20 arquivos TypeScript alterados e `git diff --check` — sem problemas.

Navegador real, usando os componentes reais em uma página local isolada:

- Importar Cadê Todo Mundo?, abrir no Estúdio, renomear e cancelar: nome original preservado.
- Reabrir, renomear e aplicar: nome novo no snapshot, sete recursos e estado dos blocos preservados.
- Configurar dimensões, alternar critérios e editar todos os campos de um alvo.
- Arquivo JSON inválido: erro legível, projeto anterior preservado.
- Prévia aberta não conclui. Comando real de teclado dentro do iframe registra a participação.
- Jogar de novo preserva a conclusão. Ampliar usa modal; Escape retorna e libera o restante da página.
- Largura de 390px: formulário empilhado, sem rolagem horizontal.

## Limites da verificação

Não houve publicação em banco, push ou deploy. O caminho HTTP foi coberto por testes; a inspeção
visual usou um harness local, não uma sessão autenticada do admin. A publicação real em staging
fica para a próxima autorização.

O DOM de testes não executa o jogo: há avisos conhecidos sobre iframe/JavaScript desabilitados,
sem falhas nos testes. No navegador houve mensagens opacas de rejeição de promessa durante a
automação e avisos de quadros atrasados enquanto rodavam múltiplas prévias e typechecks. Uma
repetição instrumentada de abrir/cancelar o Estúdio não registrou erros no host; não atribuímos
uma causa não comprovada a essas mensagens.

Projetos Pro não são suportados por este player e o limite do snapshot continua sendo 1.500.000
caracteres. O critério por alvos exige eventos de clique/toque em grupo Jogo 2D; não detecta
automaticamente a vitória de qualquer jogo.
