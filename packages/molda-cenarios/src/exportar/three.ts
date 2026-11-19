import { zipFilesBlob } from '@sistemazero/molda/arquivos'
import {
  LIMITES_DA_EXPORTACAO,
  MAX_BYTES_DO_MANIFESTO,
  type PacoteCompilado,
} from '@sistemazero/molda-cenarios-core/compilar'
import { conferirConteudoCompilado } from '@sistemazero/molda-cenarios-motor/compilar'
import { CSS_DO_EXEMPLO, HTML_DO_EXEMPLO, JS_DO_EXEMPLO } from './exemplo'
import { textoDasLicencas } from './licencas'

export const LIMITES_DO_PACOTE_THREE = {
  arquivos: LIMITES_DA_EXPORTACAO.arquivos + 16,
  bytes: LIMITES_DA_EXPORTACAO.bytesDoPacote + MAX_BYTES_DO_MANIFESTO + 8 * 1024 * 1024,
  bytesZip: LIMITES_DA_EXPORTACAO.bytesDoPacote + MAX_BYTES_DO_MANIFESTO + 40 * 1024 * 1024,
} as const

/** Gera distribuição a partir do pacote conferido. Os nomes não entram no HTML/JavaScript. */
export async function arquivosDoPacoteThree(pacote: PacoteCompilado, sinal: AbortSignal) {
  const { cena } = await conferirConteudoCompilado(pacote.cena, pacote.arquivos, sinal),
    runtime = await import('./runtime-three.generated'),
    arquivos = new Map<string, Uint8Array>(),
    texto = (nome: string, valor: string) => arquivos.set(nome, new TextEncoder().encode(valor))
  sinal.throwIfAborted()
  // Usa as referências somente para empacotar; nenhum buffer autoral é transferido ou editado.
  for (const a of cena.arquivos) arquivos.set(a.caminho, pacote.arquivos.get(a.caminho)!)
  texto('cenario.json', JSON.stringify(cena))
  texto('carregar-cenario.js', runtime.RUNTIME_THREE_FONTE)
  texto('index.html', HTML_DO_EXEMPLO)
  texto('explorar.css', CSS_DO_EXEMPLO)
  texto('explorar.js', JS_DO_EXEMPLO)
  texto('licencas-modelos.txt', textoDasLicencas(cena.licencas))
  texto(
    'licencas-runtime.txt',
    runtime.RUNTIME_THREE_DEPENDENCIAS.map(
      (d) => `${d.nome} ${d.versao} — ${d.licenca}\n${d.texto}`,
    ).join('\n\n'),
  )
  texto(
    'LEIA-ME.txt',
    [
      `Cenário: ${cena.nome}`,
      `Fonte: ${cena.fonte.cenario}, revisão ${cena.fonte.revisao}, SHA-256 ${cena.fonte.digest}.`,
      `Runtime SHA-256: ${runtime.RUNTIME_THREE_DIGEST}.`,
      '',
      'COMO ABRIR',
      'Extraia o ZIP para uma pasta. Sirva essa pasta por HTTP, por exemplo: python -m http.server 8000',
      'Abra http://localhost:8000 no navegador. Não é necessário entrar na plataforma ou acessar a internet.',
      'Abrir index.html por file:// não permite ler os arquivos do cenário nos navegadores.',
      '',
      'USAR EM UM PROJETO',
      'carregar-cenario.js é um ES module autocontido, com Three e as dependências licenciadas incluídas.',
      'Importe carregarCenaDoEndereco(urlDoManifesto, signal) ou carregarCenaNoThree({cena, arquivos}, signal) para obter cena, colisões, alturas, água, atores e metadados.',
      'Ligue atualizar(deltaEmSegundos) e quadro(camera, alvo) ao seu loop. Ao sair, chame descartar().',
      'Os clipes estão em atores: cada instância possui mixer e animacoes próprios. O exemplo não inventa rotinas de personagens.',
      'O exemplo usa o mesmo movimento e câmera do Testar, com figura neutra de 1,16 m. O avatar privado e regras do jogo não integram este pacote.',
      'Água dinâmica usa os parâmetros originais; margens, malhas e colisões vieram do compilador. Metros, eixo Y para cima.',
      'Os arquivos GLB individuais têm acabamento estático para consumidores que não usam o runtime de água.',
      '',
      'RECURSOS E LICENÇAS',
      'O manifesto confere caminhos, tamanhos e SHA-256 dos recursos antes de entregar a cena. Não remova dependências.',
      'Licenças das bibliotecas: licencas-modelos.txt. Licenças dos componentes de software: licencas-runtime.txt.',
    ].join('\n'),
  )
  if (
    arquivos.size !== cena.arquivos.length + 8 ||
    [...arquivos.values()].reduce((n, b) => n + b.length, 0) > LIMITES_DO_PACOTE_THREE.bytes
  )
    throw Error('O pacote de distribuição excede o orçamento ou contém nomes conflitantes.')
  sinal.throwIfAborted()
  return arquivos
}

export async function exportarPacoteThree(
  pacote: PacoteCompilado,
  sinal: AbortSignal,
  progresso?: (feito: number, total: number) => void,
) {
  const arquivos = await arquivosDoPacoteThree(pacote, sinal)
  return zipFilesBlob(
    [...arquivos].map(([path, bytes]) => ({ path, bytes })),
    {
      signal: sinal,
      maxEntries: LIMITES_DO_PACOTE_THREE.arquivos,
      maxReadyBytes: LIMITES_DO_PACOTE_THREE.bytes,
      maxCompressedBytes: LIMITES_DO_PACOTE_THREE.bytesZip,
      onProgress: (p) => progresso?.(p.processed, p.total),
    },
  )
}
