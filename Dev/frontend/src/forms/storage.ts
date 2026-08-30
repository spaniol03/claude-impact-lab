/** RASCUNHO (enquanto se preenche) e uma cópia dos comprovantes ficam no navegador
 *  (localStorage). A inscrição enviada é gravada no banco do backend — a tela de
 *  consulta busca lá primeiro; o localStorage é só conveniência offline. */

import type { Comprovante } from '../api/types';
import type { DadosInscricao } from './schema';

const K_RASCUNHO = 'creche.inscricao.rascunho.v1';
const K_COMPROVANTES = 'creche.inscricao.comprovantes.v1';

interface Rascunho {
  dados: DadosInscricao;
  passo: number;
  visitados: number[];
  salvo_em: string;
}

function ler<T>(chave: string): T | null {
  try {
    const raw = localStorage.getItem(chave);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* modo privado / cota — segue sem persistir */
  }
}

export const rascunho = {
  carregar: (): Rascunho | null => ler<Rascunho>(K_RASCUNHO),
  salvar: (r: Omit<Rascunho, 'salvo_em'>): void =>
    gravar(K_RASCUNHO, { ...r, salvo_em: new Date().toISOString() }),
  limpar: (): void => {
    try {
      localStorage.removeItem(K_RASCUNHO);
    } catch {
      /* ignore */
    }
  },
};

export const comprovantes = {
  listar: (): Comprovante[] => ler<Comprovante[]>(K_COMPROVANTES) ?? [],
  adicionar: (c: Comprovante): void => {
    const atual = comprovantes.listar().filter((x) => x.protocolo !== c.protocolo);
    gravar(K_COMPROVANTES, [c, ...atual].slice(0, 20));
  },
  buscar: (protocolo: string): Comprovante | undefined =>
    comprovantes.listar().find((c) => c.protocolo === protocolo.trim()),
};
