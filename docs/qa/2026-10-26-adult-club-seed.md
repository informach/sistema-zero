# Clube dos Criadores adulto — 26/10/2026

A conferência real de staging e produção encontrou Mural adulto, Mural Kids e Clube
Kids, mas nenhum Clube adulto. O seed anterior registrava essa definição como pendente.
A solicitação de espelhar os canais Kids, com comunidade adulta separada e o mesmo nome,
fecha essa lacuna.

## Definição

- Nome: **Clube dos Criadores**; slug `clube-dos-criadores-adulto`; audiência `adult`.
- Acesso: `community_gated`, chave `adult-clube-dos-criadores`.
- **Geral** (`geral`): membros podem iniciar tópicos.
- **Recados da equipe** (`recados-da-equipe`): somente equipe inicia tópicos.
- Canais herdam acesso e moderação do espaço. Adulto segue o default existente de
  publicação direta (`requiresApproval=false`); a moderação continua disponível no Admin.
- Kids conserva aprovação prévia e chaves próprias. Não se copiam usuários, tópicos,
  comentários, reações ou conquistas entre públicos.
- Mural permanece separado do fórum, com canal `parede` e publicação pelo fluxo de projetos.

## Aplicação real

Em 26/10, 16:02 UTC, a API autenticada do Admin criou o espaço e os dois canais em cada
ambiente. Nenhuma mensagem foi publicada. Leitura PostgreSQL readonly anterior/posterior
confirmou quatro espaços, dois por audiência, e preservação integral das configurações
observadas nos três espaços anteriores em cada ambiente. As listas Admin separadas por
audiência retornaram os registros corretos. A tela do Clube adulto em produção mostrou
o título e ambos os canais, sem alertas.

| Ambiente | ID do Clube adulto | Aplicação |
| --- | --- | --- |
| Staging | `75ce9f1d-8744-4002-86f1-e8e56d821b0f` | 1 espaço + 2 canais |
| Produção | `1596bda9-92f5-43c1-bf13-3900b4823ccc` | 1 espaço + 2 canais |

O seed versionado contém a mesma definição. `plan/status` não escrevem; `apply` cria
apenas ausentes e preserva configurações existentes. Os próximos ambientes podem receber
a estrutura sem cadastro manual e sem duplicar os espaços já criados.

## Verificação

- Seis testes focados / 53 asserções: definição, idempotência, preservação e conflitos;
  rotas reais recusam leitura/escrita cruzadas entre chaves Kids/adulto, permitem o Geral
  próprio e recusam tópico de membro em Recados. Kids segue `pending`, adulto `visible`.
- Hub completo: 182 testes / 745 asserções, sem falhas; 53 casos SQL condicionais não
  executados nesta rodada. Tipagem Hub passou.
- Não foi criada postagem de teste em produção nem feita nova homologação de toda a
  experiência de aluno. Criação via Admin e conferência persistida não provam todos os fluxos.

Recibos sanitizados: `.cache/business-scope/adult-club-{staging,production}-apply.json`,
`community-spaces-{staging,production}-{before,after}.json`, `adult-club-preservation.json`.
