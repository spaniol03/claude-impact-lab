import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Ano } from '../api/types';
import { useApi } from '../hooks/useApi';
import { BarrasHorizontais, Callout, EstadoCarga, SeletorAno, StatCard } from '../components/ui';
import { num, pct } from '../lib/format';

const ANOS: Ano[] = ['todos', '2025', '2024', '2023', '2022', '2021'];

export function VisaoGeral() {
  const [ano, setAno] = useState<Ano>('todos');
  const meta = useApi(() => api.meta(), []);
  const ov = useApi(() => api.overview(ano), [ano]);

  return (
    <div className="pilha" style={{ gap: 'var(--espaco-6)' }}>
      <section>
        <p className="tenue" style={{ marginBottom: 4 }}>
          Claude Impact Lab · Diagnóstico de vagas em creches
        </p>
        <h1>O problema não é falta de vaga — é vaga presa no lugar errado</h1>
        <p className="intro">
          Cada criança reserva até 5 unidades ao mesmo tempo, e a fila é resolvida unidade por
          unidade, isolada. O resultado: algumas creches afogadas em fila enquanto vagas já
          livres em outras esperam dias para serem preenchidas. Os números abaixo são medidos
          diretamente na base de {meta.dados ? num(meta.dados.linhas_query_a) : '837 mil'} opções
          de inscrição (2021–2025).
        </p>
        <div className="linha">
          <Link className="btn" to="/inscricao">
            Ver a frente da família →
          </Link>
          <Link className="btn btn-secundario" to="/painel-servidor">
            Ver a frente do servidor →
          </Link>
        </div>
      </section>

      <div className="linha entre">
        <SeletorAno valor={ano} anos={ANOS} onChange={setAno} />
        {meta.dados && (
          <span className="tenue">
            Agregados gerados em{' '}
            {new Date(meta.dados.gerado_em).toLocaleString('pt-BR', { dateStyle: 'short' })}
          </span>
        )}
      </div>

      <EstadoCarga carregando={ov.carregando} erro={ov.erro} onRetry={ov.recarregar}>
        {ov.dados && (
          <>
            <section className="grid grid-auto">
              <StatCard valor={num(ov.dados.totais.inscricoes)} rotulo="inscrições no recorte" />
              <StatCard valor={num(ov.dados.totais.opcoes)} rotulo="opções de creche marcadas" />
              <StatCard valor={num(ov.dados.totais.unidades)} rotulo="unidades escolares" />
              <StatCard
                valor={pct(ov.dados.pct_3mais_opcoes)}
                rotulo="das inscrições marcam 3+ opções"
              />
              <StatCard
                destaque
                valor={pct(ov.dados.concentracao_fila.pct_fila_top10_unidades)}
                rotulo={`da fila de espera está em ${ov.dados.concentracao_fila.n_unidades_top10} unidades (10% da rede)`}
              />
            </section>

            <section className="secao">
              <h2>Marcar mais opções não confirma mais — só cancela mais</h2>
              <p className="intro">
                A taxa de confirmação fica estável (~54–58%) independentemente de quantas opções
                a família marca. O que cresce é o cancelamento pelo sistema: reservas que
                ocuparam fila em outras unidades e nunca viraram matrícula.
              </p>
              <div className="tabela-wrap">
                <table className="dados">
                  <thead>
                    <tr>
                      <th>Nº de opções</th>
                      <th>Inscrições</th>
                      <th>Confirmam ao menos 1</th>
                      <th>Média de cancelamentos pelo sistema</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ov.dados.opcoes_dist.map((d) => (
                      <tr key={d.n_opcoes}>
                        <td>
                          <strong>{d.n_opcoes}</strong>
                        </td>
                        <td className="tabular">{num(d.n_inscricoes)}</td>
                        <td className="tabular">{pct(d.taxa_confirma_alguma)}</td>
                        <td className="tabular">
                          <strong style={{ color: d.media_cancel_sistema > 1 ? 'var(--c-alta)' : undefined }}>
                            {d.media_cancel_sistema.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid grid-2">
              <div className="card card-pad">
                <h3>Desfecho de cada opção marcada</h3>
                <p className="tenue" style={{ marginTop: 0 }}>
                  &quot;Cancelado pelo sistema&quot; é a maior fatia — maior até que
                  &quot;Confirmado&quot;.
                </p>
                <BarrasHorizontais
                  dados={ov.dados.situacao_dist.slice(0, 6).map((s) => ({
                    rotulo: s.situacao,
                    valor: s.pct,
                    sub: num(s.n),
                    destaque: s.situacao === 'Cancelado pelo sistema',
                  }))}
                  formato={(v) => pct(v)}
                />
              </div>
              <div className="pilha">
                <StatCard
                  valor={num(ov.dados.totais.em_fila)}
                  rotulo="opções em lista de espera / ativas no recorte"
                />
                <StatCard
                  valor={num(ov.dados.concentracao_fila.n_unidades_com_fila)}
                  rotulo="unidades têm ao menos 1 registro em fila"
                />
                <Callout>
                  Planejar a oferta só pela fila histórica não corrige essa desigualdade: a
                  fila não distingue demanda real de reserva feita &quot;por precaução&quot;.
                </Callout>
              </div>
            </section>

            <Callout tom="alerta">
              <strong>Princípio inegociável:</strong> nenhum número aqui é inventado. Todos são
              calculados a partir do recorte selecionado da base anonimizada. Indicadores
              absolutos não representam a realidade em escala — os padrões relativos, sim.
            </Callout>
          </>
        )}
      </EstadoCarga>
    </div>
  );
}
