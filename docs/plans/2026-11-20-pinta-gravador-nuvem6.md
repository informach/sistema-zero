# Gravador de nuvem 6 após o leitor A

## Decisão e limite desta preparação

O leitor A `4db9390c2` aceita nuvem 6, documentos nativos 7 e a política
Python Linux nova, enquanto continua declarando nuvem 4. Por isso a Vila
com colisões autorais permanece protegida localmente e sua subida é recusada.
A fase B deve declarar nuvem 6 para mapas, folhas e conjuntos, conservando
o formato dos desenhos, os dados nativos e os leitores anteriores.

Preparar a fase B em worktree separado não autoriza sua implantação antes
da confirmação do leitor A em staging. A imagem, a distribuição Python e
a política empacotada não devem mudar com essa decisão. O rollback de B
deve voltar a A, que lê nuvem 6 e conserva a política selecionada.

O usuário autorizou o trabalho contínuo e o rollout em staging; não há
confirmação intermediária nem autorização de produção. A identidade visual
e os arquivos funcionais 3D permanecem fora desta alteração.

## Execução e aceite

1. Reproduzir a recusa da subida do documento nativo 7 com a declaração
   anterior, preservando os testes de leitura e as recusas de clientes antigos.
2. Subir somente a declaração por tipo para 6 e atualizar os testes que
   documentam a decisão de rollout. Manter o teto de leitura e os codecs.
3. Verificar os consumidores de nuvem, reservas, conflitos, remoção e
   recuperação; distinguir fixtures de cliente 4 dos usos do gravador atual.
4. Executar os testes e tipos pertinentes. Comparar os artefatos executáveis
   do runtime, o perfil e a distribuição com a fonte qualificada de A.
5. Registrar o delta e as provas. Comprovar primeiro Reader A em staging;
   somente depois implantar B no mesmo ambiente.
6. No cenário próprio de homologação: salvar, confirmar nuvem 6, ler com A,
   rejeitar escrita antiga com CREATION_CLIENT_OUTDATED, exercitar CAS e
   recuperar edição offline sem perder o mapa ou multiplicar cópias.
7. Executar rollback B → A → B preservando os mapas e a programação. Fechar
   o ciclo autenticado antes de declarar concluída a etapa 0b.

Não mudar a programação do jogo ou achatar o cenário para contornar a recusa.
Um mapa novo precisa continuar editável, com camadas, objetos, referências,
recursos e colisões completos.

## Integração da preparação à fonte atual

A preparação foi integrada ao leitor `598824bd1`, incluindo o remoto publicado
39fc e as correções verificadas de foco, publicação e tipos. Passaram novamente
Core, host, formatos do backend, tipos completos e perfil. O runtime e os 126
arquivos Python são byte a byte iguais ao leitor integrado; ver
`docs/pinta-cenarios/missao-completa-2026-11-18/qa/gravador-nuvem6-integrado-598-2026-11-20/`.
Isso ainda não ativa a escrita: falta receber a política final do leitor de
rollback, concluir seu rollout e executar os critérios autenticados 6 e 7.

Em 21/11, o leitor de rollback `24226bb3f` foi integrado sem conflitos,
incluindo a política `12220f13…`. Os sete controles e a igualdade dos artefatos
foram repetidos; ver `qa/gravador-nuvem6-leitor24226-2026-11-21/` no diretório
da missão. A escrita continua inativa até a qualificação e o rollout do leitor,
seguidos dos ensaios autenticados e do rollback previstos neste plano.

O leitor `13e88e9c8` foi integrado depois, incluindo os commits públicos até
48a8 e a precondição de QA da linha do tempo. A CI anterior de c70 revelou
nove expectativas fixas de capacidade 4 no espelho Kids. A reprodução e as
correções preservaram schemas nativos, metadados históricos e verificações de
perda; passaram os 72 casos finais. Foram aprovadas dez categorias locais em
três rodadas registradas, com as duas falhas operacionais/formatadoras
preservadas: não se declara um único lote original verde. Worker e os 126
arquivos Python são idênticos ao leitor. Evidências em
`qa/gravador-nuvem6-leitor13e-2026-11-21/`, no diretório da missão.
Esta preparação exige CI própria e continua sem deploy até completar o leitor,
sua ativação e a homologação autenticada dos critérios 6 e 7.
