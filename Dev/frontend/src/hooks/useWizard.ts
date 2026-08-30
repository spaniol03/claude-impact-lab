import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ProblemaValidacao } from '../api/types';
import { PASSOS, validarPasso, type PassoId } from '../forms/passos';
import { inscricaoVazia, type DadosInscricao } from '../forms/schema';
import { rascunho } from '../forms/storage';

export interface Wizard {
  dados: DadosInscricao;
  passoIndex: number;
  passoId: PassoId;
  total: number;
  visitados: Set<number>;
  erros: ProblemaValidacao[];
  temRascunho: boolean;
  atualizar: (patch: (d: DadosInscricao) => DadosInscricao) => void;
  irPara: (index: number) => void;
  avancar: () => boolean;
  voltar: () => void;
  reiniciar: () => void;
  limparRascunhoSalvo: () => void;
}

export function useWizard(idsQuestionario: string[] = []): Wizard {
  const salvo = useRef(rascunho.carregar());
  const [dados, setDados] = useState<DadosInscricao>(
    () => salvo.current?.dados ?? inscricaoVazia(),
  );
  const [passoIndex, setPassoIndex] = useState<number>(salvo.current?.passo ?? 0);
  const [visitados, setVisitados] = useState<Set<number>>(
    () => new Set(salvo.current?.visitados ?? [0]),
  );
  const [erros, setErros] = useState<ProblemaValidacao[]>([]);
  const temRascunho = salvo.current != null;

  // autosave (debounce leve)
  useEffect(() => {
    const t = setTimeout(
      () => rascunho.salvar({ dados, passo: passoIndex, visitados: [...visitados] }),
      400,
    );
    return () => clearTimeout(t);
  }, [dados, passoIndex, visitados]);

  const passoId = PASSOS[Math.min(passoIndex, PASSOS.length - 1)].id;

  const atualizar = useCallback((patch: (d: DadosInscricao) => DadosInscricao) => {
    setDados((d) => patch(structuredClone(d)));
  }, []);

  const irPara = useCallback(
    (index: number) => {
      if (index < 0 || index >= PASSOS.length) return;
      // só permite pular para passos já visitados (ou o imediatamente seguinte)
      if (!visitados.has(index) && index > passoIndex) return;
      setErros([]);
      setPassoIndex(index);
      setVisitados((v) => new Set(v).add(index));
    },
    [visitados, passoIndex],
  );

  const avancar = useCallback((): boolean => {
    const problemas = validarPasso(passoId, dados, idsQuestionario);
    setErros(problemas);
    if (problemas.length > 0) return false;
    const prox = Math.min(passoIndex + 1, PASSOS.length - 1);
    setPassoIndex(prox);
    setVisitados((v) => new Set(v).add(prox));
    return true;
  }, [passoId, dados, passoIndex, idsQuestionario]);

  const voltar = useCallback(() => {
    setErros([]);
    setPassoIndex((i) => Math.max(0, i - 1));
  }, []);

  const reiniciar = useCallback(() => {
    rascunho.limpar();
    salvo.current = null;
    setDados(inscricaoVazia());
    setVisitados(new Set([0]));
    setPassoIndex(0);
    setErros([]);
  }, []);

  const limparRascunhoSalvo = useCallback(() => {
    rascunho.limpar();
  }, []);

  return useMemo(
    () => ({
      dados,
      passoIndex,
      passoId,
      total: PASSOS.length,
      visitados,
      erros,
      temRascunho,
      atualizar,
      irPara,
      avancar,
      voltar,
      reiniciar,
      limparRascunhoSalvo,
    }),
    [dados, passoIndex, passoId, visitados, erros, temRascunho, atualizar, irPara, avancar, voltar, reiniciar, limparRascunhoSalvo],
  );
}
