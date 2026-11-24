import {
  type DocumentoDeCenario,
  type IluminacaoDeCenario,
  referenciarTextura,
} from '@sistemazero/molda-cenarios-core/v2'
import type { Palco } from '@sistemazero/molda-cenarios-motor'
import { type RefObject, useCallback, useState } from 'react'
import { comandosDoAmbiente, type RascunhoDeIluminacao } from './ambiente-formulario'
import type { ControladorDaOficina } from './controlador'
import type { TexturaDeBiblioteca } from './portas'
import { useRascunhoDeAmbiente } from './useRascunhoDeAmbiente'

export type SecaoDoAmbiente = 'sol' | 'ambiente' | 'ceu' | 'nevoa'
export function useAmbiente({
  controlador,
  palco,
  documento,
  ativo,
}: {
  controlador: ControladorDaOficina
  palco: RefObject<Palco | null>
  documento: DocumentoDeCenario
  ativo: boolean
}) {
  const e = useRascunhoDeAmbiente<RascunhoDeIluminacao>({
      controlador,
      palco,
      documento,
      ativo,
      dono: 'luz',
      comandos: comandosDoAmbiente,
      continuo: true,
    }),
    [secao, setSecao] = useState<SecaoDoAmbiente | null>('sol')
  const abrir = (novaSecao: SecaoDoAmbiente) => {
    setSecao(novaSecao)
    if (!e.lerRascunho())
      e.abrir({ iluminacao: controlador.getState().documento.iluminacao, texturas: [] })
  }
  const mudar = (iluminacao: IluminacaoDeCenario) => e.mudar((r) => ({ ...r, iluminacao }))
  const usarPanorama = useCallback(
    (textura: TexturaDeBiblioteca) => {
      if (textura.largura !== textura.altura * 2) {
        e.informarErro('Escolha uma imagem de panorama com proporção 2:1.')
        return
      }
      e.mudar((r) => {
        const doc = controlador.getState().documento,
          referencias = [
            ...(doc.texturas ?? []),
            ...r.texturas.filter((t) => !doc.texturas?.some((p) => p.id === t.id)),
          ],
          ref = referenciarTextura(
            { ...doc, texturas: referencias },
            {
              id: textura.id,
              biblioteca: textura.bibliotecaId,
              textura: textura.id,
              digest: textura.digest,
              nome: textura.nome.slice(0, 120),
            },
          ),
          novas = ref.comandos.flatMap((c) => (c.tipo === 'textura.definir' ? [c.textura] : [])),
          antes = r.iluminacao.ceu
        return {
          texturas: [...r.texturas, ...novas.filter((t) => !r.texturas.some((p) => p.id === t.id))],
          iluminacao: {
            ...r.iluminacao,
            ceu: {
              tipo: 'panorama',
              textura: ref.id,
              giro: antes?.tipo === 'panorama' ? antes.giro : 0,
              intensidade: antes?.tipo === 'panorama' ? antes.intensidade : 1,
            },
          },
        }
      })
    },
    [controlador, e.mudar, e.informarErro],
  )
  return { ...e, abrir, mudar, secao, setSecao, usarPanorama }
}
