import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, User, FileText, Activity, Stethoscope, FileSymlink, AlertCircle, Plus } from 'lucide-react';
import { PageHeader, Card, Btn, Badge, InputField, SelectField, Modal } from '../../../components/ui/shared';

type TabId = 'triagem' | 'evolucao' | 'exames' | 'receituario' | 'atestado';

export function ProntuarioPage() {
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('triagem');
  const [modeloModalOpen, setModeloModalOpen] = useState(false);
  
  // IMC logic
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [imc, setImc] = useState<number | null>(null);

  useEffect(() => {
    const p = parseFloat(peso);
    const a = parseFloat(altura);
    if (p > 0 && a > 0) {
      setImc(p / (a * a));
    } else {
      setImc(null);
    }
  }, [peso, altura]);

  const getImcClass = (val: number | null) => {
    if (!val) return '';
    if (val < 18.5) return 'bg-blue-100 text-blue-900';
    if (val >= 18.5 && val <= 24.9) return 'bg-emerald-100 text-emerald-900 font-bold';
    if (val >= 25 && val <= 29.9) return 'bg-yellow-100 text-yellow-900';
    if (val >= 30 && val <= 34.9) return 'bg-orange-100 text-orange-900';
    if (val >= 35 && val <= 39.9) return 'bg-red-100 text-red-900';
    return 'bg-red-200 text-red-900 font-bold';
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={ClipboardList} title="Prontuário Eletrônico" subtitle="Registro clínico detalhado e histórico do paciente">
        <Btn size="sm" icon={User} onClick={() => setPacienteId(pacienteId ? null : 'pac1')}>
          {pacienteId ? 'Trocar Paciente' : 'Selecionar Paciente'}
        </Btn>
      </PageHeader>

      {/* Busca / Paciente Ativo */}
      <Card padding={false} className="overflow-hidden">
        {pacienteId ? (
          <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between bg-brand-light/30 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center text-white font-bold text-xl">
                JD
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">João da Silva Doe</h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>CPF: 123.456.789-00</span>
                  <span>•</span>
                  <span>35 anos</span>
                  <span>•</span>
                  <span className="text-red-500 font-bold flex items-center gap-1"><AlertCircle size={12}/> Alérgico a Penicilina</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge color="green">Em Atendimento</Badge>
              <Badge color="blue">Plano: Unimed</Badge>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="relative flex-1 max-w-2xl">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  placeholder="Buscar paciente pelo nome, CPF ou Telefone..." 
                  className="w-full border border-gray-200 rounded-xl bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-slate-800 placeholder:text-slate-400 transition-all shadow-sm"
                />
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Selecione um Paciente</h3>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'pac1', name: 'João da Silva Doe', cpf: '123.456.789-00', age: 35 },
                  { id: 'pac2', name: 'Maria Souza', cpf: '987.654.321-11', age: 28 },
                  { id: 'pac3', name: 'Carlos Santos', cpf: '111.222.333-44', age: 42 },
                  { id: 'pac4', name: 'Ana Oliveira', cpf: '555.444.333-22', age: 51 },
                  { id: 'pac5', name: 'Pedro Alves', cpf: '000.111.222-33', age: 19 },
                ].map(p => (
                  <div 
                    key={p.id}
                    onClick={() => setPacienteId(p.id)}
                    className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-brand-primary hover:bg-brand-light/10 cursor-pointer transition-all bg-white group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-brand-light text-brand-primary rounded-full flex items-center justify-center font-bold text-sm">
                        {p.name.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 group-hover:text-brand-primary transition-colors">{p.name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>CPF: {p.cpf}</span>
                          <span>•</span>
                          <span>{p.age} anos</span>
                        </div>
                      </div>
                    </div>
                    <Btn size="sm" variant="ghost" className="text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors">
                      Abrir Prontuário
                    </Btn>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {pacienteId && (
        <Card padding={false}>
          {/* Navegação de Abas */}
          <div className="flex overflow-x-auto border-b border-gray-100 no-scrollbar">
            {[
              { id: 'triagem', label: 'Triagem / Sinais Vitais', icon: Activity },
              { id: 'evolucao', label: 'Evolução Clínica', icon: ClipboardList },
              { id: 'exames', label: 'Exames Solicitados', icon: Stethoscope },
              { id: 'receituario', label: 'Receituário Médico', icon: FileText },
              { id: 'atestado', label: 'Atestado', icon: FileSymlink }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabId)}
                  className={`
                    flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap
                    ${isActive ? 'border-brand-primary text-brand-primary bg-brand-light/20' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-gray-50'}
                  `}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="p-6">
            
            {/* --- ABA TRIAGEM --- */}
            {activeTab === 'triagem' && (
              <div className="space-y-6 animate-fade-in-up">
                
                <h4 className="font-bold text-slate-700 text-sm border-b border-gray-100 pb-2">Sinais Vitais</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <InputField label="PA Sistólica" type="number" placeholder="ex: 120" />
                  <InputField label="PA Diastólica" type="number" placeholder="ex: 80" />
                  <InputField label="FC (bpm)" type="number" placeholder="ex: 75" />
                  <InputField label="FR (rpm)" type="number" placeholder="ex: 16" />
                  <InputField label="Temperatura (°C)" type="number" step="0.1" placeholder="ex: 36.5" />
                  <InputField label="Saturação SpO2 (%)" type="number" placeholder="ex: 98" />
                  <InputField label="Glicemia (mg/dL)" type="number" placeholder="ex: 90" />
                </div>

                <h4 className="font-bold text-slate-700 text-sm border-b border-gray-100 pb-2 mt-6">Antropometria e IMC</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <InputField label="Peso (kg)" type="number" step="0.1" placeholder="ex: 70" value={peso} onChange={e => setPeso(e.target.value)} />
                    <InputField label="Altura (m)" type="number" step="0.01" placeholder="ex: 1.75" value={altura} onChange={e => setAltura(e.target.value)} />
                    <InputField label="IMC Calculado" value={imc ? imc.toFixed(1) : '—'} disabled />
                  </div>
                  <div>
                    <table className="w-full text-xs border border-gray-200 rounded-xl overflow-hidden">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr><th className="p-2 text-left text-slate-500">Classificação</th><th className="p-2 text-left text-slate-500">IMC (kg/m²)</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr className={imc && imc < 18.5 ? getImcClass(imc) : ''}><td className="p-2">Baixo peso</td><td className="p-2">&lt; 18,5</td></tr>
                        <tr className={imc && imc >= 18.5 && imc <= 24.9 ? getImcClass(imc) : ''}><td className="p-2">Normal</td><td className="p-2">18,5 – 24,9</td></tr>
                        <tr className={imc && imc >= 25 && imc <= 29.9 ? getImcClass(imc) : ''}><td className="p-2 font-medium">Pré-obeso</td><td className="p-2">25,0 – 29,9</td></tr>
                        <tr className={imc && imc >= 30 && imc <= 34.9 ? getImcClass(imc) : ''}><td className="p-2 font-medium">Obeso I</td><td className="p-2">30,0 – 34,9</td></tr>
                        <tr className={imc && imc >= 35 && imc <= 39.9 ? getImcClass(imc) : ''}><td className="p-2 font-medium">Obeso II</td><td className="p-2">35,0 – 39,9</td></tr>
                        <tr className={imc && imc >= 40 ? getImcClass(imc) : ''}><td className="p-2 font-bold">Obeso III</td><td className="p-2">≥ 40</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <h4 className="font-bold text-slate-700 text-sm border-b border-gray-100 pb-2 mt-6">Observações de Triagem</h4>
                <div>
                  <textarea rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all" placeholder="Queixas principais, alergias, motivo da consulta..." />
                </div>
                <div className="flex justify-end"><Btn>Salvar Triagem</Btn></div>
              </div>
            )}

            {/* --- ABA EVOLUÇÃO --- */}
            {activeTab === 'evolucao' && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h4 className="font-bold text-slate-700 text-sm mb-3">Histórico Recente</h4>
                  <div className="space-y-3">
                    <div className="border-l-2 border-brand-primary pl-3">
                      <p className="text-xs text-slate-400 font-bold">Hoje, 10:30 • Dr. João</p>
                      <p className="text-sm text-slate-700 mt-1">Paciente relata dor aguda na região lombar. Prescrito analgésico e solicitado Raio-X.</p>
                    </div>
                    <div className="border-l-2 border-gray-300 pl-3">
                      <p className="text-xs text-slate-400 font-bold">15/05/2026, 14:00 • Dra. Maria</p>
                      <p className="text-sm text-slate-700 mt-1">Retorno pós-cirúrgico. Cicatrização normal.</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <SelectField label="Inserir modelo:">
                    <option>— Selecione —</option>
                    <option>Modelo SOAP Padrão</option>
                  </SelectField>
                  <div className="pt-6">
                    <Btn variant="secondary" onClick={() => setModeloModalOpen(true)}>Salvar como Modelo</Btn>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nova Evolução (SOAP)</label>
                  <textarea rows={6} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all" placeholder="Subjetivo, Objetivo, Avaliação e Plano..." />
                </div>
                <div className="flex justify-end"><Btn>Assinar e Salvar</Btn></div>
              </div>
            )}

            {/* --- ABA EXAMES --- */}
            {activeTab === 'exames' && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="flex gap-4">
                  <div className="flex-1">
                     <SelectField label="Tipo de Exame">
                       <option>Selecione...</option>
                       <option>Hemograma Completo</option>
                       <option>Raio-X Tórax</option>
                       <option>Ressonância Magnética</option>
                     </SelectField>
                  </div>
                  <div className="flex-1">
                     <InputField label="Justificativa Clínica" placeholder="CID ou motivo..." />
                  </div>
                  <div className="flex items-end">
                    <Btn icon={Plus}>Adicionar</Btn>
                  </div>
                </div>
                
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr><th className="p-3 text-slate-500 font-bold">Exames Solicitados</th><th className="p-3"></th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      <tr><td colSpan={2} className="p-8 text-center text-slate-400">Nenhum exame adicionado a esta guia.</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end"><Btn variant="secondary">🖨️ Imprimir Pedido</Btn></div>
              </div>
            )}

            {/* --- ABA RECEITUÁRIO --- */}
            {activeTab === 'receituario' && (
              <div className="space-y-6 animate-fade-in-up">
                 <div className="flex gap-4">
                  <div className="flex-1">
                     <InputField label="Medicamento" placeholder="Nome do remédio e concentração" />
                  </div>
                  <div className="flex-1">
                     <InputField label="Posologia" placeholder="Ex: 1 comp de 8/8h por 5 dias" />
                  </div>
                  <div className="flex items-end">
                    <Btn icon={Plus}>Adicionar</Btn>
                  </div>
                </div>

                <div className="bg-[#fefce8] border border-[#fef08a] rounded-xl p-5 shadow-sm min-h-[200px] font-serif text-slate-800">
                  <h3 className="text-center font-bold text-lg border-b border-[#fde047] pb-2 mb-4">RECEITUÁRIO MÉDICO</h3>
                  <p className="text-sm italic text-slate-500 text-center mb-8">Nenhum medicamento prescrito.</p>
                </div>
                <div className="flex justify-end"><Btn variant="secondary">🖨️ Imprimir Receita</Btn></div>
              </div>
            )}

            {/* --- ABA ATESTADO --- */}
            {activeTab === 'atestado' && (
              <div className="space-y-6 animate-fade-in-up">
                 <div className="grid grid-cols-3 gap-4">
                  <InputField label="Dias de Repouso" type="number" placeholder="Qtd de dias" />
                  <InputField label="CID (Opcional)" placeholder="Código CID-10" />
                  <SelectField label="Modelo">
                    <option>Atestado de Comparecimento</option>
                    <option>Atestado de Repouso/Doença</option>
                    <option>Atestado para Prática Esportiva</option>
                  </SelectField>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Texto do Atestado</label>
                  <textarea rows={5} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all" 
                    defaultValue="Atesto para os devidos fins que o paciente João da Silva Doe necessita de [X] dias de repouso a partir desta data por motivos de saúde (CID: [Y])." />
                </div>
                <div className="flex justify-end"><Btn variant="secondary">🖨️ Gerar PDF / Imprimir</Btn></div>
              </div>
            )}

          </div>
        </Card>
      )}

      {/* Modal Salvar Modelo */}
      <Modal open={modeloModalOpen} onClose={() => setModeloModalOpen(false)} title="Salvar Modelo de Evolução">
        <div className="space-y-4">
          <InputField label="Nome do Modelo" required placeholder="Ex: Avaliação Inicial Orto" />
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs text-yellow-800">
            O texto atual do editor será salvo como um modelo reutilizável para agilizar futuros atendimentos.
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Btn variant="ghost" onClick={() => setModeloModalOpen(false)}>Cancelar</Btn>
            <Btn onClick={() => setModeloModalOpen(false)}>Salvar Modelo</Btn>
          </div>
        </div>
      </Modal>

    </div>
  );
}
