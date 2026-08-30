import type { MapaErros } from '../../forms/erros';
import type { DadosInscricao } from '../../forms/schema';

export interface PassoProps {
  d: DadosInscricao;
  set: (patch: (d: DadosInscricao) => DadosInscricao) => void;
  err: MapaErros;
}
