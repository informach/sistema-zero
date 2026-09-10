# Revisar conjuntos de poses na oficina, lote 136

## Implementação e revisão

- `SceneAnimationPoseGesture` inclui dono `pose-set`. `kind` do snapshot deriva
  do dono na publicação, não de flags independentes. Colagem prepara candidato
  privado uma vez, com validação completa; desenho usa suas matrizes com a fonte
  original do viewport. Editor/autosave não recebem o documento candidato.
- Gravar usa o candidato privado e as guardas existentes de fonte/revisão/tempo
  e geração reentrante. Mutar o clipboard, pares ou matrizes públicas da prévia
  não muda o resultado gravado. Alças e autokey não substituem/gravam conjuntos.
  Prévia idêntica permanece cancelável, sem botão Gravar habilitado.
- Hook conecta uma entrada revogável por documento/clipe/tempo/seleção/abertura. Checa
  seleção viva antes do cleanup do efeito; cancelamento limpa a referência antes
  de publicar. Uma pose de outro dono não pode ser substituída pelo formulário
  antigo. Geração protege também cancelamento reentrante antes de receber a entrada.
- Seção progressiva separada da colagem simples. Clipboard contém somente dados
  de captura e ID da criação; permanece após revisão/undo e some em outra criação.
  Mapa/eixo alterados retiram a prévia; fechar/Escape cancelam entrada própria.
- Lista de pares com um único seletor de destino: O(cópias + nós) opções/linhas,
  não um seletor de todos os nós por linha. Mesmo ID é padrão explicitado no texto;
  outros destinos são escolhas do usuário. Duplicados/ausentes bloqueiam prévia.
- Interface-design orientou seção contextual, tokens mld e alvos de 44 px. Par
  ativo tem destaque visual e aria-pressed; nomes iguais exibem IDs para diferenciar,
  nomes únicos ficam legíveis sem identificadores. Texto explica espelho local,
  substituição por conjunto e confirmação com os controles globais existentes.

## Evidência

Doze testes de sessão: nove interrupções, autokey desligado para a operação,
propriedade privada, reprodução exata, undo, no-op, erros e reentrância. Um teste
de hook com StrictMode, revogação por seleção/tempo/unmount e outro dono no mesmo
contexto. Outro teste de hook reproduziu RED: painel fechado podia iniciar nova
prévia porque seu hook permanecia conectado. Vincular escopo ao estado aberto,
incluindo guarda viva antes do cleanup, corrigiu. Ao reabrir, callbacks anteriores
seguem revogados. Três testes de oficina real com porta GPU substituída: pares aninhados,
mapa duplicado, edição da prévia, gravação/undo, sete interrupções, nomes iguais,
bloqueios, espaço incompatível e troca de criação.

Focais da oficina/hooks após revisão: 5 testes, zero falhas, 79 expectativas. Focais anteriores de
sessão/hook/oficina: 15 testes, zero falhas, 131 expectativas. Tipos e Biome/718
passaram. Integral final: 1.649 testes, zero falhas, 242 arquivos, 8.187.395
expectativas, 105,21 s. Vite passou em 1,25 s: inspetor 22,21 kB, playground
192,49 kB, Three 579,29 kB com aviso >500 kB. Kids passou: compilação 7,1 s,
tipos 12,3 s, 59 páginas em 659 ms, exit 0. Diff check passou.

Limitações: sem retargeting entre bases arbitrárias, simetria global automática,
GPU real ou homologação infantil. Alças ficam indisponíveis enquanto se revisa
o conjunto; navegar/escolher e Gravar/Cancelar continuam disponíveis. Público
permanece no formato 1.
