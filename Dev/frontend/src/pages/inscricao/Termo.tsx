import { CheckCampo } from '../../components/campos';
import type { PassoProps } from './tipos';

export function PassoTermo({ d, set, err }: PassoProps) {
  return (
    <div className="card">
      <h2>Termo de Uso</h2>
      <div className="callout callout-info">
        Coletamos nome, CPF, endereço e situação da família para definir a prioridade da vaga.
        Você pode corrigir seus dados e pedir explicações a qualquer momento.
      </div>
      <p className="fine">
        Texto legal completo conforme LGPD, LAI, Marco Civil e Lei 13.460/2017 — condensado
        neste protótipo. Nesta simulação, <strong>nada é enviado à SME</strong> e o rascunho
        fica só no seu navegador.
      </p>
      <div style={{ marginTop: 12 }}>
        <CheckCampo
          campo="termo"
          marcado={d.candidato.confirma_certidao}
          texto="Li e concordo com o termo"
          onChange={(v) =>
            set((s) => ({ ...s, candidato: { ...s.candidato, confirma_certidao: v } }))
          }
        />
        {err['termo'] && <span className="campo-erro">{err['termo']}</span>}
      </div>
    </div>
  );
}
