import { Link } from 'react-router-dom';
import type { Comprovante } from '../../api/types';
import { BadgeBanda } from '../../components/ui';

export function ComprovanteView({ c, onNovo }: { c: Comprovante; onNovo?: () => void }) {
  return (
    <>
      <div className="comprovante-topo">
        <h2>Inscrição registrada</h2>
        <p className="fine" style={{ margin: '0 0 4px' }}>Número do protocolo</p>
        <div className="num mono">{c.protocolo}</div>
        <p className="fine" style={{ marginTop: 8 }}>
          Guarde este número. O comparecimento presencial com documentos ainda é necessário —
          fique atento à data do comprovante.
        </p>
      </div>

      <div className="card">
        <div className="callout callout-info">
          Simulação — nenhum dado foi enviado à SME. Você pode reabrir este comprovante em{' '}
          <Link to="/consulta">Consultar inscrição</Link> neste navegador.
        </div>
        <ul className="review-list">
          <li>
            <b>Criança</b>
            <span className="ans">{c.candidato_nome}</span>
          </li>
          <li>
            <b>Responsável</b>
            <span className="ans">{c.responsavel_nome}</span>
          </li>
          <li>
            <b>Grupamento (2026)</b>
            <span className="ans">{c.grupamento_sugerido ?? '—'}</span>
          </li>
          <li>
            <b>Emitido em</b>
            <span className="ans">{new Date(c.gerado_em).toLocaleString('pt-BR')}</span>
          </li>
        </ul>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Suas creches e a concorrência de cada uma</h3>
        {c.opcoes.map((o, i) => (
          <div key={o.unidade} className="school-card" style={{ cursor: 'default' }}>
            <div className="pos">{i + 1}</div>
            <div className="info">
              <div className="name">{o.nome}</div>
              <div className="bairro">
                {o.bairro || '—'} · razão fila/confirmados {o.ratio.toLocaleString('pt-BR')}
              </div>
              <span className="linha" style={{ gap: 4, marginTop: 4 }}>
                <BadgeBanda banda={o.banda} />
                {o.top10 && o.banda !== 'alta' && <span className="warn-tag">⚠ concorrida</span>}
              </span>
              {o.aviso && <p className="fine" style={{ margin: '6px 0 0' }}>{o.aviso}</p>}
            </div>
          </div>
        ))}
        <div className="callout callout-info" style={{ marginTop: 12 }}>
          {c.recomendacao}
        </div>
      </div>

      {c.criterios_a_comprovar.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Documentos para levar</h3>
          <p className="fine">Cada critério marcado com &quot;Sim&quot; precisa ser comprovado:</p>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            {c.criterios_a_comprovar.map((cr) => (
              <li key={cr} style={{ fontSize: '0.84rem' }}>
                {cr}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="callout callout-soft">{c.aviso_comparecimento}</div>

      {onNovo && (
        <div className="linha">
          <button className="btn btn-sec" onClick={onNovo}>
            Nova simulação
          </button>
          <Link className="btn" to="/">
            Início
          </Link>
        </div>
      )}
    </>
  );
}
