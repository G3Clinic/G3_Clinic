import React, { useState } from 'react';
import { Calendar, Plus, Filter, Users, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { PageHeader, Card, Btn, Modal, InputField, SelectField, Badge } from '../../../components/ui/shared';

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const HORARIOS = Array.from({ length: 14 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`);
const SALAS = [
  { id: 's1', nome: 'Sala 1', cor: 'bg-emerald-100 border-emerald-300' },
  { id: 's2', nome: 'Sala 2', cor: 'bg-blue-100 border-blue-300' },
  { id: 's3', nome: 'Sala 3', cor: 'bg-amber-100 border-amber-300' },
];

const agendamentos = [
  { dia: 'Qua', hora: '09:00', sala: 's1', prof: 'Dr. João', proc: 'Avaliação', duracao: 1 },
  { dia: 'Qua', hora: '10:00', sala: 's2', prof: 'Dra. Maria', proc: 'Limpeza', duracao: 1.5 },
];

export function AgendaPage() {
  const [filtroSala, setFiltroSala] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  const handleEdit = (apt: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAppointment(apt);
    setEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Calendar} title="Agenda e Ocupação" subtitle="Mapa de ocupação semanal e controle de salas">
        <Btn icon={Plus} onClick={() => setModalOpen(true)}>Novo Agendamento</Btn>
      </PageHeader>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Agendamento">
        <div className="space-y-4">
          <div>
            <InputField label="Paciente *" placeholder="Nome ou CPF..." required />
            <p className="text-xs text-brand-primary mt-1 font-medium hover:underline cursor-pointer">Paciente não encontrado? Cadastrar novo paciente</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Status">
              <option>Agendado</option>
              <option>Confirmado</option>
              <option>Em atendimento</option>
              <option>Finalizado</option>
            </SelectField>
            <SelectField label="Profissional *" required>
              <option value="">Selecione...</option>
              <option>Dr. João Silva</option>
              <option>Dra. Maria Clara</option>
            </SelectField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Sala *" required>
              <option value="">Selecione...</option>
              <option value="s1">Sala 1</option>
              <option value="s2">Sala 2</option>
              <option value="s3">Sala 3</option>
            </SelectField>
            <SelectField label="Procedimento *" required>
              <option value="">Selecione...</option>
              <option>Avaliação Inicial</option>
              <option>Limpeza / Profilaxia</option>
            </SelectField>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <InputField label="Data *" type="date" required defaultValue="2026-07-06" />
            <SelectField label="Início *" required>
              <option value="">--:--</option>
              {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
            </SelectField>
            <SelectField label="Fim *" required>
              <option value="">--:--</option>
              {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
            </SelectField>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Observações</label>
            <textarea rows={2} placeholder="Anotações adicionais..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Forma de Pagamento">
              <option value="">— Selecione —</option>
              <option>PIX</option>
              <option>Cartão de Crédito</option>
              <option>Dinheiro</option>
            </SelectField>
            <InputField label="Valor Cobrado (R$)" type="number" step="0.01" placeholder="0.00" />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Btn>
            <Btn onClick={() => setModalOpen(false)}>Salvar Agendamento</Btn>
          </div>
        </div>
      </Modal>

      {/* Editar Agendamento */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar Agendamento">
        <div className="space-y-4">
          <div>
            <InputField label="Paciente *" placeholder="Nome ou CPF..." required defaultValue="Paciente Exemplo" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Status">
              <option>Agendado</option>
              <option>Confirmado</option>
              <option>Em atendimento</option>
              <option>Finalizado</option>
            </SelectField>
            <SelectField label="Profissional *" required defaultValue={selectedAppointment?.prof}>
              <option value="">Selecione...</option>
              <option>Dr. João Silva</option>
              <option>Dra. Maria Clara</option>
              <option>{selectedAppointment?.prof}</option>
            </SelectField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Sala *" required defaultValue={selectedAppointment?.sala}>
              <option value="">Selecione...</option>
              <option value="s1">Sala 1</option>
              <option value="s2">Sala 2</option>
              <option value="s3">Sala 3</option>
            </SelectField>
            <SelectField label="Procedimento *" required defaultValue={selectedAppointment?.proc}>
              <option value="">Selecione...</option>
              <option>Avaliação Inicial</option>
              <option>Limpeza / Profilaxia</option>
              <option>{selectedAppointment?.proc}</option>
            </SelectField>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <InputField label="Data *" type="date" required defaultValue="2026-07-06" />
            <SelectField label="Início *" required defaultValue={selectedAppointment?.hora}>
              <option value="">--:--</option>
              {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
            </SelectField>
            <SelectField label="Fim *" required>
              <option value="">--:--</option>
              {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
            </SelectField>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Observações</label>
            <textarea rows={2} placeholder="Anotações adicionais..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary resize-none" />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Btn variant="ghost" onClick={() => setEditModalOpen(false)}>Cancelar</Btn>
            <Btn onClick={() => setEditModalOpen(false)}>Salvar Alterações</Btn>
          </div>
        </div>
      </Modal>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Grade da Agenda */}
        <div className="col-span-1">
          <Card className="h-full flex flex-col">
            
            {/* Controles da Grade */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-600 flex items-center gap-1.5"><Clock size={16}/> Horário:</span>
                <select className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-gray-50 focus:outline-none focus:border-brand-primary">
                  <option>07:00</option>
                  <option>08:00</option>
                </select>
                <span className="text-sm text-slate-500">até</span>
                <select className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-gray-50 focus:outline-none focus:border-brand-primary">
                  <option>18:00</option>
                  <option>20:00</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-600 flex items-center gap-1.5"><Filter size={16}/> Visualizar:</span>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button onClick={() => setFiltroSala('all')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filtroSala === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Todas</button>
                  <button onClick={() => setFiltroSala('s1')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filtroSala === 's1' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Sala 1</button>
                  <button onClick={() => setFiltroSala('s2')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filtroSala === 's2' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Sala 2</button>
                  <button onClick={() => setFiltroSala('s3')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filtroSala === 's3' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Sala 3</button>
                </div>
              </div>
            </div>

            {/* Grade Semanal */}
            <div className="flex-1 overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Cabeçalho de Dias */}
                <div className="grid grid-cols-6 border-b-2 border-gray-300 pb-2 mb-2">
                  <div className="text-xs font-bold text-slate-400 text-center">Hora</div>
                  {DIAS_SEMANA.map(dia => (
                    <div key={dia} className="text-sm font-bold text-slate-700 text-center uppercase tracking-wider">{dia}</div>
                  ))}
                </div>

                {/* Linhas de Horário */}
                <div className="relative">
                  {HORARIOS.map((hora, hIdx) => (
                    <div key={hora} className="grid grid-cols-6 h-12 border-b border-gray-200 group">
                      <div className="text-xs text-slate-500 text-center pt-2 font-medium bg-white z-10">{hora}</div>
                      
                      {/* Células da grade */}
                      {DIAS_SEMANA.map((dia, dIdx) => {
                        const isAgendado = agendamentos.find(a => a.dia === dia && a.hora === hora && (filtroSala === 'all' || a.sala === filtroSala));
                        
                        return (
                          <div key={dia} className="relative border-l border-gray-200 transition-colors group-hover:bg-brand-light/20 cursor-pointer" onClick={() => setModalOpen(true)}>
                            {isAgendado && (
                              <div 
                                onClick={(e) => handleEdit(isAgendado, e)}
                                className={`
                                  absolute top-1 left-1 right-1 bottom-1 rounded-lg border-2 p-1.5 flex flex-col justify-center overflow-hidden z-20 hover:shadow-md transition-shadow
                                  ${SALAS.find(s => s.id === isAgendado.sala)?.cor}
                                `} style={{ height: `calc(${isAgendado.duracao * 100}% - 8px)` }}>
                                <p className="text-[10px] font-bold text-slate-800 leading-tight truncate">{isAgendado.prof}</p>
                                <p className="text-[9px] text-slate-600 truncate">{isAgendado.proc}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legenda */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium"><div className="w-3 h-3 rounded-full bg-gray-100 border border-gray-300"/> Sala livre</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium"><div className="w-3 h-3 rounded-full bg-red-100 border border-red-300"/> Bloqueada</span>
              {SALAS.map(s => (
                 <span key={s.id} className="flex items-center gap-1.5 text-xs text-slate-500 font-medium"><div className={`w-3 h-3 rounded-full ${s.cor}`}/> {s.nome} — ocupada</span>
              ))}
            </div>

          </Card>
        </div>
      </div>
    </div>
  );
}
