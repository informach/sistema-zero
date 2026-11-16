# Molda — Cenários 3D

## A oficina na plataforma (reforma em andamento, 16/11/2026)

A ferramenta está sendo refeita em lotes (plano aprovado em 16/11/2026). O que já existe no código:

- **Onde abre**: `/molda/cenarios` no Kids e na comunidade adulta. Quem pode abrir é o `members`
  que decide (`CENARIOS_MODO`: `desligado`, `equipe`, `lista` ou `aberto`); hoje, só a equipe. A
  página `/molda/cenarios` do Admin virou um atalho para ela.
- **Como se organiza**: espaço (o da conta, ou o da Equipe Sistema Zero) → bibliotecas de modelos
  (com licença: livre, própria ou restrita) → mundos → cenários. Tudo guardado na conta; os
  arquivos (`.glb`, retratos e capas) ficam no armazenamento, por conteúdo, dentro do espaço.
- **Pacotes**: `molda-cenarios-core` (`/v2`: documento, comandos em lote, desfazer), `molda-cenarios-motor`
  (palco 3D), `molda-cenarios` (`/oficina`: telas e o cliente HTTP), módulo `cenarios` do `members`,
  rotas `members-cenarios-*` no gateway e o BFF `/api/cenarios` do `member-shell`.
- **Ver sem a plataforma**: `bun run dev:oficina` em `packages/molda-cenarios` (porta 4541), com
  dados em memória.

### Agentes (CLI e MCP) na oficina nova

O agente usa as mesmas rotas e os mesmos comandos em lote da edição à mão, direto no servidor,
sem aba aberta. Acesso por variáveis de ambiente (nunca em arquivo do repositório):

```powershell
$env:MOLDA_CENARIOS_URL='https://<gateway do ambiente>'
$env:MOLDA_CENARIOS_EMAIL='<conta da equipe>'
$env:MOLDA_CENARIOS_SENHA='<senha>'
bun packages/molda-cenarios-agente/src/oficina/cli.ts espacos
bun packages/molda-cenarios-agente/src/oficina/cli.ts mundos <espaço>
bun packages/molda-cenarios-agente/src/oficina/cli.ts modelos <biblioteca> arvore
bun packages/molda-cenarios-agente/src/oficina/cli.ts cenario <cenário>
bun packages/molda-cenarios-agente/src/oficina/cli.ts editar <cenário> lote.json
```

`lote.json` é `{ "revisaoEsperada": 3, "comandos": [ ... ] }`, com os comandos do documento v2
(`modelo.definir`, `instancia.criar`, `instancia.atualizar`, `caminho.definir`, `agua.definir`,
`marcador.definir`, `base.definir`, `iluminacao.definir`, `cenario.renomear` e os `remover`). O
lote entra inteiro ou não entra; com a revisão vencida, a resposta traz `revisaoAtual`.

MCP por stdio: `bun packages/molda-cenarios-agente/src/oficina/mcp.ts` com as mesmas variáveis.
Ferramentas: `listar_espacos`, `listar_bibliotecas`, `buscar_modelos`, `listar_mundos`,
`criar_mundo`, `ligar_bibliotecas`, `listar_cenarios`, `criar_cenario`, `ler_cenario`,
`duplicar_cenario` e `editar_cenario` (o contrato da ferramenta traz o formato de cada comando).
Nenhuma ferramenta apaga. Captura de imagem e comandos de intenção (gerar terreno, espalhar,
encher de água) entram no lote dos agentes.

O resto deste documento descreve o **piloto** (o editor local preso ao Arquipélago), que continua
funcionando numa máquina com o ambiente local até o lote de limpeza.

## O piloto

Editor de composição do Arquipélago V2. A autoria é um documento versionado; a interface e os agentes usam os mesmos comandos. O teste executa o avatar, câmera, toque e Rapier do jogo, sem escrever progresso da plataforma.

## Abrir localmente

Na raiz do repositório, com dependências instaladas e Docker disponível:

```powershell
docker start sz-molda-cenarios-local
bun run dev:cenarios
```

Abra **http://127.0.0.1:4531**. O banco persistente local usa a porta 55438. O servidor do editor usa 4533; a interface, 4531. O serviço é loopback e gera uma sessão privada em `output/molda-cenarios/local-session.json`. Esse arquivo não deve ser versionado nem compartilhado.

Em uma máquina nova, crie o banco local uma vez:

```powershell
docker run -d --name sz-molda-cenarios-local -p 127.0.0.1:55438:5432 -v sz-molda-cenarios-local:/var/lib/postgresql/data -e POSTGRES_PASSWORD=cenario-local -e POSTGRES_DB=molda_cenarios_local postgres:17-alpine
bun install --frozen-lockfile
bun run arte:cenarios
bun run dev:cenarios
```

O preparo consulta o repositório privado `../artes-3d`, verifica o commit e os hashes e grava os GLBs incorporados em `output/molda-cenarios/acervo`. Não distribui os pacotes no Git. Os arquivos do avatar para o ensaio precisam estar em `output/morada-avatar-qa`, conforme o preparo nativo já existente. O catálogo contempla 3.218 modelos de 18 origens, incluindo Adventure Land, Reino, Templo, Winter, Western e Sweet Land. A escolha artística continua manual; disponibilidade no catálogo não equivale a adequação à Faísca.

Para o jogo local, em outro terminal:

```powershell
cd packages/arquipelago
$env:PORTA='4530'
$env:AVATAR_QA_DIR='C:\Users\tocha\projects\sistema-zero\output\morada-avatar-qa'
bun playground/servidor.ts
```

**http://127.0.0.1:4530/macro** abre a revisão selecionada por **Aplicar ao ensaio**. Recarregue a página depois de aplicar. Editar e testar no Molda não substituem automaticamente a revisão aplicada. **`/macro?referencia=1`** abre o protótipo anterior. Os endereços são locais ao computador que executa os servidores.

## Montar o cenário

1. Escolha um projeto ou crie uma cópia para estudar uma alternativa. Importar/exportar usa JSON validado, sem modelos incorporados.
2. Busque a peça por nome e coleção. Arraste sua miniatura para o chão ou clique para colocar no centro da vista. As medidas do catálogo estão em metros.
3. Selecione pelo viewport ou pela lista de objetos; Ctrl/Cmd permite seleção múltipla. Use os manipuladores, campos numéricos, encaixe e enquadramento. Q seleciona; W move; E gira; R altera escala uniforme; F enquadra; Ctrl/Cmd+Z desfaz; Ctrl/Cmd+Y refaz.
4. Escolha apoio no terreno, absoluto, em outra peça ou na água. O apoio no terreno considera o volume real; rotação e escala também afetam o encaixe. Colisões são configuradas no inspetor, usando as opções existentes.
5. Agrupe conjuntos para seleção e movimentação. Bloqueios e ocultação são herdados. Referências inválidas, ciclos e remoção de um suporte ainda utilizado são recusados.
6. Em Terreno, arraste para elevar/rebaixar, aplainar ou suavizar. Esc cancela. A grade é de 4 m e o pincel respeita esse limite. Cada passada é uma operação de desfazer.
7. Em Caminhos, edite pontos, largura, acabamento e tipo (trilha ou praça). Os pontos também são manipuláveis na cena. As curvas precisam caber nos módulos reais do acervo; um traçado impossível apresenta erro e pode ser desfeito.
8. Em Água, edite centro, nível, escala, giro, contorno de nado e recorte. A água de terreno tem bacia e profundidade editáveis; o lago de catálogo usa sua geometria real. A ponte importada acompanha o lago pelo apoio relativo. Trilhas de aproximação continuam sob controle do autor.
9. **Testar** usa o avatar nativo a 1,5/3,4 m/s. **Voltar à edição** preserva autoria e câmera de edição. A primeira ponte pode ser reconstruída apenas no ensaio; isso não instala Núcleo nem altera a campanha.
10. **Aplicar ao ensaio** seleciona exatamente a revisão salva atual. Outra pessoa alterando o projeto produz conflito de revisão, nunca sobrescrita silenciosa. Recuperação de falha de rede fica no IndexedDB e pode ser aberta como cópia.

A interface usa os componentes, tokens e fontes do Molda. As interfaces Kids e adulta não foram redesenhadas.

## Operação por agente

```powershell
$env:MOLDA_CENARIOS_SESSION_FILE='C:\Users\tocha\projects\sistema-zero\output\molda-cenarios\local-session.json'
bun packages/molda-cenarios-agente/src/cli.ts projetos
bun packages/molda-cenarios-agente/src/cli.ts sessoes
bun packages/molda-cenarios-agente/src/cli.ts catalogo <projeto-id> ponte
bun packages/molda-cenarios-agente/src/cli.ts executar <sessao-id> pedido.json captura.png
```

O rodapé identifica a sessão da aba. Escolha seu UUID na lista de sessões. Um pedido tem esta forma:

```json
{
  "id": "UUID-NOVO-DA-OPERACAO",
  "revisaoEsperada": 7,
  "acao": {
    "tipo": "selecionar",
    "ids": ["poco"]
  }
}
```

Outras ações: editar (lote de comandos), enquadrar, câmera, captura PNG, estado, ferramenta, vista, desfazer/refazer e testar/retornar. UUID e revisão são obrigatórios. Antes de repetir um pedido cujo resultado se perdeu, consulte a revisão. A mesma operação não é executada duas vezes. Gesto manual e teste impedem escrita incompatível. Capturas confirmam a revisão renderizada; não capturam durante um gesto.

MCP via stdio: execute `bun packages/molda-cenarios-agente/src/mcp.ts` com a mesma variável. Ferramentas: `listar_cenarios`, `ler_cenario`, `buscar_modelos`, `criar_copia`, `listar_sessoes`, `comandar_editor`, `aplicar_ao_ensaio`. Para serviço remoto, use `MOLDA_CENARIOS_URL` no gateway e `MOLDA_CENARIOS_TOKEN` administrativo; HTTPS é obrigatório fora do loopback. Não coloque tokens em documentos nem no Git.

## Plataforma e publicação

A rota administrativa é **`/molda/cenarios`**, restrita a administradores ativos. O gateway e o BFF têm uma lista explícita de operações. Projetos, revisões, catálogos, aplicações e sessões usam tabelas próprias no serviço Arquipélago. As migrações 0027–0029 devem ser executadas pelo processo de migração desse serviço, no ambiente escolhido pela equipe.

`bun run build:cenarios` gera o runtime independente em `packages/arquipelago/dist/cenarios`, com manifesto e nomes por hash. Publique esses arquivos no host de estáticos e configure **`CENARIOS_RUNTIME_URL`** no Admin com a URL da entrada indicada pelo manifesto, permitindo a origem do Admin no CORS. O host importa o runtime por URL; não incorpora o motor do jogo ao bundle da plataforma.

Os GLBs usam armazenamento R2 privado, identificados por SHA-256 e acessíveis após autenticação. Para publicar o acervo preparado, no pacote Admin: `bun --env-file=.env scripts/publicar-acervo-cenarios.ts ../../output/molda-cenarios/acervo/catalogo.json`. Depois registre o manifesto pelo endpoint administrativo `POST /api/molda-cenarios/catalogos` e importe o documento do estudo pelo editor. O upload é retomável por hash; o script verifica o conteúdo antes de enviar e lê uma amostra de volta.

**Situação desta entrega:** a publicação de arte retornou HTTP 403 com as credenciais disponíveis. O editor e os ensaios locais usam a arte privada preparada. O código da integração está versionado; ativação remota depende de corrigir essa permissão, publicar o runtime, registrar o catálogo e executar as migrações no ambiente remoto. Não foi realizado deploy da plataforma.

## Verificação e evidências

`bun run qa:cenarios` compila os helpers de QA e executa Chrome dedicado com o editor e o serviço reais. Cria uma cópia, aplica a receita em `scripts/molda-cenarios-composicao.ts` pelos comandos da sessão, compara câmeras, testa duas sessões, conflito, água/ponte, desfazer, avatar, recursos e reabertura. O teste altera apenas projetos de ensaio e seleciona seu estudo como revisão aplicada localmente. Para conferir `/macro`, pincel por mouse e toque emulado, execute depois `node packages/molda-cenarios/playground/verificar-macro.mjs`.

Resultados, capturas e documentos estão em [docs/qa/2026-11-16-molda-cenarios](qa/2026-11-16-molda-cenarios). A composição demonstrada é um estudo editável a partir das três imagens; não constitui aceite artístico final nem reprodução exata da pintura. Dispositivos físicos e publicação remota não foram aprovados por esses testes.
