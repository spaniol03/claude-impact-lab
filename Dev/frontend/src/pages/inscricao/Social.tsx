import { useState } from 'react';
import type { FormularioRef } from '../../api/types';
import { MultiCheck, SimNao, TextoCampo } from '../../components/campos';
import { mascaraData } from '../../forms/validacao';
import type { PassoProps } from './tipos';

export function PassoSocial({ d, set, err, formRef }: PassoProps & { formRef: FormularioRef }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const pf = d.perfil;
  const upd = (patch: Partial<typeof pf>) => set((s) => ({ ...s, perfil: { ...s.perfil, ...patch } }));
  const itens = formRef.questionario_creche;
  const respondidas = itens.filter((q) => d.questionario[q.id] != null).length;

  return (
    <>
      <div className="card">
        <h2>Situação Social</h2>
        <div className="callout callout-info">
          Marque &quot;sim&quot; só para o que puder comprovar depois — isso não atrasa nem
          prejudica sua inscrição. Alguns itens (Bolsa Família, CadÚnico) a Prefeitura confirma
          sozinha pelo Registro Municipal Integrado.
        </div>

        <SimNao
          campo="perfil.deficiencia"
          label="A criança tem deficiência, TGD ou altas habilidades / superdotação?"
          valor={pf.deficiencia}
          onChange={(v) => upd({ deficiencia: v, tipos_deficiencia: v ? pf.tipos_deficiencia : [] })}
        />
        {pf.deficiencia && (
          <div className="conditional">
            <MultiCheck
              campo="perfil.tipos_deficiencia"
              label="Tipo(s)"
              obrigatorio
              erro={err['perfil.tipos_deficiencia']}
              opcoes={formRef.tipos_deficiencia}
              selecionados={pf.tipos_deficiencia}
              onChange={(v) => upd({ tipos_deficiencia: v })}
            />
          </div>
        )}

        <SimNao campo="perfil.cadeira_rodas" label="A criança usa cadeira de rodas de forma contínua?" valor={pf.cadeira_rodas} onChange={(v) => upd({ cadeira_rodas: v })} />
        <SimNao campo="perfil.pais_60mais" label="Pais ou responsáveis com 60 anos ou mais?" valor={pf.pais_60mais} onChange={(v) => upd({ pais_60mais: v })} />

        <SimNao
          campo="perfil.pais_deficientes"
          label="Pais ou responsáveis com deficiência?"
          valor={pf.pais_deficientes}
          onChange={(v) => upd({ pais_deficientes: v, tipos_deficiencia_responsavel: v ? pf.tipos_deficiencia_responsavel : [] })}
        />
        {pf.pais_deficientes && (
          <div className="conditional">
            <MultiCheck
              campo="perfil.tipos_deficiencia_responsavel"
              label="Tipo(s) de deficiência do responsável"
              obrigatorio
              erro={err['perfil.tipos_deficiencia_responsavel']}
              opcoes={formRef.tipos_deficiencia}
              selecionados={pf.tipos_deficiencia_responsavel}
              onChange={(v) => upd({ tipos_deficiencia_responsavel: v })}
            />
          </div>
        )}

        <SimNao campo="perfil.mae_adolescente" label="Mãe adolescente (menor de 18 anos)?" valor={pf.mae_adolescente} onChange={(v) => upd({ mae_adolescente: v })} />
        {pf.mae_adolescente && (
          <div className="conditional">
            <TextoCampo campo="perfil.nome_mae_adolescente" label="Nome da mãe adolescente" obrigatorio valor={pf.nome_mae_adolescente} erro={err['perfil.nome_mae_adolescente']} onChange={(v) => upd({ nome_mae_adolescente: v })} />
            <TextoCampo campo="perfil.data_nasc_mae_adolescente" label="Data de nascimento" obrigatorio inputMode="numeric" placeholder="dd/mm/aaaa" valor={pf.data_nasc_mae_adolescente} erro={err['perfil.data_nasc_mae_adolescente']} onChange={(v) => upd({ data_nasc_mae_adolescente: mascaraData(v) })} />
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Questionário socioeconômico</h3>
        <p className="fine">
          Estas perguntas ordenam a fila por vulnerabilidade — definida em lei. Responder com
          sinceridade é o que garante que a vaga vá para quem mais precisa. {respondidas}/
          {itens.length} respondidas — todas obrigatórias.
        </p>
        {err['questionario'] && <span className="campo-erro">{err['questionario']}</span>}

        {itens.map((q, i) => (
          <div key={q.id} className="field" style={{ borderBottom: '1px solid var(--c-linha)', paddingBottom: 6 }}>
            <SimNao
              campo={`questionario.${q.id}`}
              label={`${i + 1}. ${q.texto}`}
              valor={d.questionario[q.id] ?? null}
              onChange={(v) => set((s) => ({ ...s, questionario: { ...s.questionario, [q.id]: v } }))}
            />
            <button
              type="button"
              className="review-edit"
              aria-expanded={aberto === q.id}
              onClick={() => setAberto((a) => (a === q.id ? null : q.id))}
            >
              {aberto === q.id ? 'ocultar' : 'por que se pergunta? / como comprovar'}
            </button>
            {aberto === q.id && (
              <p className="fine" style={{ marginTop: 6 }}>
                {q.porque}
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
