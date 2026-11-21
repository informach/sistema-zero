# Histórico do projeto no Pro (proposta aprovada em 21/11/2026)

Seção 14 da missão ("histórico compreensível", "comparação de alterações", "recuperação de
versões"), com a regra de não apresentar o histórico interno como Git.

## Para a criança

A janela "Recuperar arquivos e materiais" virou o **Histórico do projeto**, no mesmo lugar (menu
Mais e Todas as ações). O texto do alto diz: "As versões ficam guardadas neste computador. Voltar
para uma versão guarda antes a de agora, então nada se perde." Cada linha tem a hora e o que
aconteceu:

- uma **versão** ("Você rodou o jogo", "Antes de o Zappy mudar o código", "Antes de: <operação>")
  com quantos arquivos mudaram desde a anterior, e os botões **Ver mudanças** (a mesma comparação
  lado a lado da revisão de operações, esta versão à esquerda e o projeto de agora à direita, um
  arquivo por vez) e **Voltar para esta versão**;
- uma **operação com arquivos** (trocar nome, mover, apagar, materiais), com o **Recuperar** de
  sempre.

## Como funciona

- **Quando guarda:** ao Rodar (quando o jogo passa a rodar, no máximo uma versão a cada 2 minutos),
  antes de cada operação com arquivos e antes de cada mudança do Zappy (as duas passam pelo ponto
  comum das aplicações, `applyProDocument`, que chama o registrador da instância). Versão igual à
  anterior não é guardada.
- **Onde:** no banco dos projetos deste navegador (`state/proProjectHistory.ts`): um índice por
  projeto e cada arquivo guardado uma vez pela impressão SHA-256. Ficam as últimas 50 versões ou
  até 20 MB por projeto; as mais antigas saem primeiro, com os arquivos que só elas usavam. O
  histórico sai junto quando o projeto é apagado, na mesma transação.
- **Só no Estúdio livre e com armazenamento local:** o recurso `StudioFeatures.projectHistory` é
  ligado por padrão e a aula o desliga (o rascunho da aula nunca é apagado, e as versões ficariam
  para sempre). Sem armazenamento local (Admin, persistência do host) não há "este computador".
  Só a área de trabalho do Pro registra quem guarda as versões (`useProHistory`); fora dela o banco
  não ganha leitura nenhuma.
- **Voltar:** a versão vira uma mudança da árvore inteira (`describeProTreeChange`) aplicada pelo
  mesmo caminho das operações: o ponto comum guarda a versão de agora antes, a volta entra no
  registro de operações (e pode ser recuperada) e o editor, a análise e a prévia acompanham. A volta
  herda o limite de 24 arquivos por operação (a recuperação inteira precisa caber); acima disso a
  janela pede para voltar antes a uma versão mais recente.
- **Fora das versões:** os materiais (imagens, sons, modelos); as operações com materiais seguem no
  registro, com o Recuperar.

## Revisão do lote 7 (21/11/2026)

- A versão de antes é guardada só quando a aplicação passou pelas recusas e vai mesmo acontecer
  (dentro do commit do `applyRevision`), com o gatilho certo: desfazer (`undoOf`) aparece como
  "Antes de desfazer", e a volta a uma versão como "Antes de voltar para a versão de…", com a data
  da versão de destino guardada como número e escrita só na tela (o nome da operação no registro
  usa data absoluta, "21/11 às 14:32", nunca "hoje").
- Uma falha ao gravar não vira mais rejeição sem dono no console.
- Apagar o projeto espera a gravação em voo e cerca as próximas: nada recria o histórico de um
  projeto apagado.
- Um índice de formato desconhecido (outra versão do Estúdio noutra aba) não é regravado, e uma
  entrada corrompida fica de fora da leitura.
- Trocar de projeto na mesma instância zera a lista, e o que chega de outro projeto é ignorado.
- Limitação conhecida: o "Abrir a versão em blocos" diz "A versão em blocos foi apagada" quando a
  cópia não está NESTE computador. Num computador novo, se o Pro for aberto direto pelo endereço
  antes de a lista descer da nuvem, a cópia pode existir só na nuvem.

## Testes

- `src/state/__tests__/proProjectHistory.cases.ts` (processo próprio): guardar, contar o que mudou,
  não repetir versão igual, uma versão de Rodar a cada 2 minutos, 50 versões com o arquivo igual
  guardado uma vez, o teto de 20 MB que nunca tira a versão nova e o histórico apagado com o
  projeto (vermelho com a ligação no `deleteProject` sabotada).
- `e2e/pro-workspace.spec.ts`, "the project history keeps the version before an operation…"
  (fixture com `?historico`, armazenamento local de verdade): trocar o nome de um arquivo, abrir o
  Histórico do projeto, comparar com agora e voltar (vermelho com a volta sabotada).
