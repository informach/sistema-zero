import { useMemo } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDosDesafios, useDesafios } from '../estado/desafios'
import { corDaSuaIlha, type ParteDaSuaIlha } from '../sistemas/cor-da-sua-ilha'

/** Os quadros feitos da sua ilha (só aparência; vazio enquanto o serviço não responde). */
function useQuadrosDaSuaIlha(): readonly number[] {
  const { loja, plataforma } = useJogo()
  const cores = useDesafios(lojaDosDesafios(loja, plataforma), (s) => s.cores)
  return useMemo(() => cores.ilhas.find((i) => i.id === 'sua-ilha')?.quadros ?? [], [cores])
}

/** A parte da sua ilha tem cor? (A17 e o quadro da parte, lacunas de 01/11/2026.) */
export function useCorDaParte(parte: ParteDaSuaIlha): boolean {
  const quadros = useQuadrosDaSuaIlha()
  return useEstado((s) => corDaSuaIlha(s.salvamento, s.visita !== null, quadros)[parte])
}
