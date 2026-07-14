import { useState, useEffect, useCallback } from 'react';
import { Shield, CheckCircle2, XCircle, Lock, Users, Grid } from 'lucide-react';
import { PageHeader, Card, Btn } from '../../../components/ui/shared';
import { usuariosApi, type APIUsuario } from '../../../services/api';

const MODULES = ['Tela Inicial', 'Cadastro de Pacientes', 'Agenda', 'Recepção', 'Prontuário Eletrônico', 'Relatórios', 'Financeiro', 'Administrativo', 'Cadastro de Usuários'];
const ROLES = ['Administrador', 'Profissional de Saúde', 'Recepcionista', 'Faturamento'];
// Matriz de referência (capacidades padrão por perfil)
const ACCESS: Record<string, boolean[]> = {
  'Tela Inicial': [true, true, true, true],
  'Cadastro de Pacientes': [true, true, true, false],
  'Agenda': [true, true, true, true],
  'Recepção': [true, true, true, false],
  'Prontuário Eletrônico': [true, true, false, false],
  'Relatórios': [true, true, false, true],
  'Financeiro': [true, true, false, true],
  'Administrativo': [true, false, false, true],
  'Cadastro de Usuários': [true, false, false, false],
};
const ROLE_OPCOES = [
  { v: 'administrador', label: 'Administrador' },
  { v: 'profissional_saude', label: 'Profissional de Saúde' },
  { v: 'recepcionista', label: 'Recepcionista' },
  { v: 'faturamento', label: 'Faturamento' },
];

export function AdminControlePage() {
  const [usuarios, setUsuarios] = useState<APIUsuario[]>([]);
  const [papeis, setPapeis] = useState<Record<string, string>>({});
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  const carregar = useCallback(() => {
    usuariosApi.listar().then(us => {
      setUsuarios(us);
      setPapeis(Object.fromEntries(us.map(u => [u.id, u.role || 'recepcionista'])));
    }).catch(() => {});
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const salvarPapel = async (u: APIUsuario) => {
    setSalvandoId(u.id);
    try { await usuariosApi.atualizar(u.id, { role: papeis[u.id] }); carregar(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro.'); }
    finally { setSalvandoId(null); }
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={Shield} title="Controle de Acesso" subtitle="Defina quais módulos cada usuário pode acessar conforme a LGPD" />
      <Card>
        <div className="flex items-center gap-2 mb-4"><Grid size={18} className="text-slate-500" /><h3 className="font-bold text-slate-700 text-sm">Matriz de Permissões por Perfil (referência)</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Módulo / Funcionalidade</th>
              {ROLES.map(r => <th key={r} className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{r}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {MODULES.map(mod => (
                <tr key={mod} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{mod}</td>
                  {(ACCESS[mod] || [false, false, false, false]).map((has, i) => (
                    <td key={i} className="px-4 py-3 text-center">{has ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto" /> : <XCircle size={16} className="text-red-300 mx-auto" />}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-start gap-2">
          <Lock size={16} className="shrink-0 mt-0.5" />
          <span><strong>LGPD:</strong> O acesso ao Prontuário Eletrônico é restrito a profissionais de saúde habilitados. Permissões finas por funcionário são definidas em <strong>Usuários</strong>.</span>
        </div>
      </Card>
      <Card>
        <div className="flex items-center gap-2 mb-4"><Users size={18} className="text-slate-500" /><h3 className="font-bold text-slate-700 text-sm">Usuários e Perfis de Acesso</h3></div>
        <div className="space-y-2">
          {usuarios.length === 0 ? <p className="text-sm text-slate-400 py-4 text-center">Nenhum usuário cadastrado.</p>
            : usuarios.map(u => (
              <div key={u.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                <div className="w-8 h-8 bg-brand-light rounded-lg flex items-center justify-center text-brand-primary font-bold text-xs">{u.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                <div className="flex-1"><p className="font-medium text-slate-800 text-sm">{u.nome}{u.is_dono && <span className="ml-1 text-[10px] text-amber-600">(dono)</span>}</p><p className="text-xs text-slate-400">{u.email}</p></div>
                <select value={papeis[u.id] || ''} onChange={e => setPapeis(p => ({ ...p, [u.id]: e.target.value }))} disabled={u.is_dono}
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs disabled:opacity-50">
                  {ROLE_OPCOES.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}
                </select>
                <Btn size="sm" onClick={() => salvarPapel(u)} disabled={u.is_dono || salvandoId === u.id}>{salvandoId === u.id ? '...' : 'Salvar'}</Btn>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}
