# Mapa da missão: cada seção do texto original e o estado dela

Registro vivo, atualizado a cada lote. A régua é [`missao-original.md`](missao-original.md), com
as decisões da dona anotadas no topo dele. Uma seção só passa a **feita** com implementação, teste
e evidência versionada; o resto fica na coluna "O que falta", sem ser apresentado como concluído.
Tudo aqui é staging: nada foi para a `main` nem para produção.

Lotes do plano de 21/11: 1 fechar o que já está no staging; 2 isolamento; 3 Clássico; 4 motores e
streaming; 5 Pinta, Molda e Zappy; 6 persistência e Pro; 7 fluxo profissional; 8 homologação e
entregáveis.

## Estado em 21/11/2026 (fim do lote 1)

| Seção | Estado | Evidência | O que falta (lote) |
|---|---|---|---|
| 2. Cursos protegidos | feito | matriz (43 testes), `protectedCourses.test.ts` (15), as cinco aulas no CI (399 gestos, 66 objetivos); Verificar, Enviar e Concluir no app de staging em 20/11 ([`../qa/2026-11-20-studio-casca-staging.md`](../qa/2026-11-20-studio-casca-staging.md)); aula com vídeo e casca ligada em 21/11 ([`../qa/2026-11-21-studio-casca-staging.md`](../qa/2026-11-21-studio-casca-staging.md)) | capturas de depois das mudanças de 20 e 21/11 (8); vídeos gravados nunca acessados, registrado como lacuna |
| 4. Etapa 0, linha de base | parcial | `linha-de-base-linux.md`, `e2e/engine-baseline.spec.ts` (cinco motores, 10 ciclos), `classico-em-escala.md`, `pro-em-escala.md`, [`aparelho-modesto-emulado.md`](aparelho-modesto-emulado.md) | relatório consolidado com p50 e p95 por máquina e fixture; custos medidos dos dez runtimes (4 e 8) |
| 5. Etapa 1, isolamento | parcial | casca em outro site **ligada no staging e conferida logada nos dois apps em 21/11**: teclas sem clicar no palco, sem laço de foco, programa hostil (50 ms de atraso no editor), Parar em 846 ms; os nove programas hostis da missão no CI no Chromium (prévia direta e casca) e no Firefox (casca), sem o WebKit (B4) | erro de render, de física, de compilação e enxurrada de entrada; intermitente do Linux; teclado preso no 3D do Windows; liberação de recursos medida; troca de perfil no app; decisão do WebKit (B4) (2) |
| 6. Etapa 2, Clássico em escala | parcial | 10 mil blocos abrem e geram código no formato dos jogos nas três engines (`43f20c03d`, `classico-em-escala.md`) | sequência única de 10 mil (conserto B); busca de bloco com "Mostrar o bloco"; salvar e processar só o que mudou; código de 10 mil igual ao do caminho normal no CI, com evidência bruta (3) |
| 7. Etapa 3, Pro em escala | critérios atingidos | 60 arquivos com as quatro medidas no Linux e no Windows; ensaio com tudo ligado (`22ffac242`, `pro-em-escala.md`) | organizar imports; histórico e comparação; tempo de referências, renomear e formatar; ensaio com dependências (6) |
| 8. Etapa 4, motores e streaming | não começada | — | inventário medido; fixtures D e E; regiões; descarte de GPU; memória em 10 ciclos (4) |
| 9 a 11. Investigar, Desempenho, Meus testes | entregues pela proposta aprovada | [`paineis-proposta.md`](paineis-proposta.md); Python no staging com a distribuição nova, num projeto novo: Investigar, Pausar, Avançar 1 quadro (exato), Desempenho (59 quadros por segundo) e teclas (21/11) | custo da medida (< 5%) medido no navegador; casos de chave, porta, vida, placar, fim, compilação e tempo (8) |
| 12. Pinta e Molda | parcial | fixtures congeladas dos contratos e a regra do campo desconhecido (`1136c01a1`); prova da exportação 2D nas três engines, as três verdes na homologação de `1dd1f51c6` (`70934d023`, `61ef65f2d`) | prova 3D com um cenário real do Molda (5); memória da prova 2D em ciclos (4) |
| 13. Persistência | parcial | P1, P2 e P4 corrigidos; P3 pela opção 1 (`88eab2a15`); v4 homologada em parte (`../qa/2026-11-19-studio-v4-homologacao.md`) | matriz de quedas por borda de escrita; vínculo Clássico→Pro; projeto Python marcado como mudado ao abrir (6) |
| 14. Fluxo profissional | não começada na missão | — | exportação reproduzível conferida fora do Estúdio; histórico; avaliação do Git opcional (7) |
| 15. Zappy | parcial | revisão exata já existia | valores do Investigar e métricas do Desempenho sob demanda (5) |
| 16. Aparelhos de referência | **emulado** (decisão dela) | CPU 4x e 6x no CI, só no Chromium: Firefox e WebKit não têm essa emulação ([`aparelho-modesto-emulado.md`](aparelho-modesto-emulado.md), `studio-modest-device.yml`) | nenhum aparelho físico, por decisão |
| 17. Homologação A a H | A e B feitas; C, F e H parciais; D, E e G não feitas | `studio-mission.yml` (homologação em cada SHA) | documento A a H com o que foi local, emulado ou não verificado (8) |
| 18. Branch, worktree e PR | substituída (decisão dela) | trabalho direto na `staging`, com commits pequenos e push | — |
| 20. Entregáveis | quase nada | este mapa | manuais do Clássico e do Pro, guia de profiling e depuração, documento de exportação, lista final (8) |

## Lote 1 (21/11): o que fechou

- Casca isolada de volta ao staging (Worker da frente do Pinta, apps em `61ef65f2d` com
  `STUDIO_CLASSIC_SHELL_ENABLED=1`) e conferida logada no app adulto, numa aula com vídeo e no
  Kids: [`../qa/2026-11-21-studio-casca-staging.md`](../qa/2026-11-21-studio-casca-staging.md).
- Distribuição Python nova ativa no staging; painéis conferidos num projeto novo. Os cinco projetos
  Python antigos de teste e QA foram apagados pela interface, com a lista confirmada por ela.
- Texto original da missão versionado (`missao-original.md`).
- O lint do CI estava vermelho desde `61ef65f2d` por quatro JSON brutos meus, sem a formatação do
  Biome (`15e34d911`, valores conferidos iguais). A outra falha antiga do CI, o processo zumbi do
  `studio-runtime`, já tinha conserto em `5155bc5e8`.
