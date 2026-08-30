import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { EstadoCarga } from '../components/ui';
import { num } from '../lib/format';

export function Sobre() {
  const meta = useApi(() => api.meta(), []);

  return (
    <div className="pilha" style={{ gap: 'var(--espaco-5)', maxWidth: '75ch' }}>
      <section>
        <h1>Sobre este protótipo</h1>
        <p className="intro">
          Camada de apoio à decisão entre a inscrição e a convocação na Inscrição Creche da
          SME-Rio. Não substitui nem altera o matricula.rio: a família continua escolhendo
          livremente até 5 unidades e a classificação por vulnerabilidade permanece intocada.
        </p>
      </section>

      <section className="card card-pad">
        <h2>As duas frentes</h2>
        <p>
          <strong>Frente 1 (família):</strong> ao marcar cada opção, um aviso de concorrência
          baseado no histórico real de fila. Informativo, nunca bloqueante.
        </p>
        <p style={{ marginBottom: 0 }}>
          <strong>Frente 2 (servidor):</strong> a cada confirmação, o motor cruza a classificação
          de vulnerabilidade com as preferências e sinaliza quais reservas liberar e para quem —
          mantendo o humano no loop.
        </p>
      </section>

      <section className="card card-pad">
        <h2>Arquitetura</h2>
        <ul>
          <li>
            <strong>Backend</strong> — FastAPI (Python), ambiente isolado em{' '}
            <span className="mono">.venv</span>. Em runtime serve apenas agregados JSON; não toca
            nas bases brutas.
          </li>
          <li>
            <strong>ETL</strong> — pipeline separado (pandas) que lê as bases anonimizadas uma
            vez e gera os agregados. Dependências isoladas em{' '}
            <span className="mono">requirements-etl.txt</span>.
          </li>
          <li>
            <strong>Frontend</strong> — React + TypeScript + Vite, desacoplado: fala com o
            backend só por HTTP. Sem framework de UI, gráficos em SVG puro.
          </li>
          <li>
            <strong>Sem credenciais</strong> — os agregados e o pré-preenchimento são dados de
            exemplo; nenhum segredo é necessário ou versionado.
          </li>
        </ul>
      </section>

      <section className="card card-pad">
        <h2>Como os dados da inscrição são guardados</h2>
        <p>
          As inscrições enviadas (dados cadastrais <strong>e situação social</strong>) são
          gravadas no banco do backend — por padrão um arquivo <span className="mono">SQLite</span>{' '}
          em <span className="mono">app/data/inscricoes.db</span>, sem servidor nem credenciais.
          Cada registro guarda o formulário completo em JSON, indexado pelo protocolo.
        </p>
        <ul>
          <li>
            <span className="mono">POST /api/v1/inscricoes</span> valida e grava; devolve o
            comprovante.
          </li>
          <li>
            <span className="mono">GET /api/v1/inscricoes/{'{protocolo}'}</span> recupera a
            inscrição — é a fonte da tela &quot;Consultar inscrição&quot;.
          </li>
          <li>
            O rascunho (enquanto você preenche) continua só no <span className="mono">localStorage</span>{' '}
            do navegador.
          </li>
        </ul>
        <div className="callout callout-soft">
          <b>Protótipo:</b> o SQLite local guarda dados pessoais de teste — o arquivo não é
          versionado. Numa implantação real, <span className="mono">CIV_DB_URL</span> apontaria
          para o banco gerido pela TI da Prefeitura, com controle de acesso e retenção conforme
          a LGPD.
        </div>
      </section>

      <EstadoCarga carregando={meta.carregando} erro={meta.erro} onRetry={meta.recarregar}>
        {meta.dados && (
          <section className="card card-pad">
            <h2>Recorte de dados carregado</h2>
            <div className="tabela-wrap">
              <table className="dados">
                <tbody>
                  <tr>
                    <th>Linhas (Query A)</th>
                    <td className="tabular">{num(meta.dados.linhas_query_a)}</td>
                  </tr>
                  <tr>
                    <th>Inscrições distintas</th>
                    <td className="tabular">{num(meta.dados.inscricoes)}</td>
                  </tr>
                  <tr>
                    <th>Unidades</th>
                    <td className="tabular">{num(meta.dados.unidades)}</td>
                  </tr>
                  <tr>
                    <th>Inscrições com score de vulnerabilidade</th>
                    <td className="tabular">{num(meta.dados.inscricoes_com_score)}</td>
                  </tr>
                  <tr>
                    <th>Anos</th>
                    <td>{meta.dados.anos.join(', ')}</td>
                  </tr>
                  <tr>
                    <th>Agregados gerados em</th>
                    <td>{new Date(meta.dados.gerado_em).toLocaleString('pt-BR')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <h3 style={{ marginTop: 'var(--espaco-4)' }}>Definições</h3>
            <ul>
              {Object.entries(meta.dados.definicoes).map(([k, v]) => (
                <li key={k}>
                  <strong>{k}</strong>: <span className="mono">{v}</span>
                </li>
              ))}
            </ul>
            <p className="tenue" style={{ marginBottom: 0 }}>
              {meta.dados.aviso}
            </p>
          </section>
        )}
      </EstadoCarga>
    </div>
  );
}
