import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * Jornada alternativa por áudio — recurso de acessibilidade.
 *
 * Porte do módulo `AudioJourney` de
 * `mock_matricula_mobile_acessibilidadefinalizada/mock_matricula_mobile.html`:
 * chat de voz autocontido (não depende do formulário de texto) com
 *   - fala real do assistente (TTS): StreamElements (voz pt-BR "Vitoria") com
 *     fallback para o `speechSynthesis` do navegador;
 *   - reconhecimento de voz real (Web Speech API) com mensagens de contorno
 *     quando não há suporte / permissão / silêncio;
 *   - botão 🔊 em cada mensagem do assistente para ouvir de novo;
 *   - botão 🔁 Repetir a pergunta atual;
 *   - botões Sim / Não para as perguntas fechadas;
 *   - saída "Prefiro digitar" para o formulário de texto.
 *
 * Identidade visual inalterada: usa as classes `.audio-*` e `.aj-*` já no CSS.
 */

/* ============================ tipos ============================ */

type Modo = 'sim-nao' | 'aberto' | null;

interface Bolha {
  id: number;
  quem: 'bot' | 'user';
  texto: string;
}

interface Turno {
  tipo: 'falar' | 'perguntar-sim-nao' | 'perguntar-aberto';
  chave?: string;
  texto: string | (() => string);
  aoResponder?: (valor: string) => void;
  validar?: (valor: string) => { ok: true; valor: string } | { ok: false; mensagem: string };
}

interface EstadoJornada {
  respostas: Record<string, string>;
  escolas: string[];
  opcoesAtuais: { name: string; concorrida: boolean }[];
  protocolo?: string;
}

/* ============================ dados do roteiro ============================ */

const PAUSA_APOS_FALA_MS = 350;

const DOCUMENTOS = [
  'Documento 1: CPF da criança.',
  'Documento 2: RG ou certidão de nascimento da criança.',
  'Documento 3: CPF do responsável.',
  'Documento 4: comprovante de residência atualizado.',
  'Documento 5, se você tiver: comprovante de renda ou número do CadÚnico.',
];

const PERGUNTAS_PRIORIDADE = [
  'A criança possui deficiência, T G D, ou altas habilidades?',
  'Algum dos pais ou responsáveis tem 60 anos ou mais?',
  'A mãe é adolescente, menor de 18 anos?',
  'Existe alguma doença crônica grave na família?',
  'Alguém no convívio diário é vítima de violência doméstica?',
  'Existe uso abusivo de drogas ou álcool na família?',
  'Algum membro da família está preso, ou já esteve?',
  'Sua família aguardou fila de espera no ano anterior sem ser atendida?',
  'Sua família está inscrita no Cadastro Único, o CadÚnico?',
  'Sua família é monoparental, com só um responsável?',
  'A criança é público-alvo da educação especial?',
  'Sua família participa do Programa Pequenos Cariocas?',
  'Sua família recebe o Bolsa Família?',
];

const BAIRROS_MOCK: Record<string, { name: string; concorrida: boolean }[]> = {
  tijuca: [
    { name: 'CM Tijuca Praça', concorrida: false },
    { name: 'CM Vila Isabel', concorrida: false },
  ],
  copacabana: [
    { name: 'CM Rio Novo-Rio das Flores', concorrida: true },
    { name: 'CM Jardim Botânico', concorrida: false },
  ],
  botafogo: [
    { name: 'CM Botafogo Praia', concorrida: false },
    { name: 'CM Humaitá', concorrida: false },
  ],
};

const ORDINAIS = ['primeira', 'segunda', 'terceira', 'quarta', 'quinta'];

function normalizar(txt: string): string {
  return (txt || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
}

function buscarEscolasPorBairro(txt: string) {
  return BAIRROS_MOCK[normalizar(txt)] ?? BAIRROS_MOCK.tijuca;
}

function interpretarSimNao(transcript: string): 'Sim' | 'Não' | null {
  const t = normalizar(transcript);
  if (/\b(sim|pode|claro|concordo|aceito|quero|positivo|isso|com certeza|afirmativo)\b/.test(t)) return 'Sim';
  if (/\b(nao|negativo|nunca|jamais|nem)\b/.test(t)) return 'Não';
  return null;
}

/* ============================ TTS (fala do assistente) ============================ */

const TTS_URL = 'https://api.streamelements.com/kappa/v2/speech?voice=Vitoria&text=';

function criarNarrador() {
  let audioAtual: HTMLAudioElement | null = null;
  let resolverPendente: (() => void) | null = null;

  function fallbackLocal(texto: string): Promise<void> {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = 'pt-BR';
      const vozes = window.speechSynthesis.getVoices();
      const vozBr =
        vozes.find((v) => /pt[-_]BR/i.test(v.lang) && /fem|maria|luciana|francisca|vit[oó]ria/i.test(v.name)) ??
        vozes.find((v) => /pt[-_]BR/i.test(v.lang));
      if (vozBr) u.voice = vozBr;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }

  function parar() {
    if (audioAtual) {
      audioAtual.onended = null;
      audioAtual.onerror = null;
      audioAtual.pause();
      audioAtual = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (resolverPendente) {
      const r = resolverPendente;
      resolverPendente = null;
      r();
    }
  }

  /** Fala `texto`. Se interromper uma fala anterior ainda pendente (ex.: um
   *  replay durante o roteiro), a promessa anterior só resolve quando esta
   *  terminar — assim o roteiro nunca "atropela" um replay. */
  function falar(texto: string): Promise<void> {
    const pendenteAnterior = resolverPendente;
    resolverPendente = null;
    if (audioAtual) {
      audioAtual.onended = null;
      audioAtual.onerror = null;
      audioAtual.pause();
      audioAtual = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    return new Promise((resolve) => {
      const resolveTudo = () => {
        if (pendenteAnterior) pendenteAnterior();
        resolve();
      };
      const terminou = () => {
        if (resolverPendente === resolveTudo) resolverPendente = null;
        resolveTudo();
      };
      resolverPendente = resolveTudo;
      try {
        const audio = new Audio(TTS_URL + encodeURIComponent(texto));
        audioAtual = audio;
        audio.onended = terminou;
        audio.onerror = () => {
          audioAtual = null;
          void fallbackLocal(texto).then(terminou);
        };
        void audio.play().catch(() => {
          audioAtual = null;
          void fallbackLocal(texto).then(terminou);
        });
      } catch {
        void fallbackLocal(texto).then(terminou);
      }
    });
  }

  return { falar, parar };
}

/* ============================ motor da jornada ============================ */

interface MotorDeps {
  setLog: Dispatch<SetStateAction<Bolha[]>>;
  setModo: Dispatch<SetStateAction<Modo>>;
  setHint: Dispatch<SetStateAction<string>>;
  setTocandoId: Dispatch<SetStateAction<number | null>>;
  setMicOff: Dispatch<SetStateAction<boolean>>;
}

function criarMotor(deps: MotorDeps) {
  const narrador = criarNarrador();
  let sessao = 0;
  let roteiro: Turno[] = [];
  let passo = 0;
  let estado: EstadoJornada = { respostas: {}, escolas: [], opcoesAtuais: [] };
  let recAtivo: SpeechRecognitionLike | null = null;
  let bolhaSeq = 0;

  function novaBolha(quem: 'bot' | 'user', texto: string): number {
    const id = ++bolhaSeq;
    deps.setLog((l) => [...l, { id, quem, texto }]);
    return id;
  }

  function falarBot(texto: string): Promise<void> {
    const id = novaBolha('bot', texto);
    deps.setTocandoId(id);
    return narrador.falar(texto).then(() => {
      deps.setTocandoId((cur) => (cur === id ? null : cur));
    });
  }

  function falarUsuario(texto: string) {
    novaBolha('user', texto);
  }

  function ouvirNovamente(texto: string, id: number) {
    deps.setTocandoId(id);
    void narrador.falar(texto).then(() => {
      deps.setTocandoId((cur) => (cur === id ? null : cur));
    });
  }

  function atualizarControles(modo: Modo) {
    deps.setModo(modo);
    if (modo === 'sim-nao') {
      deps.setMicOff(false);
      deps.setHint('Diga sim ou não, ou toque num botão');
    } else if (modo === 'aberto') {
      deps.setMicOff(false);
      deps.setHint('Toque para responder por voz');
    } else {
      deps.setMicOff(true);
      deps.setHint(passo >= roteiro.length ? 'Conversa encerrada' : '…');
    }
  }

  function turnoAtual(): Turno | undefined {
    return roteiro[passo];
  }

  function processarPasso() {
    const minha = sessao;
    if (passo >= roteiro.length) {
      atualizarControles(null);
      return;
    }
    const t = roteiro[passo];
    const texto = typeof t.texto === 'function' ? t.texto() : t.texto;

    if (t.tipo === 'falar') {
      passo++;
      atualizarControles(null);
      void falarBot(texto).then(() => {
        if (minha !== sessao) return;
        window.setTimeout(() => {
          if (minha === sessao) processarPasso();
        }, PAUSA_APOS_FALA_MS);
      });
    } else {
      const modo: Modo = t.tipo === 'perguntar-sim-nao' ? 'sim-nao' : 'aberto';
      atualizarControles(modo);
      void falarBot(texto).then(() => {
        if (minha === sessao) atualizarControles(modo);
      });
    }
  }

  function registrarResposta(t: Turno, entrada: string) {
    const minha = sessao;
    narrador.parar();
    falarUsuario(entrada);

    let valor = entrada;
    if (t.validar) {
      const v = t.validar(valor);
      if (!v.ok) {
        void falarBot(v.mensagem).then(() => {
          if (minha === sessao) {
            atualizarControles(t.tipo === 'perguntar-sim-nao' ? 'sim-nao' : 'aberto');
          }
        });
        return; // não avança — repete a mesma pergunta
      }
      valor = v.valor;
    }

    if (t.chave) estado.respostas[t.chave] = valor;
    t.aoResponder?.(valor);
    passo++;
    atualizarControles(null);
    window.setTimeout(() => {
      if (minha === sessao) processarPasso();
    }, 500);
  }

  /* ---------- reconhecimento de fala real ---------- */

  function ouvirVoz(): Promise<string> {
    return new Promise((resolve, reject) => {
      const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
      if (!Ctor) {
        reject(new Error('sem-suporte'));
        return;
      }
      const rec = new Ctor();
      recAtivo = rec;
      rec.lang = 'pt-BR';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      let terminado = false;
      rec.onresult = (ev) => {
        terminado = true;
        resolve(ev.results[0][0].transcript.trim());
      };
      rec.onerror = (ev) => {
        if (terminado) return;
        terminado = true;
        reject(new Error(ev.error ?? 'erro'));
      };
      rec.onend = () => {
        recAtivo = null;
        if (!terminado) {
          terminado = true;
          reject(new Error('silencio'));
        }
      };
      rec.start();
    });
  }

  function pararReconhecimento() {
    if (recAtivo) {
      try {
        recAtivo.abort();
      } catch {
        /* noop */
      }
      recAtivo = null;
    }
  }

  function responderVoz() {
    const t = turnoAtual();
    if (!t || (t.tipo !== 'perguntar-sim-nao' && t.tipo !== 'perguntar-aberto')) return;
    const minha = sessao;

    narrador.parar();
    deps.setMicOff(true);
    deps.setModo(null);
    deps.setHint('● Ouvindo… fale agora');

    ouvirVoz()
      .then((transcript) => {
        if (minha !== sessao) return;
        if (t.tipo === 'perguntar-sim-nao') {
          const resposta = interpretarSimNao(transcript);
          if (!resposta) {
            falarUsuario(transcript);
            void falarBot('Não entendi se foi sim ou não. Pode repetir? Ou toque num dos botões.').then(() => {
              if (minha === sessao) atualizarControles('sim-nao');
            });
            return;
          }
          registrarResposta(t, resposta);
        } else {
          registrarResposta(t, transcript);
        }
      })
      .catch((err: Error) => {
        if (minha !== sessao) return;
        const modo: Modo = t.tipo === 'perguntar-sim-nao' ? 'sim-nao' : 'aberto';
        let msg: string;
        if (err.message === 'sem-suporte') {
          msg =
            'Este navegador não tem reconhecimento de voz. Use os botões da tela, ou toque em "Prefiro digitar" para o formulário de texto.';
        } else if (err.message === 'not-allowed' || err.message === 'service-not-allowed') {
          msg = 'Preciso da sua permissão para usar o microfone. Verifique o aviso do navegador e tente de novo.';
        } else if (err.message === 'silencio' || err.message === 'no-speech') {
          msg = 'Não ouvi nada. Toque no microfone e fale logo em seguida.';
        } else {
          msg = 'Tive um problema para ouvir. Vamos tentar de novo?';
        }
        void falarBot(msg).then(() => {
          if (minha === sessao) atualizarControles(modo);
        });
      });
  }

  function responderTexto(valor: string) {
    const t = turnoAtual();
    if (!t || t.tipo !== 'perguntar-sim-nao') return;
    registrarResposta(t, valor);
  }

  function repetir() {
    const t = turnoAtual();
    if (!t) return;
    const texto = typeof t.texto === 'function' ? t.texto() : t.texto;
    void falarBot('(repetindo) ' + texto);
  }

  /* ---------- construção do roteiro ---------- */

  function passosRodadaEscola(rodada: number): Turno[] {
    const passos: Turno[] = [];
    passos.push({
      tipo: 'perguntar-aberto',
      chave: 'bairroEscolha' + rodada,
      texto:
        rodada === 1
          ? 'Em qual bairro você quer procurar uma creche? Toque no microfone e diga o nome do bairro.'
          : 'Em qual outro bairro você quer procurar?',
      aoResponder: (valor) => {
        estado.opcoesAtuais = buscarEscolasPorBairro(valor);
      },
    });
    passos.push({
      tipo: 'falar',
      texto: () => {
        const lista = estado.opcoesAtuais
          .map(
            (e) =>
              e.name +
              (e.concorrida
                ? ' — atenção, é uma unidade concorrida, com fila maior que a maioria; isso não impede sua criança de ser chamada'
                : ''),
          )
          .join('; ');
        return 'Encontrei estas opções: ' + lista + '.';
      },
    });
    passos.push({
      tipo: 'perguntar-aberto',
      chave: 'escolaEscolhida' + rodada,
      texto: 'Qual delas você quer como ' + ORDINAIS[rodada - 1] + ' opção? Diga o nome, ou toque no microfone.',
      validar: (valor) => {
        const dito = normalizar(valor);
        const achada = estado.opcoesAtuais.find((e) => {
          const nome = normalizar(e.name);
          if (nome.indexOf(dito) !== -1 || dito.indexOf(nome) !== -1) return true;
          const palavras = dito.split(/\s+/).filter((p) => p.length > 2 && p !== 'creche');
          const acertos = palavras.filter((p) => nome.indexOf(p) !== -1).length;
          return palavras.length > 0 && acertos >= Math.ceil(palavras.length / 2);
        });
        if (!achada) {
          return {
            ok: false,
            mensagem: 'Hmm, não encontrei essa entre as opções que eu falei. Tente dizer de novo, só o nome da escola.',
          };
        }
        return { ok: true, valor: achada.name };
      },
      aoResponder: (valor) => {
        estado.escolas.push(valor);
      },
    });
    if (rodada < 3) {
      passos.push({
        tipo: 'perguntar-sim-nao',
        chave: 'maisEscolas' + rodada,
        texto: () =>
          'Você já escolheu ' +
          estado.escolas.length +
          ' de até 5 escolas. Quer escolher outra, em outro bairro? Diga sim ou não.',
        aoResponder: (valor) => {
          if (/^sim/i.test(valor)) {
            const proximos = passosRodadaEscola(rodada + 1);
            roteiro.splice(passo + 1, 0, ...proximos);
          }
        },
      });
    } else {
      passos.push({
        tipo: 'falar',
        texto: () =>
          'Você escolheu ' +
          estado.escolas.length +
          ' escolas por voz. Se quiser completar até 5, dá pra continuar depois pelo formulário de texto.',
      });
    }
    return passos;
  }

  function montarResumoFalado(): string {
    let simCount = 0;
    PERGUNTAS_PRIORIDADE.forEach((_, i) => {
      if (/^sim/i.test(estado.respostas['prioridade' + i] ?? '')) simCount++;
    });
    const escolasTxt = estado.escolas.length ? estado.escolas.join(', ') : 'nenhuma escola confirmada ainda';
    return (
      'Deixa eu recapitular: CPF ' +
      (estado.respostas.cpf ?? 'não informado') +
      ', WhatsApp ' +
      (estado.respostas.whatsapp ?? 'não informado') +
      '. Você respondeu sim para ' +
      simCount +
      ' das ' +
      PERGUNTAS_PRIORIDADE.length +
      ' perguntas de prioridade.' +
      ' E escolheu, em ordem: ' +
      escolasTxt +
      '.'
    );
  }

  function finalizarInscricao() {
    const protocolo = '2026' + Math.floor(100000 + Math.random() * 899999);
    estado.protocolo = protocolo;
    roteiro.splice(
      passo + 1,
      roteiro.length,
      { tipo: 'falar', texto: 'Prontinho! Sua inscrição foi registrada com o número ' + protocolo + '.' },
      {
        tipo: 'falar',
        texto:
          'Guarde esse número. Você ainda precisa comparecer presencialmente à escola com os documentos que eu falei no começo da nossa conversa.',
      },
      { tipo: 'falar', texto: 'Foi um prazer te ajudar! Você já pode fechar esta tela quando quiser.' },
    );
  }

  function construirRoteiro(): Turno[] {
    const passos: Turno[] = [];

    passos.push({
      tipo: 'falar',
      texto:
        'Oi! Que bom te ver por aqui. Eu sou o assistente de voz da Matrícula Carioca, e vou te ajudar a fazer a inscrição da creche só conversando.',
    });
    passos.push({
      tipo: 'falar',
      texto:
        'Você não precisa ler nem digitar nada — eu falo cada pergunta, e você responde tocando no microfone e falando, ou tocando num botão quando eu perguntar sim ou não.',
    });

    passos.push({
      tipo: 'falar',
      texto: 'Antes de começarmos, separe estes documentos, porque você vai precisar deles depois, na escola:',
    });
    DOCUMENTOS.forEach((doc) => passos.push({ tipo: 'falar', texto: doc }));
    passos.push({
      tipo: 'falar',
      texto:
        'Pode ser foto do documento ou o papel físico — por aqui não precisa enviar nada agora, é só pra você já separar.',
    });

    passos.push({
      tipo: 'perguntar-sim-nao',
      chave: 'termo',
      texto:
        'Para continuar, preciso da sua concordância: vamos usar o nome, CPF, endereço e situação da família só para definir a prioridade da vaga. Você concorda? Diga sim ou não.',
      aoResponder: (valor) => {
        if (!/^sim/i.test(valor)) {
          roteiro.splice(
            passo + 1,
            roteiro.length,
            {
              tipo: 'falar',
              texto: 'Tudo bem, sem problemas. Sem essa concordância eu não posso continuar a inscrição por aqui.',
            },
            {
              tipo: 'falar',
              texto: "Você pode voltar quando quiser, ou tocar em 'Prefiro digitar' para tentar pelo formulário de texto.",
            },
          );
        }
      },
    });

    passos.push({
      tipo: 'perguntar-aberto',
      chave: 'cpf',
      texto: 'Vamos começar pela criança. Qual é o número do CPF dela? Toque no microfone e fale os números.',
    });
    passos.push({
      tipo: 'falar',
      texto:
        'Perfeito, deixa eu buscar... Encontrei os dados no nosso sistema, com a Receita Federal e o Registro Municipal Integrado.',
    });
    passos.push({
      tipo: 'falar',
      texto:
        'O nome é Ana Clara de Souza, nascida em 14 de março de 2023, e o endereço registrado é na Rua Conde de Bonfim, no bairro Tijuca.',
    });
    passos.push({
      tipo: 'falar',
      texto:
        'Se algum desses dados estiver errado, você pode corrigir depois no formulário de texto — por voz, vamos seguir com o que encontramos.',
    });

    passos.push({
      tipo: 'perguntar-aberto',
      chave: 'whatsapp',
      texto:
        'Agora preciso de um jeito de te avisar sobre a inscrição. Qual o número de WhatsApp para contato, com o DDD?',
    });

    passos.push({
      tipo: 'perguntar-sim-nao',
      chave: 'irmao',
      texto:
        'Você tem outro filho ou filha com inscrição online já feita na rede municipal? Diga sim ou não.',
    });

    passos.push({
      tipo: 'falar',
      texto:
        "Agora vou fazer algumas perguntas rápidas sobre a situação da sua família. Elas servem só para verificar se vocês têm prioridade na fila — responder 'não' não atrapalha em nada a inscrição.",
    });
    PERGUNTAS_PRIORIDADE.forEach((p, i) => {
      passos.push({ tipo: 'perguntar-sim-nao', chave: 'prioridade' + i, texto: p });
    });

    passos.push({
      tipo: 'falar',
      texto: 'Ótimo, terminamos a parte de situação familiar. Agora vamos escolher as creches.',
    });
    passos.push(...passosRodadaEscola(1));

    passos.push({ tipo: 'falar', texto: () => montarResumoFalado() });

    passos.push({
      tipo: 'perguntar-sim-nao',
      chave: 'confirmacaoFinal',
      texto: 'Posso confirmar e enviar sua inscrição agora, com tudo o que conversamos? Diga sim ou não.',
      aoResponder: (valor) => {
        if (/^sim/i.test(valor)) {
          finalizarInscricao();
        } else {
          roteiro.splice(passo + 1, roteiro.length, {
            tipo: 'falar',
            texto:
              "Sem problemas, não vou enviar ainda. Toque em 'Prefiro digitar' se quiser revisar e corrigir algo no formulário de texto.",
          });
        }
      },
    });

    return passos;
  }

  function iniciar() {
    sessao++;
    narrador.parar();
    pararReconhecimento();
    estado = { respostas: {}, escolas: [], opcoesAtuais: [] };
    roteiro = construirRoteiro();
    passo = 0;
    deps.setLog([]);
    atualizarControles(null);
    processarPasso();
  }

  function encerrar() {
    sessao++;
    narrador.parar();
    pararReconhecimento();
  }

  return { iniciar, encerrar, responderVoz, responderTexto, repetir, ouvirNovamente };
}

/* ============================ componente ============================ */

export function AudioScreen({ onFechar, onFormulario }: { onFechar: () => void; onFormulario: () => void }) {
  const [log, setLog] = useState<Bolha[]>([]);
  const [modo, setModo] = useState<Modo>(null);
  const [hint, setHint] = useState('…');
  const [tocandoId, setTocandoId] = useState<number | null>(null);
  const [micOff, setMicOff] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [motor] = useState(() => criarMotor({ setLog, setModo, setHint, setTocandoId, setMicOff }));

  useEffect(() => {
    motor.iniciar();
    return () => motor.encerrar();
  }, [motor]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [log]);

  function sairParaTexto() {
    motor.encerrar();
    onFormulario();
  }
  function fechar() {
    motor.encerrar();
    onFechar();
  }

  return (
    <div className="audio-screen" role="dialog" aria-label="Inscrição por áudio">
      <div className="audio-header">
        <span>🎙️ Inscrição por áudio</span>
        <button onClick={fechar}>Fechar ✕</button>
      </div>

      <div className="audio-body" ref={bodyRef} aria-live="polite" aria-atomic="false">
        {log.map((b) =>
          b.quem === 'bot' ? (
            <div key={b.id} className="audio-bubble bot">
              <button
                type="button"
                className={`aj-speak${tocandoId === b.id ? ' playing' : ''}`}
                aria-label="Ouvir esta mensagem novamente"
                title="Ouvir novamente"
                onClick={() => motor.ouvirNovamente(b.texto, b.id)}
              >
                🔊
              </button>
              <span className="aj-text">{b.texto}</span>
            </div>
          ) : (
            <div key={b.id} className="audio-bubble user">
              🎤 &quot;{b.texto}&quot;
            </div>
          ),
        )}
      </div>

      <div className="audio-footer">
        {modo === 'sim-nao' && (
          <div className="aj-quick">
            <button type="button" onClick={() => motor.responderTexto('Sim')}>
              Sim
            </button>
            <button type="button" onClick={() => motor.responderTexto('Não')}>
              Não
            </button>
          </div>
        )}
        <button className="mic-btn" onClick={() => motor.responderVoz()} disabled={micOff} aria-label="Responder por voz">
          🎙
        </button>
        <p className="fine" role="status">
          {hint}
        </p>
        <div className="aj-utility">
          <button type="button" onClick={() => motor.repetir()}>
            🔁 Repetir
          </button>
          <button type="button" className="audio-alt-link" style={{ margin: 0 }} onClick={sairParaTexto}>
            Prefiro digitar
          </button>
        </div>
      </div>
    </div>
  );
}
