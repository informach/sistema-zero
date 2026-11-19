# Homologação do armazenamento v4 na staging (19/11/2026)

## Por que

`PROJECT_STORAGE_VERSION = 4` chegou à staging (`c81c607c`) sem a qualificação remota que os
relatórios de 19/11 exigiam, e sem chave de desligamento. A migração v3→v4 apaga os registros de
dados v3 (`project-migrations/localV3.ts`) e a staging é implantada a cada push. Decisão da dona:
corrigir para frente, sem voltar para v3 (voltar esconderia da lista os projetos já migrados).

## O que entrou

| Commit | Entrega |
|---|---|
| `49596ff9` | `project-migrations/localBackups.ts`: lê os backups imutáveis que as migrações v1/v2/v3 e o arquivamento de recuperação já gravavam (ninguém os lia) e restaura como cópia NOVA pelo import. Exportação de emergência com todos os registros do projeto e o journal de saída. No card "Preservado", o ⋯ passa a oferecer "Restaurar uma cópia" e "Baixar o que foi preservado". Prova do cliente v3 congelado (`e2e/storage-downgrade.flow.ts`). |
| `71ff49dd` | Migração do acervo real: os 185 exemplos da galeria e os projetos dos cursos protegidos, de v3 e de v2 para v4, pelo caminho real de abrir. |
| `6617daa6` | Troca de perfil com gravação em voo no navegador real, Firefox no driver de armazenamento, portões novos na CI da missão. |

## Provas

Locais (Chromium 1243, Linux):

- `localBackups.test.ts` 8/8: backup v3, v1/v2 (objeto e lista), ancestral de recuperação, id com
  dois-pontos não vaza para outro projeto, restauração cria cópia nova sem tocar no atual,
  exportação leva só o projeto pedido. `ProjectCard.test.tsx` 9/9.
- `realCorpusMigration.test.ts`: todo o acervo abre igual depois da migração; o backup devolve os
  registros v3 byte a byte. Provado que morde (um espaço a mais no `script.js` reprova).
- `projectStorageBrowser.test.ts` em modo normal e profundo, com o caso novo de troca de perfil.
  Provado que morde: com um banco só para os dois perfis, o perfil B recebe a edição de A.
- `storage-downgrade.flow.ts`: o cliente v3 de `f9ddd5e1` (último v3 da staging), depois da
  migração, **não lista nenhum projeto** (o defeito conhecido da reversão, agora medido), mas não
  muda nenhum byte do `sz:v4:*` nem do journal de saída; a v4 que volta mantém as edições, mostra
  o projeto que o v3 criou e o backup devolve o projeto de antes. Provado que morde.

CI da missão no SHA exato `465abc2f` (run 44579789798, `workflow_dispatch` na staging):

| Portão | Linux | Windows |
|---|---|---|
| Modo profundo (10 mil blocos, v1/v2/v3, Chromium + WebKit) | aprovado | aprovado |
| Firefox: ciclo de vida, modo profundo e troca de perfil | aprovado | aprovado |
| Cliente v3 congelado nos três motores | aprovado | (só Linux) |
| Recarga com commit de saída abortado | aprovado | aprovado |
| Recarga WebKit Linux antes da suíte | aprovado | — |

## O que continua aberto

- A suíte isolada da CI para no primeiro arquivo vermelho, e hoje o primeiro é
  `blockLevels.test.ts` (Jogo 3D, vindo de `97028f4f`, integração de cenas do Molda, fora desta
  frente). A rodada local completa, continuando depois das falhas (894 arquivos), só reprovou
  testes de Jogo 3D/extensões (mesma origem), do Node 24 (o contêiner tem Node 22), do build de
  conversão (dependência do runtime não instalada aqui) e o orçamento do modo Blocos (abaixo).
- `initialBundleBudget.test.ts` já reprovava na staging limpa: o modo Blocos tinha 4 750 580 bytes
  crus para um teto de 4 750 000. A abertura do lote 2 somou 1 283. O teto não foi alterado.
- Verificar/Enviar e troca de perfil no app conectado (Members) não foram verificados: não há
  acesso à plataforma implantada nesta sessão.
- Aparelho físico, sessões longas e Safari real seguem sem prova.

## Reversão: o procedimento

1. Não implantar um build anterior à v4 sobre dados v4: ele não lista os projetos migrados.
2. Se for inevitável, nada se perde: a v4 seguinte reabre tudo e transforma o que o v3 gravou em
   projeto da lista. Medido em `storage-downgrade.flow.ts`.
3. Projeto marcado "Preservado": ⋯ → "Restaurar uma cópia" (do backup mais recente) ou "Baixar o
   que foi preservado" (arquivo `<id>.preservado.json` para o suporte; só lê).

Reproduzir:

```bash
cd packages/studio && bun test src/project-migrations src/components/projects/ProjectCard.test.tsx
```

```bash
cd packages/studio && STUDIO_STORAGE_BROWSER=chromium STUDIO_STORAGE_DEEP=1 bun test src/state/projectStorageBrowser.test.ts
```

```bash
cd packages/studio && STORAGE_DOWNGRADE_BASELINE=<checkout de f9ddd5e1 instalado> bunx playwright test --config playwright.storage-downgrade.config.ts
```
