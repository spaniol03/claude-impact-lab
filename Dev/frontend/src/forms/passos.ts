import type { ProblemaValidacao } from '../api/types';
import type { DadosInscricao } from './schema';
import {
  cepValido,
  dataBrValida,
  emailValido,
  nisValido,
  nomeValido,
  soDigitos,
} from './validacao';

export type PassoId = 'termo' | 'identificacao' | 'social' | 'escolhas' | 'revisao';

export interface PassoDef {
  id: PassoId;
  titulo: string;
}

/** Passos que entram na barra de progresso (Termo fica antes; Comprovante, depois). */
export const PASSOS: PassoDef[] = [
  { id: 'termo', titulo: 'Termo de uso' },
  { id: 'identificacao', titulo: 'CPF e dados da criança' },
  { id: 'social', titulo: 'Situação social' },
  { id: 'escolhas', titulo: 'Escolha das creches' },
  { id: 'revisao', titulo: 'Revisão' },
];

const p = (campo: string, mensagem: string): ProblemaValidacao => ({ campo, mensagem });

export function validarPasso(
  id: PassoId,
  d: DadosInscricao,
  idsQuestionario: string[] = [],
): ProblemaValidacao[] {
  const e: ProblemaValidacao[] = [];

  if (id === 'termo') {
    if (!d.candidato.confirma_certidao)
      e.push(p('termo', 'Marque "Li e concordo com o termo" para continuar.'));
  }

  if (id === 'identificacao') {
    if (d.candidato.tem_cpf && !soDigitos(d.candidato.cpf))
      e.push(p('candidato.cpf', 'Informe o CPF da criança.'));
    const nasc = dataBrValida(d.candidato.data_nascimento);
    if (!nasc) e.push(p('candidato.data_nascimento', 'Informe a data no formato dd/mm/aaaa.'));
    else if (![2022, 2023, 2024, 2025].includes(nasc.getFullYear()))
      e.push(p('candidato.data_nascimento', 'Para creche em 2026, a criança precisa ter nascido entre 2022 e 2025.'));
    if (!nomeValido(d.candidato.nome)) e.push(p('candidato.nome', 'Confira o nome completo da criança.'));
    if (!d.candidato.sexo) e.push(p('candidato.sexo', 'Confirme o sexo conforme a certidão.'));

    for (const [rot, f] of [
      ['filiacao1', d.filiacao1],
      ['filiacao2', d.filiacao2],
    ] as const) {
      if (!f.nao_existente && !nomeValido(f.nome))
        e.push(p(`${rot}.nome`, 'Confira o nome desta filiação ou marque "não consta".'));
    }

    if (d.naturalidade.uf !== 'RJ' || d.naturalidade.nacionalidade !== 'Brasileiro(a)') {
      if (!d.naturalidade.cidade.trim()) e.push(p('naturalidade.cidade', 'Informe a cidade onde a criança nasceu.'));
      if (!d.naturalidade.uf) e.push(p('naturalidade.uf', 'Selecione o estado.'));
    }

    const en = d.endereco;
    if (!cepValido(en.cep)) e.push(p('endereco.cep', 'CEP inválido (8 dígitos).'));
    if (!en.logradouro.trim()) e.push(p('endereco.logradouro', 'Informe o logradouro.'));
    if (!en.numero.trim()) e.push(p('endereco.numero', 'Informe o número (ou "S/N").'));
    if (!en.bairro.trim()) e.push(p('endereco.bairro', 'Informe o bairro.'));

    const r = d.responsavel;
    if (!r.tipo) e.push(p('responsavel.tipo', 'Selecione o tipo de responsável.'));
    if (!nomeValido(r.nome)) e.push(p('responsavel.nome', 'Informe o nome completo do responsável.'));
    if (!soDigitos(r.cpf)) e.push(p('responsavel.cpf', 'Informe o CPF do responsável.'));
    else if (soDigitos(d.candidato.cpf) && soDigitos(d.candidato.cpf) === soDigitos(r.cpf))
      e.push(p('responsavel.cpf', 'O CPF do responsável não pode ser igual ao da criança.'));
    if (!emailValido(r.email)) e.push(p('responsavel.email', 'E-mail inválido — é o canal de contato para a convocação.'));
    if (r.nis && !nisValido(r.nis)) e.push(p('responsavel.nis', 'NIS inválido (11 dígitos com verificador).'));
    if (d.irmao.possui_irmao_inscrito && !d.irmao.numero_inscricao_irmao.trim())
      e.push(p('irmao.numero_inscricao_irmao', 'Informe o número da inscrição do irmão.'));
  }

  if (id === 'social') {
    if (d.perfil.deficiencia && d.perfil.tipos_deficiencia.length === 0)
      e.push(p('perfil.tipos_deficiencia', 'Selecione ao menos um tipo de deficiência.'));
    if (d.perfil.pais_deficientes && d.perfil.tipos_deficiencia_responsavel.length === 0)
      e.push(p('perfil.tipos_deficiencia_responsavel', 'Selecione ao menos um tipo.'));
    if (d.perfil.mae_adolescente) {
      if (!d.perfil.nome_mae_adolescente.trim())
        e.push(p('perfil.nome_mae_adolescente', 'Informe o nome da mãe adolescente.'));
      if (!dataBrValida(d.perfil.data_nasc_mae_adolescente))
        e.push(p('perfil.data_nasc_mae_adolescente', 'Data de nascimento inválida (dd/mm/aaaa).'));
    }
    const faltam = idsQuestionario.filter((qid) => d.questionario[qid] == null).length;
    if (faltam > 0)
      e.push(p('questionario', `Responda todas as ${idsQuestionario.length} perguntas (faltam ${faltam}).`));
  }

  if (id === 'escolhas') {
    if (d.opcoes.length === 0) e.push(p('opcoes', 'Escolha ao menos uma creche.'));
  }

  return e;
}
