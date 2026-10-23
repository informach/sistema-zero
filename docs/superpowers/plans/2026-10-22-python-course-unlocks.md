# Conquistas Python no Estúdio Completo

## Regra confirmada

Cada curso concede os IDs de blocos da linguagem ensinada. Não há tradução nem
equivalência automática JavaScript→Python. O admin tem acesso aos blocos
homologados do ambiente sem concluir cursos. Alunos recebem apenas conquistas
do próprio perfil e público. Aulas e salas mantêm a curadoria contextual do
administrador, independentemente da paleta do Estúdio Completo.

## Contrato e autoridade

- Usar `metadata.studioUnlockBlocks` e o ledger existente. Sem tabela, coluna
  ou migração Python histórica: IDs `sz_py_*` já cabem nos contratos.
- Reutilizar a união atual + congelada e seu mecanismo de preservação. Uma
  remoção/edição de curso não apaga conquistas já entregues. Manter as regras de
  elegibilidade Kids/Adult existentes; isto não muda conclusão, Mural ou aulas.
- Um catálogo Python puro e compartilhado descreve IDs, proprietários e
  dependências. Ele deriva dos codecs atuais; não contém mapa JS→Python.
- Em discovery e autorização final do Estúdio Completo: IDs disponíveis = IDs
  Python conquistados ∩ IDs homologados da release. Conjunto vazio permanece
  vazio. `allowBlocks: []` não pode servir como teto porque nas aulas significa
  seguir a organização por nível.
- A autoridade efetiva continua no servidor e é relida por operação. O cliente,
  a instalação de Turtle, categorias, busca, revelação de nível e o Zappy não
  podem aumentar esse teto.
- Extensões derivam do proprietário dos blocos conquistados, como já ocorre no
  JavaScript. Admin mantém o acesso integral às extensões homologadas. Direitos
  de produto, modos/Ponte/Pro e capacidades de runtime continuam separados.
- Pro continua código livre após seus gates: esta regra não introduz scanner de
  comandos proibidos ou limitação artificial de sintaxe/importações.
- `canCreatePython` é elegibilidade por conquista conhecida, separada de Pro e
  do catálogo operacional. Admin não precisa de conquista. O seletor e a criação
  local conferem esse direito antes de persistir um projeto vazio. Classic exige
  um conjunto homologado não vazio e fechado; Pro pode usar uma release sem
  paleta Classic. A interseção nunca ganha dependências automaticamente.
- O teto JavaScript `grantedBlockIds` é separado da curadoria de aulas:
  ausente mantém a curadoria existente; vazio não concede blocos. Um curso
  somente Python não pode transformar a paleta JavaScript vazia em nível livre.

## Autoria dos cursos

O seletor de recompensas do Admin oferece catálogos separados por linguagem,
preservando IDs já selecionados ao trocar a visualização. Python usa o catálogo
homologado real; falha de carregamento não remove seleções nem troca para JS.
As dependências necessárias são mostradas e salvas como conjunto explícito do
curso. O runtime não inventa conquistas para completar dependências faltantes.
POST/PATCH também validam os IDs Python e o fechamento desse conjunto.

## Lotes e ownership

1. Root: catálogo Python puro, testes do catálogo/fechamento e export do pacote.
2. Backend: resolver de conquistas compartilhado, opções e decisões de runtime,
   acesso por curso Python, validação dos campos de recompensa no servidor;
   composição e testes. Sem modificar transações/eligibilidade sem necessidade.
3. Host: Full Studio, criação/extensões/remix e isolamento na troca de perfil,
   usando a decisão filtrada. Não criar outra lista de permissões no Zappy.
4. Admin: seletor por linguagem e dependências explícitas, importação/salvamento,
   testes de erro/preservação. Não alterar roteiros ou objetivos pedagógicos.
5. Review entre lotes e integrado; corrigir achados; tipagem e regressões JS,
   alunos sem conquistas/JS-only/Python-only/misto, admin e contextos de aula.

## Verificações obrigatórias

- Nenhum curso/ID desconhecido/JS-only não concede blocos Python.
- Um curso Python permite seu próprio conjunto sem depender de conquista JS.
- Discovery e decisão final concordam; retirada de homologação após discovery
  recusa criação antes de persistir. Conquista congelada é preservada.
- Dependência fora do teto, instalação de Turtle e nível 3 não ampliam o conjunto.
- Admin possui todos os blocos homologados; suporte read-only continua negado.
- Troca de perfil/público descarta a autoridade e paleta anteriores.
- JavaScript, curadoria de aulas/salas, publicação e fonte Pro são preservados.

## Implantação

O usuário restabeleceu o login local da CLI Railway. A leitura de staging em
22/10/2026 confirmou ausência de `STUDIO_AUTHORING_POLICY_JSON` e
`STUDIO_RUNTIME_HOSTS_JSON` em Members, Community, Community Kids e Admin. O
endereço e a presença da credencial do runtime estão configurados em Members e
nos aplicativos Community; valores secretos não foram impressos nem alterados.
Isso não confirma o catálogo do Worker ou o artefato remoto. A rotação de chaves
é de outra sessão. A candidata local continua offline; a ativação exige conferir
Worker, armazenamento, imagem, origens e aplicar o plano canônico correspondente.

## Checkpoint revisado

Implementação e revisão cruzada concluídas. Foram corrigidas as regressões de
atualização de conquistas, oferta Python presa ao bootstrap, recuperação do
ambiente Admin retirado e hidratação ao mudar permissões. Testes causais cobrem
fonte/rascunhos JS e Python preservados, curadoria de aula e abertura bloqueada.
Tipagem completa e testes afetados passaram. A integração local disponibiliza
essa base para outras sessões. A rodada gráfica adicional `ui-r13` passou nos
quatro exemplos sobre `1e8dd0e87`; a ativação remota continua separada no
[registro do lote](../../continuity/2026-10-22-python-visual-games-and-unlocks.md).
