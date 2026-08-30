import { useState } from 'react';
import { api } from '../api/client';
import type { Ano, Banda } from '../api/types';
import { BadgeBanda, BadgeTop10, Callout, EstadoCarga, SeletorAno } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { num } from '../lib/format';

const ANOS: Ano[] = ['todos', '2025', '2024', '2023', '2022', '2021'];
const BANDAS: { v: '' | Banda; t: string }[] = [
  { v: '', t: 'Todas as concorrências' },
  { v: 'baixa', t: 'Concorrência baixa' },
  { v: 'media', t: 'Concorrência média' },
  { v: 'alta', t: 'Concorrência alta' },
];

export function Concorrencia() {
  const [ano, setAno] = useState<Ano>('todos');
  const [busca, setBusca] = useState('');
  const [banda, setBanda] = useState<'' | Banda>('');

  const lista = useApi(
    () =>
      api.unidades({
        ano,
        busca: busca.trim() || undefined,
        banda: banda || undefined,
        limite: 60,
      }),
    [ano, busca, banda],
  );

  return (
    <div className="pilha" style={{ gap: 'var(--espaco-5)' }}>
      <section>
        <p className="tenue" style={{ marginBottom: 4 }}>Consulta pública</p>
        <h1>Concorrência das creches por região</h1>
        <p className="intro">
          Antes de escolher suas opções, veja quanta fila cada creche costuma acumular em relação
          às vagas confirmadas. A faixa (baixa / média / alta) resume o histórico; a marca
          &quot;muito concorrida&quot; indica as ~10% de unidades que concentram a maior parte da
          fila da rede.
        </p>
      </section>

      <div className="linha">
        <SeletorAno valor={ano} anos={ANOS} onChange={setAno} />
        <label className="campo">
          Concorrência
          <select value={banda} onChange={(e) => setBanda(e.target.value as '' | Banda)}>
            {BANDAS.map((b) => (
              <option key={b.v} value={b.v}>
                {b.t}
              </option>
            ))}
          </select>
        </label>
        <label className="campo" style={{ flex: 1, minWidth: 220 }}>
          Buscar
          <input
            type="search"
            placeholder="nome da creche ou bairro"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>
      </div>

      <EstadoCarga carregando={lista.carregando} erro={lista.erro} onRetry={lista.recarregar}>
        {lista.dados && (
          <>
            <p className="tenue">
              {num(lista.dados.total)} unidades no filtro · mostrando {lista.dados.itens.length}
            </p>
            <div className="tabela-wrap">
              <table className="dados">
                <thead>
                  <tr>
                    <th>Creche</th>
                    <th>Bairro</th>
                    <th>Fila</th>
                    <th>Confirmados</th>
                    <th>Concorrência</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.dados.itens.map((u) => (
                    <tr key={u.unidade}>
                      <td>
                        <strong>{u.nome}</strong>
                        {u.endereco && <div className="tenue">{u.endereco}</div>}
                      </td>
                      <td>{u.bairro || '—'}</td>
                      <td className="tabular">{num(u.fila)}</td>
                      <td className="tabular">{num(u.confirmados)}</td>
                      <td>
                        <div className="pilha" style={{ gap: 4 }}>
                          <BadgeBanda banda={u.banda} />
                          {u.top10 && <BadgeTop10 />}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {lista.dados.itens.length === 0 && (
                    <tr>
                      <td colSpan={5} className="tenue">
                        Nenhuma creche encontrada com esse filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Callout>
              Esta consulta é informativa. A concorrência não altera a ordem de classificação nem a
              prioridade por vulnerabilidade — serve para você montar um conjunto equilibrado de
              opções.
            </Callout>
          </>
        )}
      </EstadoCarga>
    </div>
  );
}
