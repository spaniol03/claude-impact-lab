import { useState } from 'react';
import { api } from '../../api/client';
import type { FormularioRef } from '../../api/types';
import { CheckCampo, SelectCampo, SimNao, TextoCampo } from '../../components/campos';
import { mascaraCpf, mascaraData, soDigitos } from '../../forms/validacao';
import type { PassoProps } from './tipos';

const GRUPAMENTO: Record<number, string> = {
  2025: 'Berçário I',
  2024: 'Berçário II',
  2023: 'Maternal I',
  2022: 'Maternal II',
};

export function PassoIdentificacao({
  d,
  set,
  err,
  formRef,
}: PassoProps & { formRef: FormularioRef }) {
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState<string | null>(null);
  const [naturalidadeOutra, setNaturalidadeOutra] = useState(
    d.naturalidade.uf !== 'RJ' || d.naturalidade.nacionalidade !== 'Brasileiro(a)',
  );

  const c = d.candidato;
  const nascDate = /^\d{2}\/\d{2}\/\d{4}$/.test(c.data_nascimento)
    ? Number(c.data_nascimento.slice(6))
    : null;
  const grup = nascDate ? GRUPAMENTO[nascDate] : null;

  async function buscar() {
    if (!soDigitos(c.cpf)) {
      setErroBusca('Digite o CPF da criança para buscar os dados.');
      return;
    }
    setBuscando(true);
    setErroBusca(null);
    try {
      const p = await api.prePreenchimento(soDigitos(c.cpf));
      set((s) => ({
        ...s,
        preenchido_por_cpf: true,
        candidato: {
          ...s.candidato,
          nome: p.nome.toUpperCase(),
          data_nascimento: p.data_nascimento,
          sexo: p.sexo,
        },
        filiacao1: { ...s.filiacao1, nome: p.filiacao1.toUpperCase(), nao_existente: false },
        filiacao2: { ...s.filiacao2, nome: p.filiacao2.toUpperCase(), nao_existente: false },
        endereco: {
          ...s.endereco,
          cep: p.cep,
          logradouro: p.logradouro,
          numero: p.numero,
          bairro: p.bairro,
          cidade: p.cidade,
          uf: p.uf,
        },
      }));
    } catch {
      setErroBusca('Não foi possível consultar agora. Tente de novo em instantes.');
    } finally {
      setBuscando(false);
    }
  }

  // ---------- fase 1: só CPF ----------
  if (!d.preenchido_por_cpf) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem' }}>🪪</div>
          <h2 style={{ marginBottom: 4 }}>Comece pelo CPF da criança</h2>
          <p className="fine">
            Buscamos o que a Prefeitura já sabe sobre a criança — via Receita Federal e Registro
            Municipal Integrado — para você não digitar tudo de novo.
          </p>
        </div>
        <TextoCampo
          campo="candidato.cpf"
          label="CPF da criança"
          obrigatorio
          inputMode="numeric"
          placeholder="000.000.000-00"
          valor={c.cpf}
          erro={err['candidato.cpf'] ?? erroBusca ?? undefined}
          ajuda="É o CPF de quem vai para a creche — não o do responsável."
          onChange={(v) => set((s) => ({ ...s, candidato: { ...s.candidato, cpf: mascaraCpf(v), tem_cpf: true } }))}
        />
        <button className="btn-continuar" style={{ width: '100%' }} onClick={buscar} disabled={buscando}>
          {buscando ? 'Consultando…' : 'Buscar meus dados'}
        </button>
        {buscando && (
          <>
            <div className="spinner" />
            <p className="fine" style={{ textAlign: 'center' }}>
              Consultando Receita Federal e RMI…
            </p>
          </>
        )}
        <p className="fine" style={{ marginTop: 14 }}>
          A criança ainda não tem CPF? Ele é gratuito (Receita Federal, Correios, Banco do
          Brasil, Caixa). É preciso ter o CPF para se inscrever.
        </p>
      </div>
    );
  }

  // ---------- fase 2: confirmar + completar ----------
  const cand = (patch: Partial<typeof c>) => set((s) => ({ ...s, candidato: { ...s.candidato, ...patch } }));
  const resp = (patch: Partial<typeof d.responsavel>) =>
    set((s) => ({ ...s, responsavel: { ...s.responsavel, ...patch } }));
  const end = (patch: Partial<typeof d.endereco>) => set((s) => ({ ...s, endereco: { ...s.endereco, ...patch } }));

  return (
    <>
      <div className="card">
        <div className="callout callout-info">
          ✓ Encontramos os dados abaixo (fonte simulada: Receita Federal + RMI). Confira e
          corrija o que precisar.
        </div>

        <TextoCampo campo="candidato.nome" label="Nome completo da criança" autofill obrigatorio valor={c.nome} erro={err['candidato.nome']} onChange={(v) => cand({ nome: v })} />
        <TextoCampo
          campo="candidato.data_nascimento"
          label="Data de nascimento"
          autofill
          obrigatorio
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          valor={c.data_nascimento}
          erro={err['candidato.data_nascimento']}
          onChange={(v) => cand({ data_nascimento: mascaraData(v) })}
        />
        {grup && (
          <div className="callout callout-info">
            Pela data, a criança concorre a vagas de <strong>{grup}</strong> em 2026.
          </div>
        )}
        <SelectCampo
          campo="candidato.sexo"
          label="Sexo (conforme a certidão)"
          autofill
          obrigatorio
          placeholder="Selecione"
          valor={c.sexo}
          erro={err['candidato.sexo']}
          opcoes={[
            { valor: 'Feminino', texto: 'Feminino' },
            { valor: 'Masculino', texto: 'Masculino' },
          ]}
          onChange={(v) => cand({ sexo: v as typeof c.sexo })}
        />

        <FiliacaoLinha rot="filiacao1" label="Filiação 1" f={d.filiacao1} err={err} onChange={(nf) => set((s) => ({ ...s, filiacao1: nf }))} />
        <FiliacaoLinha rot="filiacao2" label="Filiação 2" f={d.filiacao2} err={err} onChange={(nf) => set((s) => ({ ...s, filiacao2: nf }))} />

        <h3>Endereço da família</h3>
        <TextoCampo campo="endereco.cep" label="CEP" autofill obrigatorio inputMode="numeric" valor={d.endereco.cep} erro={err['endereco.cep']} onChange={(v) => end({ cep: v })} />
        <TextoCampo campo="endereco.logradouro" label="Logradouro" autofill obrigatorio valor={d.endereco.logradouro} erro={err['endereco.logradouro']} onChange={(v) => end({ logradouro: v })} />
        <div className="linha" style={{ alignItems: 'flex-start' }}>
          <TextoCampo campo="endereco.numero" label="Número" obrigatorio valor={d.endereco.numero} erro={err['endereco.numero']} onChange={(v) => end({ numero: v })} />
          <TextoCampo campo="endereco.complemento" label="Complemento" valor={d.endereco.complemento} onChange={(v) => end({ complemento: v })} />
        </div>
        <TextoCampo campo="endereco.bairro" label="Bairro" autofill obrigatorio valor={d.endereco.bairro} erro={err['endereco.bairro']} onChange={(v) => end({ bairro: v })} />

        <CheckCampo
          campo="nat-outra"
          marcado={naturalidadeOutra}
          texto="A criança nasceu fora do Rio de Janeiro ou não é brasileira"
          onChange={(v) => {
            setNaturalidadeOutra(v);
            if (!v)
              set((s) => ({
                ...s,
                naturalidade: { nacionalidade: 'Brasileiro(a)', pais: 'Brasil', uf: 'RJ', cidade: 'Rio de Janeiro', refugiado: false },
              }));
          }}
        />
        {naturalidadeOutra && (
          <div className="conditional">
            <SelectCampo
              campo="naturalidade.nacionalidade"
              label="Nacionalidade"
              valor={d.naturalidade.nacionalidade}
              opcoes={[
                { valor: 'Brasileiro(a)', texto: 'Brasileiro(a)' },
                { valor: 'Naturalizado(a)', texto: 'Naturalizado(a)' },
                { valor: 'Outra nacionalidade', texto: 'Outra nacionalidade' },
              ]}
              onChange={(v) =>
                set((s) => ({ ...s, naturalidade: { ...s.naturalidade, nacionalidade: v as 'Brasileiro(a)' } }))
              }
            />
            {d.naturalidade.nacionalidade !== 'Brasileiro(a)' && (
              <SelectCampo
                campo="naturalidade.pais"
                label="País"
                valor={d.naturalidade.pais}
                opcoes={formRef.paises.map((pp) => ({ valor: pp, texto: pp }))}
                onChange={(v) => set((s) => ({ ...s, naturalidade: { ...s.naturalidade, pais: v } }))}
              />
            )}
            <SelectCampo
              campo="naturalidade.uf"
              label="Estado onde nasceu"
              placeholder="Selecione"
              valor={d.naturalidade.uf}
              erro={err['naturalidade.uf']}
              opcoes={formRef.ufs.map((u) => ({ valor: u, texto: u }))}
              onChange={(v) => set((s) => ({ ...s, naturalidade: { ...s.naturalidade, uf: v } }))}
            />
            <TextoCampo
              campo="naturalidade.cidade"
              label="Cidade onde nasceu"
              valor={d.naturalidade.cidade}
              erro={err['naturalidade.cidade']}
              onChange={(v) => set((s) => ({ ...s, naturalidade: { ...s.naturalidade, cidade: v } }))}
            />
            <SimNao
              campo="naturalidade.refugiado"
              label="A criança é refugiada ou solicitante de refúgio?"
              valor={d.naturalidade.refugiado}
              onChange={(v) => set((s) => ({ ...s, naturalidade: { ...s.naturalidade, refugiado: v } }))}
            />
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Complete o que ainda não temos</h3>

        <SelectCampo
          campo="responsavel.tipo"
          label="Tipo de responsável"
          obrigatorio
          placeholder="Selecione"
          valor={d.responsavel.tipo}
          erro={err['responsavel.tipo']}
          opcoes={formRef.tipos_responsavel.map((t) => ({ valor: t, texto: t }))}
          onChange={(v) => resp({ tipo: v })}
        />
        <TextoCampo campo="responsavel.nome" label="Nome completo do responsável" obrigatorio valor={d.responsavel.nome} erro={err['responsavel.nome']} onChange={(v) => resp({ nome: v })} />
        <TextoCampo campo="responsavel.cpf" label="CPF do responsável" obrigatorio inputMode="numeric" placeholder="000.000.000-00" valor={d.responsavel.cpf} erro={err['responsavel.cpf']} onChange={(v) => resp({ cpf: mascaraCpf(v) })} />

        <div className="linha" style={{ alignItems: 'flex-start' }}>
          <TextoCampo campo="responsavel.ddd_celular" label="DDD" inputMode="numeric" maxLength={2} valor={d.responsavel.ddd_celular} onChange={(v) => resp({ ddd_celular: soDigitos(v).slice(0, 3) })} />
          <TextoCampo campo="responsavel.celular" label="Celular / WhatsApp" inputMode="numeric" maxLength={11} valor={d.responsavel.celular} onChange={(v) => resp({ celular: soDigitos(v) })} />
        </div>
        <details style={{ marginBottom: 12 }}>
          <summary className="fine">Prefiro informar um telefone fixo</summary>
          <div className="linha" style={{ alignItems: 'flex-start', marginTop: 8 }}>
            <TextoCampo campo="responsavel.ddd_telefone" label="DDD" inputMode="numeric" maxLength={3} valor={d.responsavel.ddd_telefone} onChange={(v) => resp({ ddd_telefone: soDigitos(v).slice(0, 3) })} />
            <TextoCampo campo="responsavel.telefone" label="Telefone fixo" inputMode="numeric" maxLength={10} valor={d.responsavel.telefone} onChange={(v) => resp({ telefone: soDigitos(v) })} />
          </div>
        </details>
        <TextoCampo campo="responsavel.email" label="E-mail do responsável" obrigatorio type="email" inputMode="email" valor={d.responsavel.email} erro={err['responsavel.email']} onChange={(v) => resp({ email: v })} />
        <TextoCampo
          campo="responsavel.nis"
          label="NIS do responsável (opcional)"
          inputMode="numeric"
          maxLength={11}
          ajuda="Número no cartão do CadÚnico / Bolsa Família."
          valor={d.responsavel.nis}
          erro={err['responsavel.nis']}
          onChange={(v) => resp({ nis: soDigitos(v).slice(0, 11) })}
        />

        <SimNao
          campo="irmao.possui_irmao_inscrito"
          label="Tem irmão(ã) com inscrição on-line realizada neste processo?"
          valor={d.irmao.possui_irmao_inscrito}
          onChange={(v) =>
            set((s) => ({
              ...s,
              irmao: { ...s.irmao, possui_irmao_inscrito: v, numero_inscricao_irmao: v ? s.irmao.numero_inscricao_irmao : '' },
            }))
          }
        />
        {d.irmao.possui_irmao_inscrito && (
          <div className="conditional">
            <TextoCampo
              campo="irmao.numero_inscricao_irmao"
              label="Número da inscrição do irmão(ã)"
              obrigatorio
              inputMode="numeric"
              valor={d.irmao.numero_inscricao_irmao}
              erro={err['irmao.numero_inscricao_irmao']}
              onChange={(v) => set((s) => ({ ...s, irmao: { ...s.irmao, numero_inscricao_irmao: v } }))}
            />
            <SimNao
              campo="irmao.gemeo"
              label="Esse irmão(ã) é gêmeo(a)?"
              ajuda="Sempre que possível, escolha as mesmas creches para gêmeos."
              valor={d.irmao.gemeo}
              onChange={(v) => set((s) => ({ ...s, irmao: { ...s.irmao, gemeo: v } }))}
            />
          </div>
        )}
      </div>
    </>
  );
}

function FiliacaoLinha({
  rot,
  label,
  f,
  err,
  onChange,
}: {
  rot: 'filiacao1' | 'filiacao2';
  label: string;
  f: PassoProps['d']['filiacao1'];
  err: Record<string, string>;
  onChange: (nf: PassoProps['d']['filiacao1']) => void;
}) {
  return (
    <div>
      <TextoCampo
        campo={`${rot}.nome`}
        label={label}
        autofill={!f.nao_existente}
        valor={f.nao_existente ? '' : f.nome}
        erro={err[`${rot}.nome`]}
        onChange={(v) => onChange({ ...f, nome: v })}
      />
      <CheckCampo
        campo={`${rot}.nao_existente`}
        marcado={f.nao_existente}
        texto="Não consta na certidão / não existe"
        onChange={(v) => onChange({ ...f, nao_existente: v })}
      />
    </div>
  );
}
