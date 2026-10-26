# Execução autoritativa nas missões Python

Requisito confirmado pela usuária em 24/10: verificar estrutura não basta. As
missões Python precisam executar o projeto e conferir seu comportamento. Esta
frente permanece distinta da implantação financeira e não reescreve roteiros.

## Lacuna confirmada na árvore de staging local

`core/learning/python-project-checks.ts` transforma os objetivos Python em checks
`kind: structure`. `members/application/learning/section-progression.service.ts`
chama a inspeção com `clientResults: []`. A inspeção atual compila/obtém AST, sem
avaliação autoritativa de comportamento. O modelo de atividades tem behavior e
testcase, mas seus resultados atuais são identificados como client; não basta
trocar essa etiqueta para server.

Já existem execução isolada, autorização do snapshot, playtest Python em browser
protegido e receitas limitadas de entrada no studio-runtime. O playtest atual prova
que o programa iniciou/rodou/parou e captura saída/imagem; não prova sozinho que a
missão foi cumprida. Reaproveitar essa base, ampliando observações reais.

## Contrato da implementação

- O servidor usa a revisão salva, regras autoradas e perfil/runtime aprovados.
  Executa código da criança somente no sandbox; não no processo do Members.
- Critérios e respostas esperadas ficam no avaliador confiável, fora do contexto
  Python controlado pelo aluno. O programa fornece observações/retornos; não um
  booleano de aprovação aceito do navegador.
- Permitir sequência limitada de espera, tecla mantida/solta, clique e entrada;
  capturar baseline e resultado para avaliar direção, mudança, pontuação e estados.
- Funções recebem casos de teste com argumentos; o servidor compara os retornos.
  Não enviar as respostas esperadas junto ao programa ou aceitar relatos forjados.
- Cor, sprite e magnitude permanecem livres quando a intenção permitir. Exigir
  coerência: movimento para cima deve produzir deslocamento na direção correta,
  mesmo com velocidade ou arte diferentes do exemplo.
- Estrutura é complementar quando o conceito exige laço, função ou importação.
  Não substituir execução indisponível por aprovação estrutural. Publicação deve
  recusar critérios não suportados pelo ambiente escolhido.
- Programas que não compilam, falham, excedem CPU/tempo/saída ou não respondem
  não cumprem o objetivo. Indisponibilidade do executor é erro recuperável, não nota.
- Revalidar posse, permissão, lease/revisão e curação antes e depois da execução.
  Relatório ligado a projeto, revisão, regra e fingerprint do runtime; rejeitar stale.
- Reutilizar materialização/cache imutável e agrupar observações compatíveis.
  Novos estados de execução devem permanecer isolados entre cenários/projetos.
- Cobrir Clássico/Pro, blocos/Ponte/fonte e os perfis que realmente suportarem as
  observações. Turtle e Pygame Zero precisam de observação gráfica, não só console.

## Provas necessárias

Programa certo e errado com a mesma estrutura; código correto em ramo nunca
executado; função existente que não produz o retorno; teclas/colisões e pontuação;
cores/sprites/velocidades alternativos coerentes; exceção, loop infinito e limite
de saída; falsificação de feedback, troca de revisão/permissão e limpeza de recursos.
Regressão JavaScript e ensaio pelo Admin/aluno reais permanecem obrigatórios.

Ainda não implementado por este documento. A inspeção foi somente de leitura na
árvore Python de outra sessão; seus jogos e alterações em andamento foram preservados.
