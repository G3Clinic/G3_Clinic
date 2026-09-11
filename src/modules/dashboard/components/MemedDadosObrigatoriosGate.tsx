import { useEffect, useState } from 'react';
import { AlertTriangle, Save } from 'lucide-react';
import { authApi, type AuthUser } from '../../../services/api';
import { InputField, SelectField } from '../../../components/ui/shared';

// Bloqueia o profissional de saúde até ele preencher os dados que a Memed exige
// para validar o prescritor no CFM (CPF, Conselho/UF, Data de Nascimento). Sem
// isso a Memed marca o cadastro como Inativo e o módulo de prescrição digital
// abre em branco — confirmado com o suporte da Memed em 2026-09. Antes disso o
// preenchimento dependia de um administrador editar usuário por usuário em
// Cadastro de Usuários, o que é frágil (26 profissionais ficaram sem o dado por
// semanas). Este gate força o próprio profissional a resolver no primeiro login.
const UFS = ['SP', 'RJ', 'MG', 'BA'];

type CamposMemed = {
  cpf: string;
  conselho_tipo: string;
  conselho_numero: string;
  conselho_uf: string;
  data_nascimento: string;
};

function faltaAlgo(u: AuthUser): boolean {
  return !u.cpf?.trim() || !u.conselho_numero?.trim() || !u.conselho_uf?.trim() || !u.data_nascimento;
}

export function MemedDadosObrigatoriosGate() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [form, setForm] = useState<CamposMemed>({ cpf: '', conselho_tipo: 'CRM', conselho_numero: '', conselho_uf: 'BA', data_nascimento: '' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    authApi.me().then(u => {
      setUser(u);
      if (u.role === 'profissional_saude' && faltaAlgo(u)) {
        setForm({
          cpf: u.cpf || '',
          conselho_tipo: u.conselho_tipo || 'CRM',
          conselho_numero: u.conselho_numero || '',
          conselho_uf: u.conselho_uf || 'BA',
          data_nascimento: u.data_nascimento ? u.data_nascimento.slice(0, 10) : '',
        });
        setBloqueado(true);
      }
    }).catch(() => { /* sem sessão válida ainda — rota protegida cuida disso */ });
  }, []);

  if (!bloqueado || !user) return null;

  const setCampo = (c: keyof CamposMemed, v: string) => setForm(prev => ({ ...prev, [c]: v }));

  const salvar = async () => {
    setErro('');
    if (!form.cpf.trim() || !form.conselho_numero.trim() || !form.conselho_uf.trim() || !form.data_nascimento) {
      setErro('Todos os campos são obrigatórios para a prescrição digital funcionar.');
      return;
    }
    setSalvando(true);
    try {
      await authApi.atualizarPerfil({
        cpf: form.cpf.trim(),
        conselho_tipo: form.conselho_tipo,
        conselho_numero: form.conselho_numero.trim(),
        conselho_uf: form.conselho_uf,
        data_nascimento: form.data_nascimento,
      });
      const atualizado = await authApi.me();
      if (faltaAlgo(atualizado)) {
        setErro('Não foi possível confirmar o salvamento. Tente novamente.');
        return;
      }
      setBloqueado(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar seus dados.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-full flex flex-col overflow-hidden animate-fade-in-up">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-amber-50 flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Dados obrigatórios para prescrição digital</h3>
            <p className="text-xs text-slate-500">Complete seu cadastro para continuar, {user.nome.split(' ')[0]}.</p>
          </div>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <p className="text-sm text-slate-600">
            A Memed exige <strong>CPF</strong>, <strong>Conselho/Número/UF</strong> e{' '}
            <strong>Data de Nascimento</strong> reais para validar você como prescritor no CFM.
            Sem esses dados, a prescrição digital (Memed) fica com o cadastro <em>Inativo</em> e
            abre em branco para os seus pacientes. Preencha uma única vez para desbloquear.
          </p>

          <InputField label="CPF" required placeholder="000.000.000-00" value={form.cpf} onChange={e => setCampo('cpf', e.target.value)} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField label="Conselho" required value={form.conselho_tipo} onChange={e => setCampo('conselho_tipo', e.target.value)}>
              <option>CRM</option><option>CRO</option><option>CRP</option><option>CREFITO</option><option>CRBM</option><option>CRF</option><option>COREN</option>
            </SelectField>
            <InputField label="Número do Registro" required placeholder="Ex: 123456" value={form.conselho_numero} onChange={e => setCampo('conselho_numero', e.target.value)} />
            <SelectField label="UF" required value={form.conselho_uf} onChange={e => setCampo('conselho_uf', e.target.value)}>
              {UFS.map(uf => <option key={uf}>{uf}</option>)}
            </SelectField>
          </div>

          <InputField label="Data de Nascimento" type="date" required value={form.data_nascimento} onChange={e => setCampo('data_nascimento', e.target.value)} />

          {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</div>}
        </div>
        <div className="px-5 sm:px-6 py-4 border-t border-gray-100 bg-white">
          <button
            onClick={salvar}
            disabled={salvando}
            className="w-full bg-slate-900 text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-60"
          >
            <Save size={18} /> {salvando ? 'Salvando...' : 'Salvar e continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}
