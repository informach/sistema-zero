import { zipFilesBlob } from '@sistemazero/molda/arquivos'
import {
  LIMITES_DA_EXPORTACAO,
  MAX_BYTES_DO_MANIFESTO,
  type PacoteCompilado,
} from '@sistemazero/molda-cenarios-core/compilar'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import {
  conferirConteudoCompilado,
  juntarEstaticosDoPacote,
  type ProgressoDaCompilacao,
} from '@sistemazero/molda-cenarios-motor/compilar'
import { RAYLIB_CENARIO_SOURCES, RAYLIB_UPSTREAM } from '@sistemazero/studio/cenario-raylib'
import { exemploRaylib, MODULO_DE_DADOS_RAYLIB } from './exemplo-raylib'
import { textoDasLicencas } from './licencas'
import { normalizarPelesParaRaylib } from './peles-raylib'

export const LIMITACOES_DO_RAYLIB = [
  'A água é estática neste destino; parâmetros, margens e metadados continuam no manifesto.',
  'Colisões são aproximações por caixas AABB, sem física de malha. A consulta de altura é do solo; pisos elevados de pontes exigem as regras do jogo.',
  'Céu, névoa e luzes são dados para o programa; os shaders Three não acompanham o pacote.',
  'Animações de esqueleto usam a API nativa do Raylib. Animação de nós ou morph depende do suporte do programa de destino.',
] as const

type Opcoes = {
  tamanhoDaRegiao?: number
  progressoDaCompilacao?: (p: ProgressoDaCompilacao) => void
  progresso?: (feito: number, total: number) => void
}

/** A mesma geometria compilada, juntada pelo adaptador compartilhado, nunca pela UI. */
export async function arquivosDoPacoteRaylib(
  entrada: PacoteCompilado,
  sinal: AbortSignal,
  opcoes: Opcoes = {},
) {
  sinal.throwIfAborted()
  const junto = await juntarEstaticosDoPacote(entrada, sinal, {
      tamanhoDaRegiao: opcoes.tamanhoDaRegiao,
      progresso: opcoes.progressoDaCompilacao,
    }),
    cena = structuredClone(junto.cena),
    caminhos = new Map(
      cena.arquivos.map((a) => [
        a.caminho,
        a.mime === 'model/gltf-binary' ? `models/${a.caminho}` : a.caminho,
      ]),
    ),
    recursos = new Map<string, Uint8Array>(),
    avisos: string[] = [...LIMITACOES_DO_RAYLIB]
  for (const a of cena.arquivos) {
    const original = a.caminho
    a.caminho = caminhos.get(original)!
    const fonte = junto.arquivos.get(original)!,
      adaptado = a.mime === 'model/gltf-binary' ? normalizarPelesParaRaylib(fonte) : null,
      bytes = adaptado?.bytes ?? fonte
    if (bytes !== fonte) {
      a.digest = await digestDosBytes(bytes)
      a.bytes = bytes.length
      avisos.push(
        `${a.caminho}: ${adaptado!.pelesAntes} vínculos equivalentes do mesmo esqueleto compartilham uma pele na cópia Raylib.`,
      )
    }
    recursos.set(a.caminho, bytes)
    sinal.throwIfAborted()
  }
  for (const n of [...cena.nos, ...cena.colisoes]) n.arquivo = caminhos.get(n.arquivo)!
  await conferirConteudoCompilado(cena, recursos, sinal)
  const arquivos = new Map(recursos),
    texto = (p: string, t: string) => {
      if (arquivos.has(p)) throw Error('Um nome do pacote Raylib está ocupado.')
      arquivos.set(p, new TextEncoder().encode(t))
    },
    slug =
      cena.nome
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 52) || 'exportado',
    modulo = `cenario_${slug}`,
    metadados = new Map(cena.arquivos.map((a) => [a.caminho, a])),
    medidas = {
      malhas: cena.nos.reduce((s, n) => s + metadados.get(n.arquivo)!.malhas!, 0),
      triangulos: cena.nos.reduce((s, n) => s + metadados.get(n.arquivo)!.triangulos!, 0),
      recursos: cena.arquivos.length,
      bytesDosRecursos: cena.arquivos.reduce((s, a) => s + a.bytes, 0),
    }
  texto('cenario.json', JSON.stringify(cena))
  texto('cenario.py', RAYLIB_CENARIO_SOURCES['cenario.py'])
  texto(`${modulo}.py`, MODULO_DE_DADOS_RAYLIB)
  texto('main.py', exemploRaylib(modulo))
  texto('requisitos-raylib.txt', `${RAYLIB_UPSTREAM.package}==${RAYLIB_UPSTREAM.version}\n`)
  texto('licencas-modelos.txt', textoDasLicencas(cena.licencas))
  texto(
    'LEIA-ME.txt',
    [
      `Cenário: ${cena.nome}`,
      `Fonte: ${cena.fonte.cenario}, revisão ${cena.fonte.revisao}, SHA-256 ${cena.fonte.digest}.`,
      '',
      'COMO ABRIR',
      'Extraia o ZIP. Nesta pasta: python -m pip install -r requisitos-raylib.txt',
      'Depois execute: python main.py. Python 3.12 ou mais novo. Não é necessário login na plataforma.',
      'O exemplo inspeciona a cena com câmera livre, inclusive quando o início está sobre água ou uma ponte. Seu programa conecta as consultas de chão/caixas às próprias regras de movimento.',
      `O exemplo importa ${modulo}.py; esse módulo lê cenario.json e usa o auxiliar cenario.py.`,
      'Os modelos estão em models/; o terreno inclui alturas Float32 little endian, PNG16 e pintura.',
      'O estático foi agrupado por região/material pelo mesmo compilador da ferramenta. Metros, Y para cima.',
      '',
      'USAR NO SEU PROGRAMA',
      'Abra a janela Raylib antes de carregar. Dentro de begin_mode_3d, chame lugar.desenhar().',
      'lugar.altura(x,z) retorna None onde não há chão, incluindo buracos e recortes.',
      'lugar.tem_chao(x,z) consulta o domínio; lugar.colide_caixa(minimo,maximo) consulta caixas de obstáculos.',
      'lugar.dados conserva entidades, propriedades, águas, caminhos, zonas, rotas, câmeras, luzes e fonte.',
      'lugar.animacoes(idDoNo) lista clipes; lugar.animar(idDoNo, indice, quadro) usa o Raylib nativo.',
      'Ao terminar, chame lugar.descartar() antes de close_window. O auxiliar não cria câmera, loop ou regras de jogo.',
      '',
      'DIFERENÇAS DO DESTINO',
      ...LIMITACOES_DO_RAYLIB,
      '',
      'LICENÇAS',
      'Consulte licencas-modelos.txt. Bibliotecas restritas não ganham licença adicional pela exportação.',
      `O pacote requer ${RAYLIB_UPSTREAM.package} ${RAYLIB_UPSTREAM.version}; seus termos acompanham a instalação oficial.`,
    ].join('\n'),
  )
  if (
    arquivos.size > LIMITES_DA_EXPORTACAO.arquivos + 16 ||
    [...arquivos.values()].reduce((s, b) => s + b.length, 0) >
      LIMITES_DA_EXPORTACAO.bytesDoPacote + MAX_BYTES_DO_MANIFESTO + 1024 * 1024
  )
    throw Error('O pacote Raylib excede o orçamento de distribuição.')
  sinal.throwIfAborted()
  return { arquivos, cena, modulo, medidas, avisos }
}

export async function exportarPacoteRaylib(
  entrada: PacoteCompilado,
  sinal: AbortSignal,
  opcoes: Opcoes = {},
) {
  const r = await arquivosDoPacoteRaylib(entrada, sinal, opcoes),
    blob = await zipFilesBlob(
      [...r.arquivos].map(([path, bytes]) => ({ path, bytes })),
      {
        signal: sinal,
        maxEntries: LIMITES_DA_EXPORTACAO.arquivos + 16,
        maxReadyBytes: LIMITES_DA_EXPORTACAO.bytesDoPacote + MAX_BYTES_DO_MANIFESTO + 1024 * 1024,
        maxCompressedBytes:
          LIMITES_DA_EXPORTACAO.bytesDoPacote + MAX_BYTES_DO_MANIFESTO + 40 * 1024 * 1024,
        onProgress: (p) => opcoes.progresso?.(p.processed, p.total),
      },
    )
  return { blob, medidas: r.medidas, avisos: r.avisos }
}
