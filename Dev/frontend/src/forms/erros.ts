import type { ProblemaValidacao } from '../api/types';

export type MapaErros = Record<string, string>;

/** Converte a lista de problemas (campo → mensagem) num mapa para lookup por campo. */
export function mapaErros(lista: ProblemaValidacao[]): MapaErros {
  const m: MapaErros = {};
  for (const e of lista) if (!m[e.campo]) m[e.campo] = e.mensagem;
  return m;
}
