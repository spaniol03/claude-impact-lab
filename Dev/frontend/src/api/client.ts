import type {
  Ano,
  Banda,
  Comprovante,
  FormularioRef,
  LiberacaoAno,
  InscricaoDetalhe,
  InscricaoResumo,
  Meta,
  OverviewAno,
  PrePreenchimento,
  ProblemaValidacao,
  ResumoInscricao,
  UnidadesPage,
} from './types';

/**
 * Cliente HTTP minimo (fetch nativo, sem dependencias).
 * Em dev usa o proxy do Vite (base ''); em build usa VITE_API_BASE_URL.
 */
const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Erro 422 da simulação de inscrição, com a lista de problemas por campo. */
export class ValidacaoError extends Error {
  constructor(readonly problemas: ProblemaValidacao[]) {
    super(`${problemas.length} problema(s) de validação`);
    this.name = 'ValidacaoError';
  }
}

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json())?.detail ?? detail;
    } catch {
      /* corpo nao-JSON */
    }
    throw new ApiError(res.status, typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return res.json() as Promise<T>;
}

export const api = {
  meta: () => get<Meta>('/api/v1/meta'),
  anos: () => get<{ anos: Ano[] }>('/api/v1/anos'),
  overview: (ano: Ano) => get<OverviewAno>('/api/v1/overview', { ano }),
  unidades: (opts: { ano: Ano; busca?: string; banda?: Banda; limite?: number; offset?: number }) =>
    get<UnidadesPage>('/api/v1/unidades', opts),
  avaliarInscricao: (ano: Ano, unidades: string[]) =>
    get<ResumoInscricao>('/api/v1/inscricao/avaliar', { ano, unidades: unidades.join(',') }),
  liberacao: (ano: Ano) => get<LiberacaoAno>('/api/v1/liberacao', { ano }),
  formulario: () => get<FormularioRef>('/api/v1/inscricao/formulario'),
  prePreenchimento: (cpf: string) =>
    get<PrePreenchimento>('/api/v1/inscricao/pre-preenchimento', { cpf }),
  registrarInscricao: (payload: unknown) => post<Comprovante>('/api/v1/inscricoes', payload),
  obterInscricao: (protocolo: string) =>
    get<InscricaoDetalhe>(`/api/v1/inscricoes/${encodeURIComponent(protocolo)}`),
  inscricoesRecebidas: (limite = 50) =>
    get<InscricaoResumo[]>('/api/v1/inscricoes', { limite }),
  health: () => get<{ status: string; agregados_disponiveis: boolean }>('/health'),
};

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.ok) return res.json() as Promise<T>;

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    throw new ApiError(res.status, res.statusText);
  }
  const detail = (payload as { detail?: unknown })?.detail;
  if (res.status === 422 && detail && typeof detail === 'object' && 'problemas' in detail) {
    throw new ValidacaoError((detail as { problemas: ProblemaValidacao[] }).problemas);
  }
  // 422 do próprio pydantic (campos estruturalmente ausentes)
  if (res.status === 422 && Array.isArray(detail)) {
    throw new ValidacaoError(
      detail.map((d: { loc?: unknown[]; msg?: string }) => ({
        campo: (d.loc ?? []).slice(1).join('.'),
        mensagem: d.msg ?? 'Campo inválido.',
      })),
    );
  }
  throw new ApiError(res.status, typeof detail === 'string' ? detail : res.statusText);
}
