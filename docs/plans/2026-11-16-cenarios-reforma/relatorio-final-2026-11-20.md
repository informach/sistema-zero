# Molda Cenários: relatório da retomada (20/11/2026)

Retomei o trabalho que o Codex deixou parado no lote 8.5, revisei tudo o que ele fez, corrigi o que
estava errado e terminei os lotes 8.5 a 10. Em 20/11 a ferramenta está em staging no modo `equipe`
e foi conferida no navegador com a conta da equipe, no Kids e no adulto. Produção continua parada,
esperando a sua conferência.

## 1. O que está pronto

- Mundos, bibliotecas (trazer `.glb` e `.zip`, cópias dos modelos do Molda), cenários com relevo,
  água, caminhos e objetos, o Testar com personagem, versões com retrato, desfazer e refazer.
- Exportar para three.js, GLB e Raylib; levar o cenário para o Estúdio ("Usar o cenário");
  publicar no Arquipélago (provado localmente no `/macro`).
- Agentes de IA pelo MCP e pelo CLI, com os mesmos comandos da tela, inclusive trazer modelos do
  computador e exportar (guia em `docs/molda-cenarios-agentes.md`).
- Abertura pronta, sem ligar: exige o Molda, os mundos são da criança no Kids, cota configurável e
  as ferramentas seguem as faixas do Molda.
- O piloto antigo saiu de todos os serviços; as tabelas antigas nunca existiram em staging nem em
  produção (a leitura vazia ficou guardada no bucket privado).

## 2. O que estava errado e foi corrigido

**Do trabalho do Codex** (revisão completa, Etapas 1 a 6):

- O gateway nem subia em staging: as rotas de publicação pediam corpo de 34 MB, acima do teto
  de 9 MB. A publicação passou a mandar só hashes, e o Members lê o manifesto ele mesmo.
- O jogo podia esbarrar no limite de pedidos (um pedido por arquivo do cenário publicado): a
  leitura passou a ser em lote.
- Um arquivo em uso podia sumir (o BFF apagava arquivos sem uso depois da resposta): apagar agora
  tem carência e trava.
- O acervo licenciado e a publicação chegavam a perfis de criança de contas da equipe; uma
  biblioteca restrita podia ser criada fora do espaço da equipe. As duas coisas foram fechadas.
- O histórico e as versões publicadas cresciam sem limite; os mundos do Kids eram da família
  inteira; a abertura não conferia o Molda. Tudo corrigido.

**Da revisão final (20/11):** a falha ao conferir o Molda agora responde 424 (não derruba o
gateway); o histórico não carrega o documento inteiro; o "tamanho por igual" da faixa básica não
tropeça no arredondamento; o token do agente passa pela verificação completa da sessão; a captura
sem janela tem prazo em tudo e não deixa Chrome nem pasta temporária para trás.

**Achado na conferência em staging (20/11):**

- **Trazer modelos não funcionava** (parava em "Conferindo 0 de 1", sem erro). O Next troca
  `typeof window` por "object" em todo o código do cliente, inclusive no worker que converte os
  modelos; o three quebrava ao carregar dentro do worker. Corrigido, com teste que reproduz o build
  do Next. A cópia de modelos do Molda, que passa pelo mesmo worker, também voltou.
- **"Não guardei o retrato: Envie o retrato de novo"** ao reabrir um cenário: o BFF jogava fora a
  informação de que aquela versão já tinha retrato. Corrigido, com teste.
- **Botões dos avisos com o texto por cima da frase**: o CSS prendia todo botão em 32 px.
  Corrigido.
- **Nenhum cenário com relevo cabia no Estúdio** (limite de 48 malhas): o "juntar peças" não
  reduzia o relevo nem o mar. Agora junta os dois: as peças do relevo de cada região viram uma
  malha com um mapa único de textura, e o mar junta as faixas de mar aberto numa malha e os
  pedaços pintados junto à ilha por região. A "Praia" foi de 78 para dentro do limite; numa ilha
  com mar e 12 objetos, de 48 para 16 malhas. O desenho sai igual ao de antes (diferença máxima
  de 1 em 255). Junto, a beira de uma peça vizinha de célula vazia não escurece mais de longe.
- **O cenário não aparecia no Estúdio** com um programa sem laço ("Criar cena" e "Usar o
  cenário", sem "A cada quadro"): ele carregava, mas o Jogo 3D só redesenhava a tela num laço.
  Agora carregar um cenário liga o desenho de cada quadro. O Mundo 3D e o Avançado já tinham
  laço próprio.

**Desempenho** (medido num mundo grande, com a CPU 4× mais lenta simulando um aparelho modesto):

| Andar no Testar, aparelho modesto | Quadros por segundo |
|---|---|
| Antes | 6 |
| Colisão só com o que o passo alcança (antes testava a linha toda até o outro lado da ilha) | 33 |
| O painel do Testar parou de redesenhar a oficina inteira 10 vezes por segundo | 60 |

Com 4.699 objetos (1,6 milhão de triângulos): no computador comum, 60 quadros por segundo em tudo e
o palco pronto em 1,2 s; no aparelho modesto, abre em 10,8 s, girar a câmera dá 51 e andar dá 60.
A medição só deixa a CPU mais lenta; a placa de vídeo era dedicada.

## 3. Conferência em staging (20/11, Chrome logado, conta da equipe)

| Item | Resultado |
|---|---|
| Criar mundo e biblioteca | ok (na sessão de perfil do Kids, sem a licença restrita) |
| Trazer `.zip` com 5 modelos | ok, com retratos e contagem de triângulos |
| Relevo (modelo Ilha), mar, trilha | ok, cada um guardado |
| Objetos da biblioteca e cópia de um molde do Molda | ok |
| Testar com o personagem | ok (anda, câmera em terceira pessoa) |
| Recarregar a página | tudo continua lá |
| Exportar three.js, GLB e Raylib | os três pacotes ficam prontos (4,1 / 6,1 / 3,8 MiB) |
| Atalho "Cenários" no Molda | ok |
| Adulto: seletor de espaço com a equipe; mundo do perfil aparece na conta | ok |
| Sem login | 401 nos dois apps e no gateway |
| "Usar o cenário" no Estúdio | ok: a "Praia" cabe com "juntar peças" e aparece no jogo |
| Publicar a Faísca em staging | **pendente** (ver item 4) |

Fotos (fora do Git, em `output/cenarios-reforma/etapa7/`): a oficina em staging, e no playground
1440, 1024, celular e tema escuro. As medições de desempenho estão na mesma pasta.

## 4. O que fica pendente

**A Faísca publicada em staging e a prova do agente.** A Faísca convertida existe só localmente (a
publicação foi provada no `/macro`). O caminho para levá-la ao espaço da equipe em staging é o
próprio agente, que é também a prova que falta da Etapa 5. Para isso, crie fora do repositório as
variáveis `MOLDA_CENARIOS_APP` (o endereço da comunidade adulta de staging) e
`MOLDA_CENARIOS_EMAIL` / `MOLDA_CENARIOS_SENHA` de uma conta da equipe (ou um
`MOLDA_CENARIOS_TOKEN`). Eu não digito senha.

**O agente agora também traz modelos e exporta** (`trazer_modelos` e `exportar_cenario`), pelo
mesmo código da oficina, num Chrome sem tela neste computador. Provado localmente com o Chrome de
verdade: 3 GLB e um ZIP com 5 modelos trazidos, uma ilha montada com eles e os três pacotes
exportados. Publicar no Arquipélago continua só pela tela, por decisão sua.

**Outros limites:**

- A medição num aparelho físico modesto (com vídeo integrado) não foi feita.
- O mar fica mais claro no quadrado do relevo e mais escuro fora dele, com uma linha reta onde o
  relevo acaba. Já era assim na oficina (a profundidade sai do relevo, e fora dele o fundo é
  tratado como mar aberto). É acabamento para depois, se você quiser.
- Conta comum recebendo 404 com login: coberto pelos testes do Members; não havia sessão de conta
  comum no navegador para conferir.
- A biblioteca inicial livre ficou para depois, por decisão sua.
- A reconstrução artística da Faísca é um trabalho separado.
- Ficaram dados de teste em staging na sua conta: o mundo "Ilha da conferência", a biblioteca
  "Peças da ilha" e o projeto do Estúdio "Teste cenario". Apago quando você quiser.

**Produção**, depois da sua conferência: criar `CENARIOS_MODO=equipe` no Railway de produção (e
então em `.railway/variables.ts`), PR de staging para main e o `deploy-production.yml`.

## 5. Notas técnicas

- **Divisão das faixas** (minha, a especificação só dizia básico × resto), nas mesmas três faixas
  do Molda:
  - **básico:** elevar, abaixar, aplainar e suavizar; pintar o chão; relevo pronto; mar e lago;
    pôr, mover, girar, tamanho por igual, copiar e apagar; espalhar; trilha e praça; início do
    personagem e marcadores; hora do dia, céu e névoa;
  - **intermediário:** rampa, platô, morro, cratera e ruído; mais camadas de chão; rio, represa e
    cachoeira; tamanho por eixo, espelho, alinhar e repetir; conjuntos; blocos de rascunho; cor e
    textura de cada objeto; estrada, cerca, muro e ponte; curvas suaves; zonas e rotas; sol e luz
    ambiente;
  - **profissional:** erosão; buracos e cavernas; tamanho e resolução do relevo; aparência da
    água; colisão de cada objeto; propriedades personalizadas; câmeras; luzes e sombra.

  A tabela está em `packages/molda-cenarios-core/src/v2/faixas.ts`.
- **Branch da aula 7:** em 20/11 o members, o gateway e o admin de staging rodavam uma branch da
  aula 7 que não tinha o trabalho do Codex. A análise mostrou que ela não traz código de serviço
  além de testes e documentação, então implantar a staging não desfez nada da aula 7.
- **Build de staging quebrado por outra frente:** por algumas horas os três apps não subiam por um
  erro de tipo no Estúdio (da sessão do Estúdio). Avisei, ela corrigiu (`f20ef6e95`).
- Commits desta etapa em `origin/staging`: `d5a5f14a5` a `ad45276fa`; depois do relatório,
  `5a444c6a2` (relevo no juntar), `f7aaa264f` (mar no juntar), `52a522168` (o cenário aparece no
  Estúdio sem laço) e `b327ea7d1` (o agente traz modelos e exporta).
