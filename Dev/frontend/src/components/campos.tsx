import type { ChangeEvent, ReactNode } from 'react';
import type { ProblemaValidacao } from '../api/types';

const cssId = (campo: string) => campo.replace(/[^a-z0-9]+/gi, '-');

export function ResumoErros({ lista }: { lista: ProblemaValidacao[] }) {
  if (lista.length === 0) return null;
  return (
    <div className="callout callout-soft" role="alert" aria-live="assertive">
      <strong>
        {lista.length === 1 ? 'Falta 1 campo:' : `Faltam ${lista.length} campos:`}
      </strong>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
        {lista.map((e, i) => (
          <li key={`${e.campo}-${i}`}>
            <a href={`#campo-${cssId(e.campo)}`}>{e.mensagem}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface BaseProps {
  campo: string;
  label: ReactNode;
  erro?: string;
  ajuda?: ReactNode;
  obrigatorio?: boolean;
  autofill?: boolean;
}

function Rotulo({ campo, label, ajuda, obrigatorio, autofill }: BaseProps) {
  return (
    <>
      <label htmlFor={`campo-${cssId(campo)}-in`} className="campo-label">
        {label}
        {obrigatorio && <span className="req"> *</span>}
        {autofill && <span className="autofill-tag">✓ autopreenchido</span>}
      </label>
      {ajuda && <span className="campo-ajuda">{ajuda}</span>}
    </>
  );
}

export function TextoCampo({
  valor,
  onChange,
  placeholder,
  inputMode,
  maxLength,
  type = 'text',
  ...base
}: BaseProps & {
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: 'text' | 'numeric' | 'email' | 'tel';
  maxLength?: number;
  type?: string;
}) {
  return (
    <div className="field" id={`campo-${cssId(base.campo)}`}>
      <Rotulo {...base} />
      <input
        id={`campo-${cssId(base.campo)}-in`}
        type={type}
        value={valor}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={base.erro ? true : undefined}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
      {base.erro && <span className="campo-erro">{base.erro}</span>}
    </div>
  );
}

export function SelectCampo({
  valor,
  onChange,
  opcoes,
  placeholder,
  ...base
}: BaseProps & {
  valor: string;
  onChange: (v: string) => void;
  opcoes: { valor: string; texto: string }[];
  placeholder?: string;
}) {
  return (
    <div className="field" id={`campo-${cssId(base.campo)}`}>
      <Rotulo {...base} />
      <select
        id={`campo-${cssId(base.campo)}-in`}
        className="select-plain"
        value={valor}
        aria-invalid={base.erro ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
      {base.erro && <span className="campo-erro">{base.erro}</span>}
    </div>
  );
}

export function SimNao({
  valor,
  onChange,
  ...base
}: BaseProps & { valor: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="field" id={`campo-${cssId(base.campo)}`}>
      <Rotulo {...base} />
      <div
        className="radio-group"
        role="group"
        aria-label={typeof base.label === 'string' ? base.label : base.campo}
      >
        <button type="button" className={valor === true ? 'ativo' : undefined} aria-pressed={valor === true} onClick={() => onChange(true)}>
          Sim
        </button>
        <button type="button" className={valor === false ? 'ativo' : undefined} aria-pressed={valor === false} onClick={() => onChange(false)}>
          Não
        </button>
      </div>
      {base.erro && <span className="campo-erro">{base.erro}</span>}
    </div>
  );
}

export function CheckCampo({
  marcado,
  onChange,
  texto,
  campo,
}: {
  marcado: boolean;
  onChange: (v: boolean) => void;
  texto: ReactNode;
  campo: string;
}) {
  return (
    <label className="check" htmlFor={`campo-${cssId(campo)}-ck`}>
      <input
        id={`campo-${cssId(campo)}-ck`}
        type="checkbox"
        checked={marcado}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{texto}</span>
    </label>
  );
}

export function MultiCheck({
  opcoes,
  selecionados,
  onChange,
  ...base
}: BaseProps & {
  opcoes: string[];
  selecionados: string[];
  onChange: (v: string[]) => void;
}) {
  const alternar = (o: string) =>
    onChange(selecionados.includes(o) ? selecionados.filter((x) => x !== o) : [...selecionados, o]);
  return (
    <div className="field" id={`campo-${cssId(base.campo)}`}>
      <Rotulo {...base} />
      <div className="multicheck">
        {opcoes.map((o) => (
          <label key={o} className="check">
            <input type="checkbox" checked={selecionados.includes(o)} onChange={() => alternar(o)} />
            <span>{o}</span>
          </label>
        ))}
      </div>
      {base.erro && <span className="campo-erro">{base.erro}</span>}
    </div>
  );
}

export function ProgressoFino({ atual, total, titulo }: { atual: number; total: number; titulo: string }) {
  const pct = Math.round(((atual + 1) / total) * 100);
  return (
    <div>
      <div
        className="progress-thin"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <i style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-rot">
        Passo {atual + 1} de {total} · {titulo}
      </div>
    </div>
  );
}
