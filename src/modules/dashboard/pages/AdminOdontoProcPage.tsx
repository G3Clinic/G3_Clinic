import { useState, useEffect, useCallback } from 'react';
import { Smile, Plus, ChevronDown, ChevronRight, Edit2, Trash2, Save } from 'lucide-react';
import { PageHeader, Card, Btn, Modal, InputField, SelectField } from '../../../components/ui/shared';
import { especialidadesApi, odontoProcApi, type APIEspecialidade, type APIOdontoProc } from '../../../services/api';

export function AdminOdontoProcPage() {
  const [especialidades, setEspecialidades] = useState<APIEspecialidade[]>([]);
  const [intervencoes, setIntervencoes] = useState<APIOdontoProc[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string[]>([]);

  // Modal especialidade
  const [modalEsp, setModalEsp] = useState(false);
  const [editEspId, setEditEspId] = useState<string | null>(null);
  const [espNome, setEspNome] = useState('');
  const [espCor, setEspCor] = useState('#3B82F6');
  const [erroEsp, setErroEsp] = useState('');

  // Modal intervenção
  const [modalIntv, setModalIntv] = useState(false);
  const [editIntvId, setEditIntvId] = useState<string | null>(null);
  const [intvEspId, setIntvEspId] = useState<string>('');
  const [intvNome, setIntvNome] = useState('');
  const [intvValor, setIntvValor] = useState('');
  const [intvVisual, setIntvVisual] = useState('nenhum');
  const [erroIntv, setErroIntv] = useState('');

  const toggle = (id: string) => setOpen(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const carregar = useCallback(() => {
    setLoading(true);
    Promise.all([especialidadesApi.listar(), odontoProcApi.listar()])
      .then(([esp, intv]) => { setEspecialidades(esp); setIntervencoes(intv); })
      .catch(e => console.error('Erro ao carregar odonto:', e))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const intvDaEsp = (espId: string) => intervencoes.filter(i => i.especialidade_id === espId);

  // ── Especialidade ──
  const abrirNovaEsp = () => { setEditEspId(null); setEspNome(''); setEspCor('#3B82F6'); setErroEsp(''); setModalEsp(true); };
  const abrirEditEsp = (esp: APIEspecialidade) => { setEditEspId(esp.id); setEspNome(esp.nome); setEspCor(esp.cor || '#3B82F6'); setErroEsp(''); setModalEsp(true); };
  const salvarEsp = async () => {
    if (!espNome.trim()) { setErroEsp('Nome é obrigatório.'); return; }
    try {
      if (editEspId) await especialidadesApi.atualizar(editEspId, { nome: espNome.trim(), cor: espCor });
      else await especialidadesApi.criar({ nome: espNome.trim(), cor: espCor });
      setModalEsp(false); carregar();
    } catch (e) { setErroEsp(e instanceof Error ? e.message : 'Erro ao salvar.'); }
  };
  const excluirEsp = async (esp: APIEspecialidade) => {
    if (!confirm(`Excluir a especialidade "${esp.nome}" e suas intervenções?`)) return;
    try {
      await Promise.all(intvDaEsp(esp.id).map(i => odontoProcApi.excluir(i.id)));
      await especialidadesApi.excluir(esp.id);
      carregar();
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro ao excluir.'); }
  };

  // ── Intervenção ──
  const abrirNovaIntv = (espId: string) => { setEditIntvId(null); setIntvEspId(espId); setIntvNome(''); setIntvValor(''); setIntvVisual('nenhum'); setErroIntv(''); setModalIntv(true); };
  const abrirEditIntv = (i: APIOdontoProc) => { setEditIntvId(i.id); setIntvEspId(i.especialidade_id || ''); setIntvNome(i.nome_intervencao); setIntvValor(i.valor_base != null ? String(i.valor_base) : ''); setIntvVisual(i.tipo_visual || 'nenhum'); setErroIntv(''); setModalIntv(true); };
  const salvarIntv = async () => {
    if (!intvNome.trim()) { setErroIntv('Nome é obrigatório.'); return; }
    try {
      const payload = {
        nome_intervencao: intvNome.trim(),
        valor_base: intvValor ? Number(intvValor) : undefined,
        especialidade_id: intvEspId || undefined,
        tipo_visual: intvVisual,
      };
      if (editIntvId) await odontoProcApi.atualizar(editIntvId, payload);
      else await odontoProcApi.criar(payload);
      setModalIntv(false); carregar();
    } catch (e) { setErroIntv(e instanceof Error ? e.message : 'Erro ao salvar.'); }
  };
  const excluirIntv = async (i: APIOdontoProc) => {
    if (!confirm(`Excluir "${i.nome_intervencao}"?`)) return;
    try { await odontoProcApi.excluir(i.id); carregar(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro ao excluir.'); }
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={Smile} title="Especialidades Odontológicas" subtitle="Cadastre especialidades e suas intervenções disponíveis no odontograma">
        <Btn icon={Plus} onClick={abrirNovaEsp}>Nova Especialidade</Btn>
      </PageHeader>

      {loading ? (
        <Card><p className="text-center py-8 text-slate-500">Carregando...</p></Card>
      ) : especialidades.length === 0 ? (
        <Card><p className="text-center py-8 text-slate-500">Nenhuma especialidade cadastrada.</p></Card>
      ) : (
        <div className="space-y-3">
          {especialidades.map(esp => (
            <Card key={esp.id} padding={false}>
              <button onClick={() => toggle(esp.id)} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors rounded-2xl text-left">
                <div className="w-4 h-8 rounded-full" style={{ backgroundColor: esp.cor || '#3B82F6' }} />
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800">{esp.nome}</h4>
                  <p className="text-xs text-slate-400">{intvDaEsp(esp.id).length} intervenção(ões)</p>
                </div>
                <div className="flex gap-2 items-center">
                  <button className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-lg" onClick={e => { e.stopPropagation(); abrirEditEsp(esp); }}><Edit2 size={14} /></button>
                  <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" onClick={e => { e.stopPropagation(); excluirEsp(esp); }}><Trash2 size={14} /></button>
                  {open.includes(esp.id) ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </div>
              </button>
              {open.includes(esp.id) && (
                <div className="px-4 pb-4">
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Intervenções</span>
                      <Btn size="sm" variant="secondary" icon={Plus} onClick={() => abrirNovaIntv(esp.id)}>Adicionar</Btn>
                    </div>
                    {intvDaEsp(esp.id).length === 0 ? (
                      <p className="text-xs text-slate-400 italic px-1">Nenhuma intervenção nesta especialidade.</p>
                    ) : intvDaEsp(esp.id).map(intv => (
                      <div key={intv.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                        <span className="text-sm text-slate-700">{intv.nome_intervencao} <span className="text-xs text-slate-400 font-mono">R$ {(intv.valor_base ?? 0).toFixed(2)}</span></span>
                        <div className="flex gap-1">
                          <button className="p-1 text-slate-400 hover:text-brand-primary rounded-lg" onClick={() => abrirEditIntv(intv)}><Edit2 size={12} /></button>
                          <button className="p-1 text-slate-400 hover:text-red-500 rounded-lg" onClick={() => excluirIntv(intv)}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalEsp} onClose={() => setModalEsp(false)} title={editEspId ? 'Editar Especialidade' : 'Nova Especialidade'}>
        <div className="space-y-4">
          <InputField label="Nome da Especialidade" required placeholder="Ex: Implantodontia" value={espNome} onChange={e => setEspNome(e.target.value)} />
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cor de Identificação</label>
            <input type="color" value={espCor} onChange={e => setEspCor(e.target.value)} className="w-12 h-10 border border-gray-200 rounded-xl cursor-pointer" />
          </div>
          {erroEsp && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erroEsp}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <Btn variant="secondary" onClick={() => setModalEsp(false)}>Cancelar</Btn>
          <Btn icon={Save} onClick={salvarEsp}>Salvar Especialidade</Btn>
        </div>
      </Modal>

      <Modal open={modalIntv} onClose={() => setModalIntv(false)} title={editIntvId ? 'Editar Intervenção' : 'Nova Intervenção/Procedimento'}>
        <div className="space-y-4">
          <InputField label="Nome da Intervenção/Procedimento" required placeholder="Ex: Restauração (Resina)" value={intvNome} onChange={e => setIntvNome(e.target.value)} />
          <InputField label="Valor Padrão (R$)" type="number" step="0.01" required placeholder="0.00" value={intvValor} onChange={e => setIntvValor(e.target.value)} />
          <SelectField label="Tipo Visual no Odontograma" required value={intvVisual} onChange={e => setIntvVisual(e.target.value)}>
            <option value="nenhum">Apenas Lançamento (Ex: Consulta)</option>
            <option value="xis">Marcar com "X"</option>
            <option value="bolinha">Marcar com Bolinha</option>
            <option value="preenchimento">Preenchimento de Face (Ex: Restauração)</option>
          </SelectField>
          {erroIntv && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erroIntv}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <Btn variant="secondary" onClick={() => setModalIntv(false)}>Cancelar</Btn>
          <Btn icon={Save} onClick={salvarIntv}>Salvar Intervenção</Btn>
        </div>
      </Modal>
    </div>
  );
}
