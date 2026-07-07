/**
 * Camada de API — conecta o frontend React ao backend FastAPI (http://localhost:8000)
 * Todos os endpoints são configuráveis via variável de ambiente VITE_API_URL
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Erro ${res.status}`);
  }
  return res.json();
}

// ──────────────────────────────────────────────────────────
// Pacientes
// ──────────────────────────────────────────────────────────
export interface APIPaciente {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
  data_nascimento?: string;
  sexo?: string;
  plano_saude?: string;
  observacoes?: string;
  alergias?: string;
}

export const pacientesApi = {
  listar: () => apiFetch<APIPaciente[]>('/api/pacientes'),
  criar: (data: Omit<APIPaciente, 'id'>) =>
    apiFetch<APIPaciente>('/api/pacientes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ──────────────────────────────────────────────────────────
// Consultas
// ──────────────────────────────────────────────────────────
export interface APIConsulta {
  id: number;
  paciente_id: number;
  data_hora: string;
  motivo?: string;
  cid?: string;
  cid_descricao?: string;
  historico?: string;
  prescricoes: APIPrescrição[];
}

export interface APIPrescrição {
  id: number;
  consulta_id: number;
  memed_id?: string;
  link_receita?: string;
  resumo_html?: string;
  data_criacao: string;
}

export const consultasApi = {
  listarPorPaciente: (pacienteId: number) =>
    apiFetch<APIConsulta[]>(`/api/pacientes/${pacienteId}/consultas`),
  criar: (data: { paciente_id: number; motivo?: string; cid?: string; cid_descricao?: string; historico?: string }) =>
    apiFetch<APIConsulta>('/api/consultas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ──────────────────────────────────────────────────────────
// CID — busca autocomplete
// ──────────────────────────────────────────────────────────
export interface CIDItem {
  codigo: string;
  descricao: string;
}

export const cidApi = {
  buscar: async (q: string): Promise<CIDItem[]> => {
    const res = await apiFetch<{ data: CIDItem[] }>(`/api/cid/search?q=${encodeURIComponent(q)}`);
    return res.data;
  },
};

// ──────────────────────────────────────────────────────────
// Memed — token e medicamentos
// ──────────────────────────────────────────────────────────
export interface MemedMedicamento {
  id: string | number;
  nome: string;
}

export const memedApi = {
  getToken: () => apiFetch<{ token: string }>('/api/memed/token'),
  buscarMedicamentos: async (q: string): Promise<MemedMedicamento[]> => {
    const res = await apiFetch<{ data: any[] }>(`/api/memed/medicamentos?q=${encodeURIComponent(q)}`);
    return (res.data || []).map((d: any) => ({
      id: d.id,
      nome: d.attributes?.name || d.nome || d.name || String(d.id),
    }));
  },
};
