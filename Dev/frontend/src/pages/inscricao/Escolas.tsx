import { useMemo, useState } from 'react';
import { api } from '../../api/client';
import type { Unidade } from '../../api/types';
import { BadgeBanda, EstadoCarga } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { num } from '../../lib/format';
import type { DadosOpcaoEscola } from '../../forms/schema';
import type { PassoProps } from './tipos';

const MAX = 5;

export function PassoEscolas({ d, set, err }: PassoProps) {
  const [modo, setModo] = useState<'bairro' | 'nome'>('bairro');
  const [termo, setTermo] = useState('');
  const [movida, setMovida] = useState<number | null>(null);

  const sugeridas = useApi(
    () =>
      d.endereco.bairro.trim()
        ? api.unidades({ ano: 'todos', busca: d.endereco.bairro.trim(), limite: 6 })
        : Promise.resolve({ ano: 'todos' as const, total: 0, itens: [] }),
    [d.endereco.bairro],
  );

  const busca = useApi(
    () =>
      termo.trim()
        ? api.unidades({ ano: 'todos', busca: termo.trim(), limite: 25 })
        : Promise.resolve({ ano: 'todos' as const, total: 0, itens: [] }),
    [termo],
  );

  const opcoes = useMemo(() => [...d.opcoes].sort((a, b) => a.ordem - b.ordem), [d.opcoes]);
  const codigos = opcoes.map((o) => o.unidade);
  const cheio = opcoes.length >= MAX;
  const algumaConcorrida = opcoes.some((o) => o.concorrida);

  function alternar(u: Unidade) {
    set((s) => {
      if (s.opcoes.some((o) => o.unidade === u.unidade))
        return {
          ...s,
          opcoes: s.opcoes.filter((o) => o.unidade !== u.unidade).map((o, i) => ({ ...o, ordem: i + 1 })),
        };
      if (s.opcoes.length >= MAX) return s;
      const nova: DadosOpcaoEscola = {
        ordem: s.opcoes.length + 1,
        unidade: u.unidade,
        nome: u.nome,
        bairro: u.bairro,
        banda: u.banda,
        concorrida: u.top10,
      };
      return { ...s, opcoes: [...s.opcoes, nova] };
    });
  }

  function remover(unidade: string) {
    set((s) => ({
      ...s,
      opcoes: s.opcoes.filter((o) => o.unidade !== unidade).map((o, i) => ({ ...o, ordem: i + 1 })),
    }));
  }

  function mover(i: number, dir: -1 | 1) {
    set((s) => {
      const arr = [...s.opcoes].sort((a, b) => a.ordem - b.ordem);
      const j = i + dir;
      if (j < 0 || j >= arr.length) return s;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...s, opcoes: arr.map((o, k) => ({ ...o, ordem: k + 1 })) };
    });
    setMovida(i + dir);
    setTimeout(() => setMovida(null), 600);
  }

  function ChecklistItem({ u }: { u: Unidade }) {
    const marcada = codigos.includes(u.unidade);
    return (
      <label className="check-row">
        <input
          type="checkbox"
          checked={marcada}
          disabled={!marcada && cheio}
          onChange={() => alternar(u)}
        />
        <span>
          {u.nome}
          <span className="fine">
            {' '}
            — {u.bairro || '—'} · fila {num(u.fila)} / confirm. {num(u.confirmados)}
          </span>
          <span className="linha" style={{ gap: 4, marginTop: 3 }}>
            <BadgeBanda banda={u.banda} />
            {u.top10 && u.banda !== 'alta' && <span className="warn-tag">⚠ concorrida</span>}
          </span>
        </span>
      </label>
    );
  }

  return (
    <div className="card">
      <h2>Escolha das Escolas</h2>
      <p className="fine" style={{ marginBottom: 8 }}>
        Até <b>{MAX} unidades</b>. Use as setas ▲▼ para ordenar sua prioridade. O aviso de
        &quot;concorrida&quot; é só informação — <b>não impede</b> a criança de ser chamada.
      </p>
      <p className="fine" style={{ marginBottom: 12 }}>
        Cada creche mostra a procura histórica:{' '}
        <BadgeBanda banda="baixa" /> mais vagas que fila ·{' '}
        <BadgeBanda banda="media" /> procura equilibrada ·{' '}
        <BadgeBanda banda="alta" /> fila bem maior que as vagas. Vale ter ao menos uma opção de
        procura baixa ou média no conjunto.
      </p>

      <div className="callout callout-info">
        <b>Sugeridas para o seu endereço</b>
        {d.endereco.bairro ? ` — ${d.endereco.bairro}` : ''}
        <div style={{ marginTop: 10 }}>
          <EstadoCarga carregando={sugeridas.carregando} erro={sugeridas.erro} onRetry={sugeridas.recarregar}>
            {sugeridas.dados && sugeridas.dados.itens.length > 0 ? (
              <div className="checklist-panel" style={{ background: '#fff' }}>
                {sugeridas.dados.itens.map((u) => (
                  <ChecklistItem key={u.unidade} u={u} />
                ))}
              </div>
            ) : (
              <p className="fine" style={{ margin: 0 }}>
                Preencha o bairro no passo anterior para ver sugestões próximas.
              </p>
            )}
          </EstadoCarga>
        </div>
      </div>

      <p className="fine" style={{ margin: '16px 0 8px' }}>Não encontrou? Busque em outro lugar:</p>
      <div className="search-toggle">
        <button type="button" className={`toggle-btn${modo === 'bairro' ? ' active' : ''}`} onClick={() => setModo('bairro')}>
          Por bairro
        </button>
        <button type="button" className={`toggle-btn${modo === 'nome' ? ' active' : ''}`} onClick={() => setModo('nome')}>
          Por nome da creche
        </button>
      </div>
      <div className="field">
        <label>{modo === 'bairro' ? 'Bairro' : 'Nome da creche'}</label>
        <input
          type="search"
          placeholder={modo === 'bairro' ? 'ex.: TIJUCA, CAMPO GRANDE…' : 'ex.: CM SENNINHA, EDI…'}
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
        />
      </div>
      {termo.trim() && (
        <EstadoCarga carregando={busca.carregando} erro={busca.erro} onRetry={busca.recarregar}>
          {busca.dados && (
            <div className="checklist-panel">
              {busca.dados.itens.length === 0 && (
                <p className="fine" style={{ margin: 0 }}>Nenhuma creche para &quot;{termo}&quot;.</p>
              )}
              {busca.dados.itens.map((u) => (
                <ChecklistItem key={u.unidade} u={u} />
              ))}
            </div>
          )}
        </EstadoCarga>
      )}

      <h3>
        Suas opções <span className="tag-count">{opcoes.length}/{MAX}</span>
      </h3>
      {err['opcoes'] && <span className="campo-erro">{err['opcoes']}</span>}
      {opcoes.length === 0 && <p className="fine">Marque uma creche acima para começar.</p>}
      {opcoes.map((o, i) => (
        <div key={o.unidade} className={`school-card${movida === i ? ' just-moved' : ''}`}>
          <div className="pos">{i + 1}</div>
          <div className="info">
            <div className="name">{o.nome}</div>
            <div className="bairro">{o.bairro || '—'}</div>
            <span className="linha" style={{ gap: 4, marginTop: 4 }}>
              {o.banda && <BadgeBanda banda={o.banda} />}
              {o.concorrida && o.banda !== 'alta' && <span className="warn-tag">⚠ concorrida</span>}
            </span>
            <button className="rm" onClick={() => remover(o.unidade)}>
              remover
            </button>
          </div>
          <div className="moves">
            <button onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir prioridade">
              ▲
            </button>
            <button onClick={() => mover(i, 1)} disabled={i === opcoes.length - 1} aria-label="Descer prioridade">
              ▼
            </button>
          </div>
        </div>
      ))}

      {algumaConcorrida && (
        <div className="callout callout-soft">
          ⚠ <b>Você escolheu unidade(s) concorrida(s)</b> — fila maior que a maioria. No histórico
          da rede, marcar mais unidades concorridas não aumentou a chance de confirmação. Vale ter
          ao menos uma opção de concorrência menor no conjunto.
        </div>
      )}
    </div>
  );
}
