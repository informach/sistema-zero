# Arquipélago Vagalume

Jogo 3D independente das comunidades Kids e adulta. A integração com a plataforma usa os contratos de `@sistemazero/arquipelago-contracts`; acesso, salvamento e tempo são atendidos por `@sistemazero/arquipelago-api`.

A casa, o quarto e a construção usam a biblioteca Morada e uma única casa da plataforma, com revisão e recuperação de conflitos. Casa/Construir e os portais abrem a cena nativa em escala 1; as ilhas mantêm sua física atual durante a transição. Pinta/Molda, projetos, coleções, horta e progresso continuam no jogo. Detalhes e limites de projeção da autoria estão em [CLAUDE.md](./CLAUDE.md).

No Kids, o responsável define o limite diário de tempo livre. Os segundos ativos são guardados por perfil e enviados em eventos idempotentes. Uma falha de envio pausa o jogo para permitir a recuperação. Na comunidade adulta não há limite diário. O dia usa o relógio do aparelho; essa confiança deve ser avaliada na validação de produção.

Para executar: `bun run dev`. Para verificar: `bun test`, `bun run typecheck` e `bun run test:tempo-browser` (Chrome instalado). O teste `tests/tempo-api.integration.test.ts` também requer `ARQUIPELAGO_TEMPO_TEST_DATABASE_URL` para um Postgres local descartável com nome começando por `arquipelago_test` e migrações já aplicadas; ele é pulado sem essa variável.

A arquitetura e os comandos completos estão em [CLAUDE.md](./CLAUDE.md); os padrões do jogo estão em [PADROES.md](./PADROES.md).

O primeiro blockout da nova geografia fica em `/macro` no mesmo servidor: sete territórios, avatar nativo, setores de 80 m e ponte Faísca–Bosque reconstruível. No PowerShell, execute `$env:AVATAR_QA_DIR='C:/caminho/do/avatar-exportado'; bun run dev` e abra `http://127.0.0.1:4520/macro` (ou a porta definida em `PORTA`). A pasta deve conter os arquivos do catálogo aprovado, inclusive `base/animacoes-do-jogo.<digest>.glb`; sem o pack o servidor entrega uma cena sem avatar. O painel de medidas permite ir aos seis distritos e às cabeceiras. WASD, Shift, Espaço e os controles de toque usam o controlador real.

O marco técnico inicial, recuperável no checkpoint `4f73b5370`, usava a chave local `arquipelago:macro:ensaio`, terrenos e água provisórios, sem decoração dos packs nem progresso de campanha. A identidade visual das interfaces adulta e Kids será preservada; fluxos e componentes poderão ser adaptados ao novo jogo. Direção e limites desse marco estão em [geografia macro](../../docs/plans/2026-11-15-arquipelago-macro-design.md).

O marco seguinte da Faísca usa a mesma rota `/macro`, com seis distritos, caminhos, mapa local e região piloto. Prepare os modelos privados com `bun scripts/exportar-arte-faisca.ts 7816a7aca0ba6f7d93a90fe4c15f40638b01525f`: a exportação lê o Git da arte e grava a seleção em `output/faisca-arte`, fora do versionamento. O manifesto fixa origem/dimensões/digest. Reinicie o playground após atualizar o manifesto. `ARQUIPELAGO_ARTE_REPO` pode apontar para outra cópia do repositório privado.

O perfil padrão do ensaio agora é Exploração (1,5/3,4 m/s). `?ritmo=referencia` permite comparar a velocidade anterior; `?ritmo=agil`, um perfil mais rápido em estudo. A escala do personagem continua 1. O painel mede percursos reais; o mapa permite voltar a marcos descobertos. O ensaio deste layout usa `arquipelago:faisca:ensaio`, sem migração da chave anterior ou de contas. O lote da Morada está reservado e a coelha é um estudo da Íris, sem acessórios definitivos. A conversa usa o estilo existente dos moradores.

Verificação local com o servidor e os arquivos preparados: `node playground/verificar-faisca-browser.mjs` (ritmo), `node playground/verificar-faisca-mundo-browser.mjs` (modelos, conversa, ponte e descarga) e `node playground/verificar-faisca-toque-browser.mjs` (toque e falha de arte). Defina `ARQUIPELAGO_QA_URL` para a porta em uso; o padrão desses verificadores é `http://127.0.0.1:4530`. Eles usam Chrome instalado e controles reais. Toque emulado não certifica aparelhos físicos.
