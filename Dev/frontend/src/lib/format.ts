/** Formatadores pt-BR compartilhados. */

export const num = (v: number): string => v.toLocaleString('pt-BR');

export const pct = (v: number, casas = 1): string =>
  `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`;
