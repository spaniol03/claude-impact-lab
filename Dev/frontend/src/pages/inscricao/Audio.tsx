import { useEffect, useRef, useState } from 'react';

/**
 * Jornada alternativa por áudio (demonstração roteirizada, como no mock).
 * Não usa reconhecimento de voz real — apresenta o fluxo conversacional para quem
 * tem dificuldade de digitar ou ler telas longas.
 */

const ROTEIRO = [
  { q: 'Qual é o CPF da criança?', a: '123.456.789-00' },
  { q: 'Qual o nome completo da criança?', a: 'Ana Clara de Souza' },
  { q: 'Em qual bairro vocês moram?', a: 'Tijuca' },
  { q: 'A criança tem irmão já matriculado na rede?', a: 'Não' },
  { q: 'Quer que eu sugira as creches mais perto de casa?', a: 'Sim, por favor' },
];

interface Bolha {
  quem: 'bot' | 'user';
  texto: string;
}

export function AudioScreen({ onFechar, onFormulario }: { onFechar: () => void; onFormulario: () => void }) {
  const [log, setLog] = useState<Bolha[]>([
    { quem: 'bot', texto: '🔊 Oi! Vou te fazer algumas perguntas em voz alta. Toque no microfone e responda falando.' },
  ]);
  const [idx, setIdx] = useState(0);
  const [ouvindo, setOuvindo] = useState(false);
  const [fim, setFim] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (idx < ROTEIRO.length) {
      setLog((l) => [...l, { quem: 'bot', texto: `🔊 ${ROTEIRO[idx].q}` }]);
    } else if (!fim) {
      setLog((l) => [
        ...l,
        { quem: 'bot', texto: '🔊 Prontinho! Recebemos suas respostas — vamos usar isso para completar a inscrição.' },
      ]);
      setFim(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [log]);

  function responder() {
    if (ouvindo || fim) return;
    setOuvindo(true);
    setTimeout(() => {
      setLog((l) => [...l, { quem: 'user', texto: `🎤 "${ROTEIRO[idx].a}"` }]);
      setIdx((i) => i + 1);
      setOuvindo(false);
    }, 1100);
  }

  return (
    <div className="audio-screen" role="dialog" aria-label="Inscrição por áudio">
      <div className="audio-header">
        <span>🎙️ Inscrição por áudio</span>
        <button onClick={onFechar}>Fechar ✕</button>
      </div>
      <div className="audio-body" ref={bodyRef}>
        {log.map((b, i) => (
          <div key={i} className={`audio-bubble ${b.quem}`}>
            {b.texto}
          </div>
        ))}
      </div>
      <div className="audio-footer">
        <button className="mic-btn" onClick={responder} disabled={ouvindo || fim} aria-label="Responder por voz">
          🎙
        </button>
        <p className="fine">
          {fim ? 'Respostas registradas' : ouvindo ? '● Ouvindo…' : 'Toque para responder por voz'}
        </p>
        <button className="audio-alt-link" onClick={onFormulario}>
          Prefiro digitar — ir para o formulário
        </button>
      </div>
    </div>
  );
}
