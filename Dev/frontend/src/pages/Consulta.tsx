import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import type { Comprovante } from '../api/types';
import { Callout } from '../components/ui';
import { comprovantes } from '../forms/storage';
import { ComprovanteView } from './inscricao/Comprovante';

export function Consulta() {
  const salvos = comprovantes.listar();
  const [protocolo, setProtocolo] = useState('');
  const [achado, setAchado] = useState<Comprovante | null>(null);
  const [origem, setOrigem] = useState<'servidor' | 'navegador' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  async function consultar(p: string) {
    const proto = p.trim();
    if (!proto) return;
    setBuscando(true);
    setErro(null);
    try {
      const det = await api.obterInscricao(proto);
      setAchado(det.comprovante);
      setOrigem('servidor');
    } catch (e) {
      // fallback: comprovante salvo neste navegador
      const local = comprovantes.buscar(proto);
      if (local) {
        setAchado(local);
        setOrigem('navegador');
      } else {
        setAchado(null);
        setOrigem(null);
        setErro(
          e instanceof ApiError && e.status === 404
            ? 'Nenhuma inscrição registrada com esse protocolo.'
            : 'Não foi possível consultar agora. Verifique se a API está no ar.',
        );
      }
    } finally {
      setBuscando(false);
    }
  }

  if (achado) {
    return (
      <div className="pilha" style={{ gap: 'var(--e-4)' }}>
        <button
          className="btn btn-sec"
          onClick={() => {
            setAchado(null);
            setOrigem(null);
          }}
          style={{ alignSelf: 'flex-start' }}
        >
          ← Voltar à consulta
        </button>
        {origem === 'navegador' && (
          <Callout tom="alerta">
            Este comprovante veio do <b>armazenamento deste navegador</b> — a API não devolveu o
            registro. Numa implantação real, a fonte seria sempre o banco do servidor.
          </Callout>
        )}
        <ComprovanteView c={achado} />
      </div>
    );
  }

  return (
    <div className="pilha" style={{ gap: 'var(--e-5)', maxWidth: '65ch' }}>
      <section>
        <p className="fine" style={{ marginBottom: 4 }}>Consulta pública</p>
        <h1>Consultar inscrição</h1>
        <p className="intro">
          Digite o número do protocolo para ver o comprovante e a análise de concorrência das
          creches escolhidas. A inscrição é buscada no banco do servidor.
        </p>
      </section>

      <div className="card">
        <div className="field">
          <label htmlFor="protocolo">Número do protocolo</label>
          <input
            id="protocolo"
            placeholder="2026XXXXXXXX"
            value={protocolo}
            onChange={(e) => setProtocolo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && consultar(protocolo)}
          />
        </div>
        <button className="btn" onClick={() => consultar(protocolo)} disabled={buscando}>
          {buscando ? 'Consultando…' : 'Consultar'}
        </button>
        {erro && (
          <Callout tom="alerta">
            <span>{erro}</span>
          </Callout>
        )}
      </div>

      {salvos.length > 0 && (
        <div className="card">
          <strong>Inscrições feitas neste navegador</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 0, listStyle: 'none' }}>
            {salvos.map((c) => (
              <li key={c.protocolo} style={{ padding: '6px 0', borderBottom: '1px solid var(--c-linha)' }}>
                <button className="btn btn-sec" onClick={() => consultar(c.protocolo)} style={{ marginRight: 8 }}>
                  Abrir
                </button>
                <span className="mono">{c.protocolo}</span> — {c.candidato_nome}{' '}
                <span className="fine">({new Date(c.gerado_em).toLocaleDateString('pt-BR')})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Callout>
        Ainda não fez a inscrição? <Link to="/inscricao">Preencher o formulário</Link>.
      </Callout>
    </div>
  );
}
