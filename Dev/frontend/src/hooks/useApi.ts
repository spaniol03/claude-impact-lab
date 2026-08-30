import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';

type Estado<T> = {
  dados: T | undefined;
  carregando: boolean;
  erro: string | undefined;
  recarregar: () => void;
};

/** Executa `fn` quando as `deps` mudam, com controle de corrida e recarga manual. */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[]): Estado<T> {
  const [dados, setDados] = useState<T>();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string>();
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(undefined);
    fnRef
      .current()
      .then((d) => vivo && setDados(d))
      .catch((e: unknown) => {
        if (!vivo) return;
        setErro(e instanceof ApiError ? e.message : 'Falha ao carregar dados da API.');
      })
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const recarregar = useCallback(() => setNonce((n) => n + 1), []);
  return { dados, carregando, erro, recarregar };
}
