# Arquipélago macro: geografia, avatar e ponte

> Execução em etapas na sessão atual, com a skill executing-plans. Conferir cada entrega antes de passar à seguinte.

**Goal:** produzir o primeiro blockout navegável da nova geografia.

**Architecture:** dados geográficos puros, terreno amostrado por setores e ponte modular. Reutilizar Personagem, Camera e ControlesDeToque; as medições e comandos de ensaio pertencem ao playground.

**Tech Stack:** TypeScript, Bun, React Three Fiber, Three.js, Rapier e Zustand já instalados.

**Spec:** docs/plans/2026-11-15-arquipelago-macro-design.md

## Restrições

- Escala do avatar: 1. Setor inicial: 80 m. Ponte inicial: 5 m de largura.
- Não implementar migração nem compatibilidade de contas.
- Não importar arte privada da pasta de trabalho de outra sessão; usar catálogo aprovado e arquivos já exportados.
- Não conceder progresso narrativo a partir dos comandos do blockout.
- Não copiar controlador, câmera ou integrações.
- A interface do jogo pode mudar para atender à nova aventura, preservando identidade e estilo visuais atuais do adulto e do Kids. As ferramentas internas de medição não são o HUD final.

## 1. Geografia e regras

Arquivos: src/sistemas/geografia-do-arquipelago.ts, src/sistemas/setores-do-arquipelago.ts, src/sistemas/ponte-do-arquipelago.ts; testes correspondentes em tests.

Interfaces: IlhaDoArquipelago, PontoDoTerritorio, paraGlobal, paraLocal, alturaDoTerritorio, conexaoDaIlha; setoresPerto e malhaDoSetor; estadoDaPonte e modulosDaPonte.

- [x] Testar contornos sem sobreposição, conversões inversas, costa/ponte conectadas, bordas iguais de setores e abertura independente de posto.
- [x] Executar os testes antes da implementação e conferir a falha por módulos ausentes.
- [x] Implementar funções puras e conferir as invariantes.

## 2. Mundo navegável

Arquivos: src/mundo/macro/terrenos.tsx, ponte.tsx, oceano.tsx; playground/arquipelago-macro.tsx e playground/servidor.ts.

- [x] Desenhar as sete silhuetas e os setores próximos, com altura comum entre visual e física.
- [x] Montar módulos de ponte sem colisão no vão até completar a reconstrução.
- [x] Usar Personagem e Camera com ponto de partida e altura do chão fornecidos pela cena.
- [x] Acrescentar seleção do perfil macro antes da carga dos módulos e rota do playground.

## 3. Medição e retorno

Arquivos: playground/macro-estado.ts, playground/macro-interface.tsx e tests/macro-estado.test.ts.

- [x] Guardar ponto local e ponte de ensaio; validar tipo, números finitos, ilha, terreno e limites antes de retomar.
- [x] Mostrar mapa, distritos, distância, dimensões, setores e métricas do renderer.
- [x] Disponibilizar reconstrução e reinício de ensaio, sem endpoints da campanha.
- [x] Conferir teclado e toque, travessia nos dois sentidos, nado na costa, retomada e descarregamento.

## 4. Verificação

- [x] Executar testes das novas regras e regressões dos componentes compartilhados alterados.
- [x] Executar bun run typecheck, bun run build e Biome nos arquivos alterados.
- [x] Registrar URL local, evidências de navegador e limitações em docs/qa/2026-11-15-arquipelago-macro.md.
- [x] Atualizar README do jogo com o comando do blockout.

Conferido em 15/11/2026. Evidências e limites: `docs/qa/2026-11-15-arquipelago-macro.md`. O marco encerra o blockout local; não encerra a campanha nem a integração do novo mundo com a plataforma.
