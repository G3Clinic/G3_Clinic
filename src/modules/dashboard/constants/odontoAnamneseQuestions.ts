// Anamnese Odontológica padrão (pré-cadastrada) — usada no Odontograma antes de iniciar
// um plano de tratamento. Cada pergunta é sim/não com um campo de detalhe opcional
// (ex.: "Alergia a medicamento? — Sim — Dipirona"), salva em AnamneseOdonto.respostas
// como { [id]: { resposta: boolean | null; detalhe: string } }.
export interface OdontoAnamneseQuestion {
  id: string;
  texto: string;
  alerta?: boolean; // true = resposta "Sim" acende alerta visual (risco clínico relevante)
}

export const ODONTO_ANAMNESE_QUESTIONS: OdontoAnamneseQuestion[] = [
  { id: 'tratamento_medico', texto: 'Está em tratamento médico atualmente?' },
  { id: 'medicacao_continua', texto: 'Faz uso contínuo de alguma medicação?', alerta: true },
  { id: 'alergia_medicamento', texto: 'Tem alergia a algum medicamento (penicilina, antibióticos, anti-inflamatórios)?', alerta: true },
  { id: 'alergia_anestesico', texto: 'Já teve reação alérgica a anestésico local?', alerta: true },
  { id: 'alergia_latex', texto: 'Tem alergia a látex?', alerta: true },
  { id: 'problema_coagulacao', texto: 'Tem problema de coagulação sanguínea ou faz uso de anticoagulante?', alerta: true },
  { id: 'diabetes', texto: 'Tem diabetes?', alerta: true },
  { id: 'hipertensao', texto: 'Tem hipertensão arterial (pressão alta)?', alerta: true },
  { id: 'doenca_cardiaca', texto: 'Tem alguma doença cardíaca ou usa marca-passo?', alerta: true },
  { id: 'doenca_renal_hepatica', texto: 'Tem alguma doença renal ou hepática?', alerta: true },
  { id: 'doenca_infecciosa', texto: 'Tem hepatite, tuberculose ou outra doença infecciosa?', alerta: true },
  { id: 'gestante_amamentando', texto: 'Está gestante ou amamentando?', alerta: true },
  { id: 'fumante', texto: 'É fumante?' },
  { id: 'alcool', texto: 'Consome bebida alcoólica regularmente?' },
  { id: 'bruxismo', texto: 'Range ou aperta os dentes (bruxismo)?' },
  { id: 'sangramento_gengival', texto: 'Tem sangramento gengival espontâneo ou ao escovar?' },
  { id: 'cirurgia_odonto_previa', texto: 'Já fez cirurgia odontológica anteriormente? Teve alguma complicação?' },
  { id: 'febre_reumatica', texto: 'Já teve febre reumática?', alerta: true },
];
