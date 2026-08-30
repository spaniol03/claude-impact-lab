/**
 * Estrutura do formulário de inscrição (creche) — fluxo do mock mobile
 * (Docs/prototipos/mock_matricula_mobile.html): comece pelo CPF, confirme o que a Prefeitura
 * já sabe, complete o resto, escolha as escolas, revise.
 *
 * O shape dos dados enviados ao backend (`paraPayload`) permanece o mesmo contrato
 * de `POST /inscricao/simular`.
 */

import type { Banda } from '../api/types';

export interface DadosFiliacao {
  nome: string;
  nao_existente: boolean;
  data_nascimento: string;
  consta_certidao: boolean | null;
}

export interface DadosOpcaoEscola {
  ordem: number;
  unidade: string;
  nome: string;
  bairro: string;
  /** faixa de procura histórica: 'baixa' | 'media' | 'alta' */
  banda: Banda;
  /** entre as ~10% unidades que concentram a maior fila da rede */
  concorrida: boolean;
}

export interface DadosInscricao {
  preenchido_por_cpf: boolean;
  candidato: {
    origem: string;
    matricula_rede: string;
    data_nascimento: string;
    nome: string;
    tem_cpf: boolean;
    cpf: string;
    sexo: 'Masculino' | 'Feminino' | '';
    confirma_certidao: boolean;
  };
  filiacao1: DadosFiliacao;
  filiacao2: DadosFiliacao;
  naturalidade: {
    nacionalidade: 'Brasileiro(a)' | 'Naturalizado(a)' | 'Outra nacionalidade';
    pais: string;
    uf: string;
    cidade: string;
    refugiado: boolean;
  };
  perfil: {
    deficiencia: boolean;
    tipos_deficiencia: string[];
    cadeira_rodas: boolean;
    pais_60mais: boolean;
    pais_deficientes: boolean;
    tipos_deficiencia_responsavel: string[];
    mae_adolescente: boolean;
    nome_mae_adolescente: string;
    data_nasc_mae_adolescente: string;
  };
  irmao: {
    possui_irmao_inscrito: boolean;
    numero_inscricao_irmao: string;
    gemeo: boolean;
  };
  responsavel: {
    tipo: string;
    nome: string;
    cpf: string;
    ddd_telefone: string;
    telefone: string;
    ddd_celular: string;
    celular: string;
    email: string;
    nis: string;
  };
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  questionario: Record<string, boolean | null>;
  opcoes: DadosOpcaoEscola[];
}

const filiacaoVazia = (): DadosFiliacao => ({
  nome: '',
  nao_existente: false,
  data_nascimento: '',
  consta_certidao: null,
});

export function inscricaoVazia(): DadosInscricao {
  return {
    preenchido_por_cpf: false,
    candidato: {
      origem: 'Nunca estudou',
      matricula_rede: '',
      data_nascimento: '',
      nome: '',
      tem_cpf: true,
      cpf: '',
      sexo: '',
      confirma_certidao: false,
    },
    filiacao1: filiacaoVazia(),
    filiacao2: filiacaoVazia(),
    naturalidade: {
      nacionalidade: 'Brasileiro(a)',
      pais: 'Brasil',
      uf: 'RJ',
      cidade: 'Rio de Janeiro',
      refugiado: false,
    },
    perfil: {
      deficiencia: false,
      tipos_deficiencia: [],
      cadeira_rodas: false,
      pais_60mais: false,
      pais_deficientes: false,
      tipos_deficiencia_responsavel: [],
      mae_adolescente: false,
      nome_mae_adolescente: '',
      data_nasc_mae_adolescente: '',
    },
    irmao: { possui_irmao_inscrito: false, numero_inscricao_irmao: '', gemeo: false },
    responsavel: {
      tipo: '',
      nome: '',
      cpf: '',
      ddd_telefone: '',
      telefone: '',
      ddd_celular: '',
      celular: '',
      email: '',
      nis: '',
    },
    endereco: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: 'Rio de Janeiro',
      uf: 'RJ',
    },
    questionario: {},
    opcoes: [],
  };
}

export function paraPayload(d: DadosInscricao, itensQuestionario: { id: string; texto: string }[]) {
  return {
    candidato: {
      origem: d.candidato.origem,
      matricula_rede: d.candidato.matricula_rede || null,
      data_nascimento: d.candidato.data_nascimento,
      nome: d.candidato.nome.trim(),
      tem_cpf: d.candidato.tem_cpf,
      cpf: d.candidato.tem_cpf ? d.candidato.cpf : null,
      sexo: d.candidato.sexo || null,
      confirma_certidao: d.candidato.confirma_certidao,
    },
    filiacao1: filiacaoPayload(d.filiacao1),
    filiacao2: filiacaoPayload(d.filiacao2),
    naturalidade: d.naturalidade,
    perfil: {
      ...d.perfil,
      nome_mae_adolescente: d.perfil.nome_mae_adolescente || null,
      data_nasc_mae_adolescente: d.perfil.data_nasc_mae_adolescente || null,
    },
    irmao: {
      possui_irmao_inscrito: d.irmao.possui_irmao_inscrito,
      numero_inscricao_irmao: d.irmao.numero_inscricao_irmao || null,
      gemeo: d.irmao.gemeo,
    },
    responsavel: {
      ...d.responsavel,
      ddd_telefone: d.responsavel.ddd_telefone || null,
      telefone: d.responsavel.telefone || null,
      ddd_celular: d.responsavel.ddd_celular || null,
      celular: d.responsavel.celular || null,
      nis: d.responsavel.nis || null,
    },
    endereco: { ...d.endereco, complemento: d.endereco.complemento || null },
    questionario: itensQuestionario.map((q) => ({
      id: q.id,
      pergunta: q.texto,
      resposta: d.questionario[q.id] === true,
    })),
    opcoes: [...d.opcoes]
      .sort((a, b) => a.ordem - b.ordem)
      .map((o, i) => ({
        ordem: i + 1,
        unidade: o.unidade,
        esteve_lista_espera: false,
        irmao_frequenta: false,
        matricula_irmao: null,
        responsavel_estuda: false,
        matricula_responsavel: null,
      })),
  };
}

function filiacaoPayload(f: DadosFiliacao) {
  return {
    nome: f.nao_existente ? null : f.nome.trim() || null,
    nao_existente: f.nao_existente,
    data_nascimento: f.data_nascimento || null,
    consta_certidao: f.consta_certidao,
  };
}
