import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { VisaoGeral } from './pages/VisaoGeral';
import { Inscricao } from './pages/Inscricao';
import { Concorrencia } from './pages/Concorrencia';
import { Consulta } from './pages/Consulta';
import { PainelServidor } from './pages/PainelServidor';
import { Sobre } from './pages/Sobre';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <VisaoGeral /> },
      { path: 'inscricao', element: <Inscricao /> },
      { path: 'concorrencia', element: <Concorrencia /> },
      { path: 'consulta', element: <Consulta /> },
      { path: 'painel-servidor', element: <PainelServidor /> },
      { path: 'sobre', element: <Sobre /> },
      { path: '*', element: <VisaoGeral /> },
    ],
  },
]);
