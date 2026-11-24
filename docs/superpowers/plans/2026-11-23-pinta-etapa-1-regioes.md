# Pinta — etapa 1: regiões ligadas, sem flag (23/11/2026)

Item 1 de "Ordem e critérios de fechamento" do plano mestre e itens 2 e 3 da "Menor sequência" da
auditoria `reaproveitamento-regional-2026-11-22.md`. Só o portão **nativo 8 / nuvem 7** (regiões).

**Decisão da dona (23/11):** "Não precisa ter flag de nada. Eu só vou promover para produção quando
tudo estiver pronto e testado em staging." Não há flag nova. As regiões ficam ligadas por padrão. A
proteção de quem tem leitor antigo continua obrigatória: abas e aparelhos com o código anterior
existem de verdade. "Rollback" aqui significa um cliente antigo, ou o deploy anterior, encontrar
dado regional.

## Em cinco linhas

1. Sem flag nova. O host do Pinta solto monta a oficina (teto nativo 8) sem conta e com a fila
   causal; com a fila, anuncia leitor e escritor 7 e liga a galeria focal da conta.
2. Na conta, as regiões dependem da fila causal que já existe (`NEXT_PUBLIC_PINTA_CAUSAL_CLIENT_V1`
   e a lista causal no servidor). Sem ela, o host fica no armazenamento de sempre.
3. O transporte é o protocolo causal V4 de sempre. O BFF confere o documento regional de qualquer
   perfil causal. Members, migrações e formato da nuvem não mudam.
4. Um leitor antigo (6) vê o regional como "feito numa versão mais nova". No aparelho, aparece o aviso
   de leitura. Na conta, o piso do inventário (7) recusa a leitura e a escrita dele. Nada é apagado
   nem regravado.
5. Uma unidade selada por uma aba antiga antes de o piso subir é encerrada e recuperada no
   aparelho, sem travar a fila do código novo.

## Dependência das flags que já existem

Não mexi em nenhuma flag existente; elas serão tratadas num lote próprio.

- **Sem conta:** a oficina regional funciona só no aparelho, sem depender de nada.
- **Com conta e fila causal:** o host decide pela fila causal, ou seja, por
  `pintaCausalAllowed && NEXT_PUBLIC_PINTA_CAUSAL_CLIENT_V1 === '1'` com navegador capaz
  (`cloud.pintaCausal`). Só com ela a conta recebe regiões.
- **Com conta e sem fila causal:** o caminho antigo da nuvem declararia nuvem 6 para um documento
  nativo 8, por isso o host não monta a oficina. É o caso de produção hoje, fora da lista causal.
- **Galeria focal da conta:** precisa da fila causal (época conhecida) pelo mesmo motivo.

## Pontos de entrada

| Ponto | O que muda |
|---|---|
| Host do Pinta solto (`pinta-client.tsx`, Kids e adulto) | Sem conta: `createWorkshopPintaPersistence({ nativeCeiling: 8 })`. Com a fila causal: a mesma oficina com `guardCausalWrites`, nuvem com `pintaCausalReader: 7` e espelho com `reader: 7, writer: 7`. Sem a fila causal: o de sempre. O `PintaApp` só recebe `onCompletionControlChange` quando uma missão por cima o pede |
| Espelho da conta (`pinta-cloud-persistence.ts`) | `listGalleryIndex`: o índice lido ao lado da fila V4, com a mesma conta de recuperação da galeria inteira; a reconciliação continua em segundo plano |
| `PintaApp` | A janela focal abre também com as pontes do Estúdio. Ao sair de uma janela que gravou (e ao passar para o "Avançado"), um mapa já levado ao Estúdio é atualizado por `resyncStudioCopies`, a mesma ponte do editor inteiro. Missão e aula continuam no editor inteiro |
| Galeria (`NewAssetDialog`) | No passo de tamanho do mapa, o cartão "Mundo gigante" (1024 × 768 peças, só ocupa espaço onde se pinta), quando o armazenamento é a oficina e não há pedido de arte de missão |
| BFF causal | A prova da unidade admite nativo 8 / nuvem 7 (`allowRegions`). O leitor negociado continua com teto 7; o nativo 9 continua atrás de `PINTA_WORKSHOP_SERVICE_READER` |
| Sincronia causal (`pinta-causal-sync.ts`) | Recusa `client-outdated` de uma unidade selada com leitor abaixo do piso → encerra e recupera, como as outras unidades vencidas |
| Members | Nada: já aceita leitor até 65535, confere `formatVersion <= reader` e mantém o piso do inventário |
| Arquivo `.pinta.json` | Nada: o ZIP da oficina leva e traz o regional; o leitor antigo recusa o arquivo inteiro |
| Biblioteca do Estúdio | Nada no Estúdio. A ponte publicada não tem a capacidade privada do PNG 5: a captura regional é recusada com recado, sem tocar no que já estava lá |
| Pinta da aula | Nada: persistência própria, formato antigo, sem galeria, sem cartão "Mundo gigante" e sem janela focal |

## O que cada leitor antigo vê

- **Deploy anterior no mesmo aparelho** (armazenamento de sempre, leitor 6):
  - o registro físico 3 do regional vira aviso de leitura (`status: 'unsupported'`), e a galeria
    diz "feito numa versão mais nova do Pinta";
  - o registro não some, não é apagado, e uma gravação antiga por cima vira cópia;
  - as edições antigas de outros desenhos ficam no aparelho e sobem quando o código novo volta.
- **Conta lida por leitor 6:**
  - o regional sobe o piso do inventário para 7;
  - o `graph` responde `client-outdated`;
  - o aparelho antigo não baixa, não sobe e não apaga nada.
- **Aba antiga que selou antes do piso subir** (corrida entre aparelhos):
  - a conta recusa a unidade com `client-outdated`, porque o members confere o piso antes da época;
  - o código novo encerra a unidade (`settle` → `unknown`) e a recupera no aparelho;
  - a fila segue e o regional desce.
- **Leitor 7 diante de nuvem 8** (nativo 9): o mesmo piso, agora 8, fecha a conta para ele.
- **Cliente sem fila causal num perfil causal:** o caminho antigo já é recusado
  (`protocol-required`). Nada novo.
- **Galeria da aula:** só aceita desenhos soltos e folhas. Mapas nunca entram.

## O que muda no servidor

- **member-shell (BFF):** `readerOptions` passa `allowRegions: true`. Nenhuma variável nova.
- **members:** nada, e nenhuma migração.

## Portões

- **Nativo 8 / nuvem 7 (regiões):** este lote. Teto nativo 8 na oficina do host, leitor e escritor 7.
- **Nativo 9 / nuvem 8 (autorregras e projeções):** não é anunciado porque não está pronto. Para
  abrir, são quatro passos:
  1. teto nativo 9 na oficina;
  2. leitor e escritor 8 no host;
  3. `PINTA_INVENTORY_READER_VERSION` 8 no core;
  4. leitura do corpo 9 no BFF.

  Antes disso, o livro e as projeções precisam abrir, fechar, reexportar, recuperar e baixar pela
  mesma persistência e captura (auditoria, item 3). Com o teto 8, restaurar um backup com regras ou
  projeção é recusado sem gravar nada.

## Fora do lote

- Abrir ou editar mapa projetado (etapa 8). Etapas 3 a 6. Python.
- As flags existentes (causal, lista causal, paletas CAS) e a promoção à produção.
