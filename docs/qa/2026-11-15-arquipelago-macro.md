# Arquipélago macro: verificação local de 15/11/2026

Escopo: primeiro blockout da nova geografia. Não é entrega da campanha, decoração definitiva ou troca da cena integrada à plataforma. Direção: [design](../plans/2026-11-15-arquipelago-macro-design.md). Levantamento: [base estudada](../plans/2026-11-15-arquipelago-base-estudada.md).

## Ambiente e reprodução

Windows, Bun 1.3.11, Chrome local via Playwright. Desktop em 1280 × 800 e toque emulado em 390 × 844, `hasTouch` e ponteiro coarse. Servidor da sessão: `http://127.0.0.1:4529/macro`, com `AVATAR_QA_DIR` apontando para `output/morada-avatar-qa`. O arquivo de animações foi preparado a partir do commit aprovado do catálogo e conferido pelo digest esperado; nenhuma edição da biblioteca de arte em outra pasta foi importada.

Para reproduzir a partir de `packages/arquipelago`, definir `AVATAR_QA_DIR` e executar `bun run dev`, depois abrir `/macro` na porta informada. A cena monta Personagem, Camera, IrTocando e ControlesDeToque reais, sem substituir suas regras por teletransporte de teste.

## Evidência automatizada

- Suíte completa: `bun test`, 2.053 passaram, 1 pulado, 0 falhas, 256.911 verificações em 236 arquivos, 241,54 s. O teste pulado requer Postgres descartável configurado por `ARQUIPELAGO_TEMPO_TEST_DATABASE_URL`.
- Após os ajustes finais de desenho e interface: `bun test tests/geografia-macro.test.ts tests/macro-estado.test.ts`, 10 passaram, 0 falhas, 276 verificações. As regras incluem separação dos sete territórios, conversões locais/globais, âncoras, continuidade entre setores e entre níveis de detalhe, vizinhança de física, módulos e estados da ponte, retomada e rejeição de dados inválidos.
- `bun run typecheck`: terminou com código 0.
- `bun run build`: código 0; 188 arquivos, 48,28 MB, identificador `20261115150105`. Esse comando compila a entrada atual do produto; a entrada `/macro.js` foi adicionalmente compilada e executada pelo servidor do playground.
- Biome: 15 arquivos de código envolvidos, sem erros ou correções pendentes. `git diff --check`: sem erros; avisos de normalização CRLF/LF nos Markdown.

## Conferência funcional no navegador

1. Avatar visível na escala 1. Altura do catálogo arredondada no painel: 1,16 m. Perfil nativo: andar 0,9225 m/s, correr 2,21485 m/s, gravidade 9,81. O humor do sistema existente ainda pode multiplicar o deslocamento.
2. Ponte partida: andar para a frente na cabeceira para em aproximadamente z = −204,4 m. O vão não tem piso físico atravessável.
3. Reconstrução: acionada pelo botão de ensaio, avança por módulos. Pausar durante a construção por oito segundos não a conclui; retomar completa os oito segundos ativos. O comando não lê posto nem concede progresso narrativo.
4. Travessia de ida feita com Shift + W, da Faísca até o Bosque (aproximadamente z = −482,2 m). Altura contínua sobre a ponte e chegada em terra; mudança de setores sem queda.
5. Recarregar no Bosque retoma o mesmo ponto em chão seguro e mantém a ponte aberta. Estado local observado: ilha `bosque`, coordenadas locais próximas de x = −0,85 e z = 217,85.
6. Volta feita pelo controlador, usando S e depois C para recentrar a câmera e W para seguir. Chegada à Faísca em aproximadamente z = −191 m. A troca para instancing preservou posições, inclinações e colisores; o desenho e a entrada da ponte foram conferidos novamente após essa troca.
7. Clique no chão na Vila inicia caminhada: z = 60 → 56,67 m. Tecla D cancela a ida. Pulo: y = 13,28 → 14,02 → 13,28 m nas amostras do painel, com retorno ao mesmo piso.
8. Da Costa do Nico foi possível entrar no mar e nadar, sem atravessar o fundo: centro do corpo próximo de y = 0,17 m. O ensaio conserva o último ponto em terra para retomar.
9. Toque: eventos de toque reais do protocolo do navegador acionaram o joystick; z = 60 → 53,83 m. Pular, abrir/fechar mapa e os pontos de teste responderam. A caixa da conexão foi reposicionada para não cobrir Pular/Usar. O mapa ficou dentro do viewport (x = 20, largura = 362 em uma tela de 390 px).
10. Em contexto separado, estado local ilegível produz aviso em português e conserva o conteúdo inválido, sem sobrescrever silenciosamente. Recomeçar ensaio limpa somente a chave do ensaio, recarrega na Faísca e remove o aviso.
11. Console da página desktop: zero erros. Dois avisos de dependências: depreciação de THREE.Clock e assinatura de inicialização do Rapier.

## Desenho, descarregamento e desempenho

As amostras usam `renderer.info`, na cena provisória, sem os cenários detalhados dos packs. São observações locais, não certificação de capacidade de um aparelho.

| Local/amostra | Setores físicos | Chamadas | Triângulos | Geometrias | Quadros/s em repouso |
| --- | ---: | ---: | ---: | ---: | ---: |
| Faísca, volta à Vila após ciclos | 25 | 51–55 | 38.037–39.117 | 89 | 58–60 |
| Primeira ponte, próximo de z = −230 | 19 | 37 | 25.717 | 53 | 58–60 |
| Toque emulado, Vila | 25 | 44 | 25.937 | 48 | 60 |

Antes do agrupamento, uma amostra próxima da mesma cabeceira tinha 144 chamadas e 183 geometrias. Piso e grades agora usam duas malhas instanciadas por ponte; não houve alteração das regras nem dos colisores. Os ângulos/posições de todos os módulos continuam derivados de `modulosDaPonte`. A comparação das amostras não é um benchmark estatístico de FPS.

Três ciclos de cinco deslocamentos entre distritos, terminando na Vila, retornaram a 89 geometrias em todos os ciclos. Isso não mostra crescimento contínuo de geometria nesse percurso; não substitui um ensaio prolongado de memória com os packs completos.

Houve amostras isoladas de 1 quadro/s durante a automação com outras janelas/tarefas ativas. Forçar foco da página pelo protocolo e medir em primeiro plano voltou a produzir 58–60. Esses períodos não foram usados para certificar desempenho. Celular e Chromebook físicos continuam sem medição.

## Capturas revisadas

Arquivos locais de evidência, fora do git:

- [Faísca e avatar](../../output/macro-faisca-dia.png)
- [Ponte de dia](../../output/macro-ponte-dia.png) e [à noite](../../output/macro-ponte-noite.png)
- [Mapa](../../output/macro-mapa.png)
- [Toque](../../output/macro-toque.png) e [mapa no toque](../../output/macro-toque-mapa.png)
- [Estado ilegível](../../output/macro-erro.png)

As primeiras capturas identificaram um marco cobrindo o avatar, iluminação noturna insuficiente, mapa excedendo a largura e conexão sobre os botões de toque. Esses problemas foram corrigidos e as capturas finais revisadas. O painel técnico é uma ferramenta interna, sem substituir a identidade das interfaces adulta e Kids.

## Limites do marco

Geografia, relevo, costa, água e peças de ponte são provisórios. Ainda não há materiais finais, bairros, trilhas compostas, NPCs, Morada posicionada na nova Faísca, concessão real de Núcleo, integração do novo salvamento com a conta ou carregamento assíncrono de decoração por setor. Os setores desta entrega abrangem o terreno e sua física. A cena integrada à plataforma continua sendo a entrada existente; este marco é acessado por `/macro`.

Não foi criada migração ou compatibilidade com posições antigas. Não houve publicação, commit ou alteração de contas. A interface pode mudar de organização, fluxo e componentes, mantendo a identidade e o estilo atuais de cada público, conforme orientação da dona.
