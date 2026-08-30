import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const LINKS = [
  { to: '/', rotulo: 'Início', fim: true },
  { to: '/inscricao', rotulo: 'Inscrição' },
  { to: '/concorrencia', rotulo: 'Escolas por região' },
  { to: '/consulta', rotulo: 'Consultar inscrição' },
  { to: '/painel-servidor', rotulo: 'Painel do servidor' },
  { to: '/sobre', rotulo: 'Sobre' },
];

export function Layout() {
  const [aberto, setAberto] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  return (
    <div className="app-shell largo">
      <a href="#conteudo" className="skip-link">
        Ir para o conteúdo
      </a>

      <div className="util-bar">
        <span className="brand">PREFEITURA DO RIO</span>
        <span>Secretaria Municipal de Educação · Acessibilidade ♿</span>
      </div>

      <header className="nav-bar">
        <button
          className="hb"
          aria-label="Abrir menu"
          aria-expanded={aberto}
          onClick={() => setAberto(true)}
        >
          ☰
        </button>
        <NavLink to="/" className="lockup">
          MATRÍCULA
          <small>CARIOCA</small>
        </NavLink>
        <nav className="nav-inline" aria-label="Navegação">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.fim} className={({ isActive }) => (isActive ? 'ativo' : undefined)}>
              {l.rotulo}
            </NavLink>
          ))}
        </nav>
        <span className="a11y" aria-hidden="true">
          ♿
        </span>
      </header>

      {aberto && (
        <>
          <div className="drawer-backdrop" onClick={() => setAberto(false)} />
          <nav className="drawer" aria-label="Menu">
            <div className="drawer-tit">Matrícula Carioca</div>
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.fim}
                className={({ isActive }) => (isActive ? 'ativo' : undefined)}
              >
                {l.rotulo}
              </NavLink>
            ))}
          </nav>
        </>
      )}

      <main id="conteudo" className="page">
        <Outlet />
      </main>

      <footer className="rodape">
        <strong>Claude Impact Lab 2026</strong> · Desafio VTEX / Prefeitura do Rio — SME.
        Protótipo de apoio à decisão. Dados anonimizados; nenhum dado pessoal é coletado ou
        exibido. A inscrição é uma simulação e nada é enviado à SME.
      </footer>
    </div>
  );
}
