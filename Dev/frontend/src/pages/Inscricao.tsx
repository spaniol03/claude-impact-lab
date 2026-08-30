import { useMemo, useState } from 'react';
import { api, ValidacaoError } from '../api/client';
import type { Comprovante, FormularioRef, ProblemaValidacao } from '../api/types';
import { ProgressoFino, ResumoErros } from '../components/campos';
import { EstadoCarga } from '../components/ui';
import { mapaErros } from '../forms/erros';
import { PASSOS, type PassoId } from '../forms/passos';
import { paraPayload } from '../forms/schema';
import { comprovantes, rascunho } from '../forms/storage';
import { useApi } from '../hooks/useApi';
import { useWizard } from '../hooks/useWizard';
import { AudioScreen } from './inscricao/Audio';
import { ComprovanteView } from './inscricao/Comprovante';
import { PassoEscolas } from './inscricao/Escolas';
import { InscricaoHome } from './inscricao/Home';
import { PassoIdentificacao } from './inscricao/Identificacao';
import { PassoRevisao } from './inscricao/Revisao';
import { PassoSocial } from './inscricao/Social';
import { PassoTermo } from './inscricao/Termo';

export function Inscricao() {
  const form = useApi(() => api.formulario(), []);
  return (
    <EstadoCarga carregando={form.carregando} erro={form.erro} onRetry={form.recarregar}>
      {form.dados && <Fluxo formRef={form.dados} />}
    </EstadoCarga>
  );
}

type Fase = 'home' | 'audio' | 'form' | 'comprovante';

function Fluxo({ formRef }: { formRef: FormularioRef }) {
  const idsQuestionario = useMemo(() => formRef.questionario_creche.map((q) => q.id), [formRef]);
  const w = useWizard(idsQuestionario);
  const [fase, setFase] = useState<Fase>('home');
  const [comprovante, setComprovante] = useState<Comprovante | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errosServidor, setErrosServidor] = useState<ProblemaValidacao[]>([]);

  const errosAtuais = errosServidor.length ? errosServidor : w.erros;
  const err = mapaErros(errosAtuais);
  const stepProps = { d: w.dados, set: w.atualizar, err };
  const naRevisao = w.passoId === 'revisao';
  const noTermo = w.passoId === 'termo';

  async function finalizar() {
    setEnviando(true);
    setErrosServidor([]);
    try {
      const c = await api.registrarInscricao(paraPayload(w.dados, formRef.questionario_creche));
      comprovantes.adicionar(c);
      rascunho.limpar();
      setComprovante(c);
      setFase('comprovante');
    } catch (e) {
      setErrosServidor(
        e instanceof ValidacaoError
          ? e.problemas
          : [{ campo: 'geral', mensagem: 'Não foi possível gerar o comprovante. Tente de novo.' }],
      );
    } finally {
      setEnviando(false);
    }
  }

  function continuar() {
    setErrosServidor([]);
    if (naRevisao) {
      void finalizar();
      return;
    }
    w.avancar();
  }

  // ---------- home ----------
  if (fase === 'home') {
    return (
      <InscricaoHome
        temRascunho={w.temRascunho}
        onComecar={() => {
          w.reiniciar();
          setFase('form');
        }}
        onRetomar={() => setFase('form')}
        onAudio={() => setFase('audio')}
      />
    );
  }

  // ---------- áudio ----------
  if (fase === 'audio') {
    return (
      <AudioScreen
        onFechar={() => setFase('home')}
        onFormulario={() => {
          w.reiniciar();
          setFase('form');
        }}
      />
    );
  }

  // ---------- comprovante ----------
  if (fase === 'comprovante' && comprovante) {
    return (
      <ComprovanteView
        c={comprovante}
        onNovo={() => {
          w.reiniciar();
          setComprovante(null);
          setFase('home');
        }}
      />
    );
  }

  // ---------- formulário ----------
  const ctaDesabilitada = enviando || (noTermo && !w.dados.candidato.confirma_certidao);

  return (
    <div>
      <ProgressoFino atual={w.passoIndex} total={w.total} titulo={PASSOS[w.passoIndex].titulo} />

      <ResumoErros lista={errosAtuais.filter((e) => e.campo !== 'geral' && e.campo !== 'termo')} />
      {errosAtuais.some((e) => e.campo === 'geral') && (
        <div className="callout callout-soft">{errosAtuais.find((e) => e.campo === 'geral')?.mensagem}</div>
      )}

      {w.passoId === 'termo' && <PassoTermo {...stepProps} />}
      {w.passoId === 'identificacao' && <PassoIdentificacao {...stepProps} formRef={formRef} />}
      {w.passoId === 'social' && <PassoSocial {...stepProps} formRef={formRef} />}
      {w.passoId === 'escolhas' && <PassoEscolas {...stepProps} />}
      {naRevisao && (
        <PassoRevisao
          d={w.dados}
          formRef={formRef}
          onEditar={(pid: PassoId) => {
            setErrosServidor([]);
            w.irPara(PASSOS.findIndex((x) => x.id === pid));
          }}
        />
      )}

      <div style={{ height: 90 }} />

      <div className="bottom-cta">
        <button
          className="back-link"
          onClick={() => {
            setErrosServidor([]);
            if (w.passoIndex === 0) setFase('home');
            else w.voltar();
          }}
        >
          ← Voltar
        </button>
        <button className="btn-continuar" onClick={continuar} disabled={ctaDesabilitada}>
          {enviando
            ? 'Gerando…'
            : naRevisao
              ? 'Finalizar Inscrição'
              : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
