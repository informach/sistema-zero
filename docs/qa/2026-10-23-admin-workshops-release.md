# Admin, oficinas e comunidades: revisão e implantação

Registro de 23/10/2026. Complementa a [revisão da integração](2026-10-23-admin-workshops-integration-review.md)
com o resultado da liberação. As [evidências resumidas](evidence/2026-10-23-admin-workshops-release.json)
não contêm credenciais, identificadores de crianças nem URLs de execução com capacidade.

## Fonte liberada

- PR [208](https://github.com/informach/sistema-zero/pull/208), merge normal em
  `a2ff0fe49815922047e9d3bd98232eafe1e05592`.
- Head revisado `f5e22613ffe56207a8260ebeb2177a30ae368da0`; árvore idêntica à do merge:
  `0e47c8209e6e98e109708bcd2144acaa1324464a`.
- [CI do PR, tentativa 2](https://github.com/informach/sistema-zero/actions/runs/39963724638):
  dez jobs passaram, incluindo Windows, macOS, banco/build/tipos e navegadores.
- [Plano Railway aprovado](https://github.com/informach/sistema-zero/actions/runs/39963724616):
  zero alterações de configuração. Conferência de produção no merge também passou.
- `main` e `staging` foram sincronizadas no merge. O complemento visual posterior,
  PR [209](https://github.com/informach/sistema-zero/pull/209), tem fonte e liberação próprias;
  não deve ser confundido com esta implantação.

## Revisão e correções

O lote concilia a nova sala da equipe, lentes Kids/Adultos, cursos/oficinas, inscrições,
agenda, sala ao vivo, jornadas, nascimento obrigatório para novos perfis e Molda/Pinta.
Preserva a autorização no servidor, a audiência do curso existente e as falas gravadas.

Foram reproduzidas e corrigidas perda de rascunho da jornada, consumo por tela sem permissão,
respostas obsoletas da agenda, contaminação da paginação Kids → Adultos → Kids e consultas
duplicadas. A falha de CI do Molda foi isolada na causa: mock parcial do Pinta vazando entre
testes. Os dez casos originais foram preservados em processo próprio. As fixtures de perfil
passaram a cumprir a política real de nascimento, com negativos de ausência e bypass.

Verificações locais concluídas:

| Superfície | Resultado |
| --- | --- |
| Admin completo | 909 testes, 3.790 asserções, zero falhas |
| Kids completo | 1.612 testes, 9.163 asserções, zero falhas |
| Molda, três grupos canônicos | 3.521 testes, zero falhas |
| Members: domínio/HTTP das oficinas | 121 testes, 628 asserções, zero falhas |
| Auth: perfil/HTTP | 148 testes, 542 asserções, zero falhas |
| BFF: perfil e transporte Studio | 12 testes, 28 asserções, zero falhas |
| BFF: voz, leitura, preferências e jornada ao vivo | 40 testes, 106 asserções, zero falhas |
| Biome global | 11.072 arquivos, exit 0 |

Os dez casos do Molda executados no filho do wrapper Kids não são contados novamente.
Não se somam a esta tabela os reensaios estreitos dos mesmos casos.

## Staging

Inventário final de 15:35:46 UTC: 18 serviços saudáveis, nenhuma implantação pendente.
Auth, Members e os quinze aplicativos afetados estavam no head revisado; o recorder
permaneceu na versão anterior porque seu runtime não mudou. Seis relações de URLs públicas
foram comparadas com os domínios efetivamente pertencentes ao ambiente.

O CI de código do push passou. Seu job automático de deploy falhou na prova SSH de
autenticação, antes de qualquer mutação. Uma recuperação manual com os mesmos controladores
canônicos implantou o snapshot aprovado e confirmou a retirada das versões anteriores.
Esse resultado não transforma o job automático que falhou em um job verde.

Depois do login fornecido pela responsável, o navegador real carregou a oficina Python de QA,
a turma e os diálogos de edição/inscrição. Kids → Adultos → Kids mostrou listas da audiência
correta. Edição foi cancelada; inscrição foi fechada sem alteração. Não houve erro ou aviso
de console observado nessas páginas.

## Produção

As três ondas terminaram sem janela de manutenção. O formulário Kids com nascimento veio
antes do endurecimento da API Auth. Foram atualizados os oito consumidores com alteração
efetiva de runtime: Kids, Auth, Members, Admin, comunidade adulta, Funnel, Marketing App e
Helpdesk App. Os nove demais backends não tinham mudança de runtime: o delta compartilhado
do Core era uma interface TypeScript apagada na compilação. O recorder também não mudou.
Os commits anteriores desses dez serviços são, portanto, intencionais.

O inventário final confirmou os 18 serviços saudáveis, fontes esperadas, uma versão ativa
por serviço e nenhuma implantação pendente. A conferência dos snapshots carregados confirmou:

- 18 contextos de serviço/ambiente/deploy corretos;
- sete relações de credenciais correspondentes, sem gravar seus valores ou hashes;
- seis URLs públicas corretas;
- zero divergências entre configuração carregada e configuração atual;
- ausência de modo de manutenção; `LIVE_MEDIA_READY=false` preservado.

Prova autenticada em navegador real na nova versão:

- Admin: navegação Turma/Conteúdo/Negócio, lentes, formulário de curso ao vivo com comunidade
  da lente ativa, catálogo Python/Turtle, estrutura de curso e agenda.
- Jornada Kids: postos e comparação carregaram; preparar publicação permaneceu bloqueado
  sem alteração, comparação atual e motivo. Nenhuma política foi publicada.
- JavaScript: exemplo em blocos, execução do canvas, início por teclado, Stop, código gerado
  na Ponte, salvamento na conta, reabertura e exclusão do próprio projeto de QA.
- Python: Cobrinha em blocos, paleta Turtle, runtime no navegador e canvas inspecionado,
  Stop, Ponte com `import turtle`, salvamento, reabertura e exclusão do próprio projeto de QA.
- As seis gravações dos projetos de QA e as duas exclusões retornaram HTTP 200; a galeria
  voltou aos zero projetos iniciais. Nenhuma publicação social ou cobrança foi criada.

## Negativos preservados e limites

A primeira tentativa do PR teve timeout de inicialização do servidor WebKit antes dos testes;
a segunda tentativa completa passou. A primeira onda Kids de produção perdeu o token OAuth
do operador depois de receber o ACK do deploy. O deploy já existente foi reconciliado por
leitura: nova versão saudável, anterior removida, sem repetir a mutação. Os controladores
seguintes renovaram a autenticação operacional por meio da CLI, sem criar ou trocar chaves.

Este aceite cobre a integração revisada, os gates descritos, a implantação e os smokes
declarados. Não certifica transmissão de câmera/microfone, gravação real, carga, desempenho
ou endurance dos jogos, celulares físicos nem todos os fluxos do Pro. Mídia real permanece
desabilitada até sua qualificação própria. A correção complementar das barras de rolagem
tem validação e status separados.
