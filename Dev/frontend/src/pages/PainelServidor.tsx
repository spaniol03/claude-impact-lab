import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Ano, UnidadeLiberacao } from '../api/types';
import { useApi } from '../hooks/useApi';
import { Callout, EstadoCarga, SeletorAno, StatCard } from '../components/ui';
import { num } from '../lib/format';

const ANOS: Ano[] = ['todos', '2025', '2024', '2023', '2022', '2021'];

export function PainelServidor() {
  const [ano, setAno] = useState<Ano>('todos');
  const [sel, setSel] = useState<string | null>(null);
  const [liberado, setLiberado] = useState(false);

  const lib = useApi(() => api.liberacao(ano), [ano]);

  useEffect(() => {
    setSel(null);
    setLiberado(false);
  }, [ano]);

  const unidade: UnidadeLiberacao | undefined = lib.dados?.unidades.find((u) => u.unidade === sel);

  return (
    <div className="pilha" style={{ gap: 'var(--espaco-6)' }}>
      <section>
        <p className="tenue" style={{ marginBottom: 4 }}>Frente 2 · usuário interno (servidor SME/CRE)</p>
        <h1>Motor de cruzamento: classificação × preferência</h1>
        <p className="intro">
          Para cada criança já confirmada em uma unidade, o motor lista as demais reservas que
          ela ainda mantém travando fila — e quem, pela classificação de vulnerabilidade,
          deveria ser promovido no lugar. O motor <strong>sinaliza</strong>; o servidor{' '}
          <strong>decide</strong>.
        </p>
      </section>

      <InscricoesRecebidas />

      <h2 style={{ marginBottom: 0 }}>Motor de liberação (dados históricos)</h2>
      <SeletorAno valor={ano} anos={ANOS} onChange={setAno} />

      <EstadoCarga carregando={lib.carregando} erro={lib.erro} onRetry={lib.recarregar}>
        {lib.dados && (
          <>
            <section className="grid grid-auto">
              <StatCard
                destaque
                valor={num(lib.dados.vagas_travadas_total)}
                rotulo="reservas travadas agora (criança já confirmada em outra unidade)"
              />
              <StatCard
                valor={num(lib.dados.inscricoes_multi_reserva)}
                rotulo="crianças mantêm reserva em mais de uma unidade após confirmar"
              />
              <StatCard
                valor={num(lib.dados.unidades.length)}
                rotulo="unidades com reservas travadas neste recorte (detalhadas abaixo)"
              />
            </section>

            <div className="grid grid-2">
              <div className="pilha">
                <h2 style={{ marginBottom: 0 }}>Fila de liberação por unidade</h2>
                <div className="tabela-wrap" style={{ maxHeight: 460, overflowY: 'auto' }}>
                  <table className="dados">
                    <thead>
                      <tr>
                        <th>Unidade</th>
                        <th>Travadas</th>
                        <th aria-label="Abrir" />
                      </tr>
                    </thead>
                    <tbody>
                      {lib.dados.unidades.map((u) => (
                        <tr
                          key={u.unidade}
                          style={u.unidade === sel ? { background: 'var(--c-azul-050)' } : undefined}
                        >
                          <td>
                            <strong>{u.nome}</strong>
                            <div className="tenue">fila &quot;limpa&quot; aguardando: {num(u.fila_limpa)}</div>
                          </td>
                          <td className="tabular">
                            <strong style={{ color: 'var(--c-alta)' }}>{u.travadas}</strong>
                          </td>
                          <td>
                            <button
                              className={u.unidade === sel ? 'btn btn-secundario' : 'btn'}
                              onClick={() => {
                                setSel(u.unidade);
                                setLiberado(false);
                              }}
                            >
                              {u.unidade === sel ? 'Aberta' : 'Verificar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pilha">
                {!unidade ? (
                  <Callout>Selecione uma unidade para ver quem está travando vaga e quem deveria subir.</Callout>
                ) : (
                  <>
                    <div className="card card-pad">
                      <div className="linha entre">
                        <h3 style={{ margin: 0 }}>{unidade.nome}</h3>
                        <button
                          className="btn"
                          disabled={liberado}
                          onClick={() => setLiberado(true)}
                        >
                          {liberado ? 'Liberação simulada ✓' : 'Simular liberação'}
                        </button>
                      </div>
                      <p className="tenue" style={{ margin: '6px 0 0' }}>
                        {liberado
                          ? `${unidade.travadas} reservas liberadas — as vagas passariam às crianças da fila abaixo, na ordem de classificação. Nada é escrito no sistema legado; esta é uma simulação.`
                          : `${unidade.travadas} vagas estão reservadas por crianças já confirmadas em outra unidade.`}
                      </p>
                    </div>

                    <div className="card card-pad">
                      <h3 style={{ marginTop: 0 }}>
                        Crianças confirmadas em outra unidade — {liberado ? 'liberadas' : 'travando vaga aqui'}
                      </h3>
                      <ul className="pilha" style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                        {unidade.exemplos.map((e) => (
                          <li
                            key={e.aluno}
                            style={{
                              borderBottom: '1px solid var(--c-linha)',
                              paddingBottom: 8,
                              opacity: liberado ? 0.5 : 1,
                              textDecoration: liberado ? 'line-through' : 'none',
                            }}
                          >
                            <span className="mono">{e.aluno}</span> · confirmada em{' '}
                            <strong>{e.confirmada_em.nome}</strong> ({e.confirmada_em.opcao}ª opção)
                            <div className="tenue">
                              ainda reservando: {e.reservas_travadas.length} unidade(s) · score de
                              vulnerabilidade {e.score}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="card card-pad" style={{ borderColor: 'var(--c-azul-500)' }}>
                      <h3 style={{ marginTop: 0 }}>Quem deveria ser promovido (ordem de classificação)</h3>
                      <ol className="pilha" style={{ margin: 0, paddingLeft: 20 }}>
                        {unidade.promover.map((c) => (
                          <li
                            key={c.aluno}
                            style={{
                              fontWeight: liberado ? 700 : 400,
                              color: liberado ? 'var(--c-baixa)' : undefined,
                            }}
                          >
                            <span className="mono">{c.aluno}</span> · {c.grupamento || 'grupamento n/d'} ·
                            score {c.score}
                            {liberado && ' → convocar'}
                          </li>
                        ))}
                        {unidade.promover.length === 0 && (
                          <li className="tenue">Sem fila &quot;limpa&quot; registrada para esta unidade no recorte.</li>
                        )}
                      </ol>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Callout tom="alerta">
              A pontuação de vulnerabilidade é reconstruída a partir dos critérios confirmados
              (Query B × régua da Query C), normalizada por ano porque a régua mudou em 2024. Ela
              ordena a fila; ela não decide quem &quot;merece&quot; a vaga — isso continua sendo
              política pública e julgamento do servidor.
            </Callout>
          </>
        )}
      </EstadoCarga>
    </div>
  );
}

function InscricoesRecebidas() {
  const rec = useApi(() => api.inscricoesRecebidas(50), []);
  return (
    <section>
      <h2 style={{ marginBottom: 4 }}>Inscrições recebidas neste protótipo</h2>
      <p className="fine" style={{ marginTop: 0 }}>
        Gravadas no banco do backend (SQLite) ao finalizar o formulário. Numa implantação real
        esta lista seria restrita ao servidor SME/CRE.
      </p>
      <EstadoCarga carregando={rec.carregando} erro={rec.erro} onRetry={rec.recarregar}>
        {rec.dados && rec.dados.length === 0 && (
          <Callout>Nenhuma inscrição registrada ainda. Envie uma pela tela de Inscrição.</Callout>
        )}
        {rec.dados && rec.dados.length > 0 && (
          <div className="tabela-wrap">
            <table className="dados">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Criança</th>
                  <th>Grupamento</th>
                  <th>Opções</th>
                  <th>Critérios &quot;sim&quot;</th>
                  <th>Recebida</th>
                </tr>
              </thead>
              <tbody>
                {rec.dados.map((i) => (
                  <tr key={i.protocolo}>
                    <td className="mono">{i.protocolo}</td>
                    <td>{i.candidato_nome}</td>
                    <td>{i.grupamento_sugerido ?? '—'}</td>
                    <td className="tabular">{i.n_opcoes}</td>
                    <td className="tabular">{i.n_criterios_sim}</td>
                    <td className="fine">{new Date(i.criado_em).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </EstadoCarga>
    </section>
  );
}
