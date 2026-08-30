import type { ReactNode } from 'react';
import type { Ano, Banda } from '../api/types';

export function EstadoCarga({
  carregando,
  erro,
  onRetry,
  children,
}: {
  carregando: boolean;
  erro?: string;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (erro) {
    return (
      <div className="callout callout-soft" role="alert">
        <strong>Não foi possível carregar os dados.</strong>
        <p style={{ margin: '4px 0 8px' }}>{erro}</p>
        <p className="fine" style={{ margin: '0 0 8px' }}>
          Verifique se a API está no ar (<span className="mono">uvicorn app.main:app</span>) e se
          os agregados foram gerados (<span className="mono">python -m app.etl.build_aggregates</span>).
        </p>
        {onRetry && (
          <button className="btn btn-sec" onClick={onRetry}>
            Tentar de novo
          </button>
        )}
      </div>
    );
  }
  if (carregando) {
    return (
      <div className="card fine" aria-busy="true">
        Carregando…
      </div>
    );
  }
  return <>{children}</>;
}

export function StatCard({
  valor,
  rotulo,
  destaque,
}: {
  valor: ReactNode;
  rotulo: ReactNode;
  destaque?: boolean;
}) {
  return (
    <div className="card stat" style={destaque ? { borderColor: 'var(--c-warn-borda)' } : undefined}>
      <div className="valor">{valor}</div>
      <div className="rotulo">{rotulo}</div>
    </div>
  );
}

const ROTULO_BANDA: Record<Banda, string> = {
  baixa: 'concorrência baixa',
  media: 'concorrência média',
  alta: 'concorrência alta',
};

export function BadgeBanda({ banda }: { banda: Banda }) {
  return <span className={`badge-banda ${banda}`}>{ROTULO_BANDA[banda]}</span>;
}

export function BadgeTop10() {
  return (
    <span className="warn-tag" title="Entre as ~10% unidades mais concorridas da rede">
      ⚠ concorrida
    </span>
  );
}

export function SeletorAno({
  valor,
  anos,
  onChange,
  id = 'seletor-ano',
}: {
  valor: Ano;
  anos: Ano[];
  onChange: (a: Ano) => void;
  id?: string;
}) {
  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label htmlFor={id}>Processo / ano</label>
      <select className="select-plain" id={id} value={valor} onChange={(e) => onChange(e.target.value)}>
        {anos.map((a) => (
          <option key={a} value={a}>
            {a === 'todos' ? 'Todos os anos (2021–2025)' : a}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Barras horizontais — sem lib de gráfico. */
export function BarrasHorizontais({
  dados,
  formato = (v) => v.toLocaleString('pt-BR'),
  cor = 'var(--c-acao)',
}: {
  dados: { rotulo: string; valor: number; sub?: string; destaque?: boolean }[];
  formato?: (v: number) => string;
  cor?: string;
}) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  return (
    <div className="pilha" style={{ gap: 'var(--e-3)' }}>
      {dados.map((d) => (
        <div key={d.rotulo}>
          <div className="linha entre" style={{ marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{d.rotulo}</span>
            <span className="tabular" style={{ fontWeight: 700 }}>
              {formato(d.valor)}
              {d.sub && <span className="fine"> · {d.sub}</span>}
            </span>
          </div>
          <div style={{ background: 'var(--c-linha)', borderRadius: 4, height: 10, overflow: 'hidden' }}>
            <div
              style={{
                width: `${(d.valor / max) * 100}%`,
                height: '100%',
                background: d.destaque ? 'var(--c-alta)' : cor,
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Callout({
  tom = 'info',
  children,
}: {
  tom?: 'info' | 'alerta';
  children: ReactNode;
}) {
  return <div className={`callout callout-${tom === 'alerta' ? 'soft' : 'info'}`}>{children}</div>;
}
