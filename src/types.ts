export interface Trainee {
  id: number | string;
  name: string;
  matricula: string;
  funcao: string;
  progress: number;
  status: 'active' | 'pending' | 'completed' | 'none';
  email?: string;
}

export interface ClassItem {
  id: string;
  name: string;
  letter: string;
  color: string;
  students: number;
}

export interface TrainingRow {
  id: number;
  local: string;
  equipamento: string;
  data: string;
  hora: string;
  duracao: string;
  instrutor: string;
  avaliacao: string;
}

export interface MilestoneEvaluation {
  comment: string;
  inspector: string;
}

export type MilestoneEvaluations = Record<number, MilestoneEvaluation>;

export const LOCAL_OPTIONS = [
  "RECEPÇÃO", "VIRADOR", "GIROFLEX", "CLASSIFICAÇÃO", 
  "RECLASSIFICAÇÃO", "OFICINA", "FORMAÇÃO", "CTR"
];

export const FUNCAO_OPTIONS = [
  "OFICIAL DE OPERAÇÕES FERROVIÁRIAS",
  "MAQUINISTA PÁTIO"
];

export const PRESET_HOURS = ["432", "240"];
