import { useState, useEffect } from 'react';
import { Plug, CreditCard, Stethoscope, CalendarDays, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, InputField } from '../../../components/ui/shared';
import { configApi } from '../../../services/api';

// Integrações externas que dependem de credenciais que a clínica ainda não tem (CICRED,
// autenticação de vidas CRM no Memed, Google Agenda). Combinado no início do projeto:
// deixar o mecanismo pronto e mockado — sem credenciais reais — pra plugar depois assim
// que a clínica tiver o cadastro/API key de cada parceiro. O estado (conectado ou não,
// campos preenchidos) é salvo em clinica_dados (mesmo key/value genérico usado noutros
// pontos do sistema), então já fica persistido por empresa — só a chamada de rede real
// pro parceiro é que é simulada (setTimeout no lugar do fetch de verdade).
type StatusIntegracao = { conectado: boolean; conectado_em?: string; [campo: string]: unknown };

function CardIntegracao({
  icon: Icon, titulo, descricao, chave, campos, corIcone,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>; titulo: string; descricao: string; chave: string; corIcone: string;
  campos: { id: string; label: string; placeholder?: string }[];
}) {
  const [status, setStatus] = useState<StatusIntegracao>({ conectado: false });
  const [valores, setValores] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(false);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    setCarregando(true);
    configApi.obter(chave).then(v => {
      const s = (v as StatusIntegracao) || { conectado: false };
      setStatus(s);
      const vals: Record<string, string> = {};
      campos.forEach(c => { vals[c.id] = (s[c.id] as string) || ''; });
      setValores(vals);
    }).finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  const conectar = async () => {
    setProcessando(true);
    // Simula a chamada de autenticação com o parceiro externo — sem endpoint real, é só
    // uma espera artificial pra dar a sensação de "conectando..." até termos credenciais
    // de produção de cada integração.
    await new Promise(r => setTimeout(r, 900));
    const novo: StatusIntegracao = { conectado: true, conectado_em: new Date().toISOString(), ...valores };
    await configApi.salvar(chave, novo);
    setStatus(novo);
    setProcessando(false);
  };
  const desconectar = async () => {
    if (!confirm(`Desconectar ${titulo}?`)) return;
    setProcessando(true);
    const novo: StatusIntegracao = { conectado: false };
    await configApi.salvar(chave, novo);
    setStatus(novo);
    setProcessando(false);
  };

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl shadow-sm text-white shrink-0 ${corIcone}`}><Icon size={22} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-800">{titulo}</h3>
            {carregando ? null : status.conectado
              ? <Badge color="green"><CheckCircle2 size={12} className="mr-1 inline" />Conectado (mock)</Badge>
              : <Badge color="gray"><XCircle size={12} className="mr-1 inline" />Não conectado</Badge>}
          </div>
          <p className="text-sm text-slate-500 mt-1">{descricao}</p>

          {!carregando && campos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {campos.map(c => (
                <InputField key={c.id} label={c.label} placeholder={c.placeholder} value={valores[c.id] || ''}
                  disabled={status.conectado}
                  onChange={e => setValores(v => ({ ...v, [c.id]: e.target.value }))} />
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            {status.conectado ? (
              <Btn size="sm" variant="secondary" disabled={processando} onClick={desconectar} className="text-red-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50">
                {processando ? 'Desconectando...' : 'Desconectar'}
              </Btn>
            ) : (
              <Btn size="sm" disabled={processando} onClick={conectar} icon={processando ? Loader2 : Plug}>
                {processando ? 'Conectando...' : 'Conectar (mock)'}
              </Btn>
            )}
            {status.conectado && status.conectado_em && (
              <span className="text-xs text-slate-400">desde {new Date(status.conectado_em).toLocaleString('pt-BR')}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function AdminIntegracoesPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={Plug} title="Integrações" subtitle="Integrações externas que dependem de credenciais próprias da clínica — preparadas e mockadas até serem ativadas com dados reais" />

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        As integrações abaixo ainda não têm credenciais de produção cadastradas. O botão "Conectar" simula a
        autenticação (sem chamar nenhum serviço externo de verdade) só para deixar o fluxo e a tela prontos —
        quando a clínica tiver o cadastro/API key de cada parceiro, é só trocar por uma integração real aqui.
      </div>

      <div className="space-y-4">
        <CardIntegracao
          icon={CreditCard} titulo="CICRED" corIcone="bg-indigo-500"
          descricao="Convênio de crédito para tratamentos odontológicos — permite parcelar o tratamento do paciente direto pela CICRED."
          chave="integracao_cicred"
          campos={[{ id: 'codigo_estabelecimento', label: 'Código do Estabelecimento' }, { id: 'usuario', label: 'Usuário de Integração' }]}
        />
        <CardIntegracao
          icon={Stethoscope} titulo="Memed — Autenticação de Vidas (CRM)" corIcone="bg-emerald-500"
          descricao="Autenticação do CRM junto ao Memed para habilitar a emissão de receitas de medicamentos controlados (autenticação de vidas)."
          chave="integracao_memed_crm"
          campos={[{ id: 'crm', label: 'CRM Responsável', placeholder: 'Ex: 123456' }, { id: 'uf', label: 'UF do CRM', placeholder: 'Ex: SP' }]}
        />
        <CardIntegracao
          icon={CalendarDays} titulo="Google Agenda" corIcone="bg-blue-500"
          descricao="Sincroniza os agendamentos da clínica com o Google Agenda dos profissionais."
          chave="integracao_google_agenda"
          campos={[]}
        />
      </div>
    </div>
  );
}
