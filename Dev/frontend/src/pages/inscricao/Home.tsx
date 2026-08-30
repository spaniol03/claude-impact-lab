import { Link } from 'react-router-dom';

export function InscricaoHome({
  temRascunho,
  onComecar,
  onRetomar,
  onAudio,
}: {
  temRascunho: boolean;
  onComecar: () => void;
  onRetomar: () => void;
  onAudio: () => void;
}) {
  return (
    <>
      <div className="banner">
        <div className="yr">2026</div>
        <h1>Educação Infantil — Creche</h1>
        <p>Inscrições on-line abertas</p>
      </div>

      <div className="quick-grid">
        {temRascunho ? (
          <>
            <button className="quick-btn primaria" onClick={onRetomar}>
              Retomar minha inscrição
            </button>
            <button className="quick-btn" onClick={onComecar}>
              Começar do zero
            </button>
          </>
        ) : (
          <button className="quick-btn primaria" onClick={onComecar}>
            Inscreva-se aqui
          </button>
        )}
        <Link className="quick-btn" to="/consulta">
          Consultar inscrição
        </Link>
        <Link className="quick-btn" to="/concorrencia">
          Escolas por região
        </Link>
      </div>

      <div className="card" style={{ marginTop: 14, textAlign: 'center' }}>
        <div style={{ fontSize: '1.8rem' }}>🎙️</div>
        <h3 style={{ margin: '6px 0 4px' }}>Prefere responder falando?</h3>
        <p className="fine" style={{ marginBottom: 12 }}>
          Jornada alternativa por áudio, para quem tem dificuldade de digitar ou de ler telas
          longas.
        </p>
        <button className="quick-btn primaria" onClick={onAudio}>
          🎙️ Inscrição por áudio
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Antes de começar, tenha em mãos</h3>
        <ul style={{ paddingLeft: 18, margin: 0, fontSize: '0.86rem' }}>
          <li>CPF da criança (o formulário começa por ele)</li>
          <li>CPF do responsável e um telefone com WhatsApp</li>
          <li>NIS, se a família for do CadÚnico / Bolsa Família</li>
          <li>Número da inscrição do irmão, se houver</li>
          <li>Documentos que comprovem os critérios de vulnerabilidade que for marcar</li>
        </ul>
        <p className="fine" style={{ margin: '10px 0 0' }}>
          São 5 passos. Dá para parar e retomar — o rascunho fica salvo neste navegador.
        </p>
      </div>
    </>
  );
}
