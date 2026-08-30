import type { FormularioRef } from '../../api/types';
import type { PassoId } from '../../forms/passos';
import type { DadosInscricao } from '../../forms/schema';

const sn = (v: boolean | null) => (v === true ? 'Sim' : v === false ? 'Não' : '—');

function Lista({ rows }: { rows: [string, string][] }) {
  return (
    <ul className="review-list">
      {rows.map(([k, v], i) => (
        <li key={`${k}-${i}`}>
          <b>{k}</b>
          <span className="ans">{v || '—'}</span>
        </li>
      ))}
    </ul>
  );
}

export function PassoRevisao({
  d,
  formRef,
  onEditar,
}: {
  d: DadosInscricao;
  formRef: FormularioRef;
  onEditar: (p: PassoId) => void;
}) {
  const contato = [
    d.responsavel.ddd_celular && `(${d.responsavel.ddd_celular}) ${d.responsavel.celular}`,
    d.responsavel.ddd_telefone && `(${d.responsavel.ddd_telefone}) ${d.responsavel.telefone}`,
    d.responsavel.email,
  ]
    .filter(Boolean)
    .join(' · ');

  const social: [string, string][] = [
    ['Deficiência da criança', d.perfil.deficiencia ? d.perfil.tipos_deficiencia.join(', ') || 'Sim' : 'Não'],
    ['Usa cadeira de rodas', sn(d.perfil.cadeira_rodas)],
    ['Responsáveis 60+', sn(d.perfil.pais_60mais)],
    ['Responsável com deficiência', d.perfil.pais_deficientes ? d.perfil.tipos_deficiencia_responsavel.join(', ') || 'Sim' : 'Não'],
    ['Mãe adolescente', d.perfil.mae_adolescente ? d.perfil.nome_mae_adolescente || 'Sim' : 'Não'],
    ...formRef.questionario_creche.map(
      (q, i) => [`${i + 1}. ${q.texto}`, sn(d.questionario[q.id] ?? null)] as [string, string],
    ),
  ];

  const opcoes = [...d.opcoes].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="card">
      <h2>Revisão</h2>

      <div className="linha entre">
        <h3 style={{ marginTop: 0 }}>CPF e dados</h3>
        <button className="review-edit" onClick={() => onEditar('identificacao')}>
          editar
        </button>
      </div>
      <Lista
        rows={[
          ['CPF da criança', d.candidato.cpf],
          ['Nome completo', d.candidato.nome],
          ['Data de nascimento', d.candidato.data_nascimento],
          ['Sexo', d.candidato.sexo || '—'],
          ['Filiação 1', d.filiacao1.nao_existente ? 'não consta' : d.filiacao1.nome],
          ['Filiação 2', d.filiacao2.nao_existente ? 'não consta' : d.filiacao2.nome],
          [
            'Endereço',
            `${d.endereco.logradouro}, ${d.endereco.numero} — ${d.endereco.bairro} · CEP ${d.endereco.cep}`,
          ],
          ['Nascida em', `${d.naturalidade.cidade} / ${d.naturalidade.uf}`],
          ['Responsável', `${d.responsavel.nome} (${d.responsavel.tipo})`],
          ['CPF do responsável', d.responsavel.cpf],
          ['Contato', contato],
          ['Irmão com inscrição on-line', d.irmao.possui_irmao_inscrito ? `Sim — ${d.irmao.numero_inscricao_irmao}` : 'Não'],
        ]}
      />

      <div className="linha entre">
        <h3>Situação social</h3>
        <button className="review-edit" onClick={() => onEditar('social')}>
          editar
        </button>
      </div>
      <Lista rows={social} />

      <div className="linha entre">
        <h3>
          Escolas, em ordem de prioridade <span className="tag-count">{opcoes.length}/5</span>
        </h3>
        <button className="review-edit" onClick={() => onEditar('escolhas')}>
          editar
        </button>
      </div>
      {opcoes.length === 0 ? (
        <p className="fine">Nenhuma escola escolhida.</p>
      ) : (
        opcoes.map((o, i) => (
          <div key={o.unidade} className="school-card" style={{ cursor: 'default' }}>
            <div className="pos">{i + 1}</div>
            <div className="info">
              <div className="name">{o.nome}</div>
              <div className="bairro">{o.bairro}</div>
              {o.concorrida && <span className="warn-tag block">⚠ concorrida</span>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
