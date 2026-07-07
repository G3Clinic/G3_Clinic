import React from 'react';
import { FileSearch, Search, AlertCircle, ArrowUpRight, ArrowDownRight, RefreshCcw, Download } from 'lucide-react';
import { PageHeader, Card, Btn, StatsCard, InputField, SelectField } from '../../../components/ui/shared';

export function AuditoriaPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader icon={FileSearch} title="Auditoria Financeira" subtitle="Rastreamento de estornos, cancelamentos e alterações em transações" />
        <div className="flex gap-2">
          <Btn icon={Download} variant="secondary">Exportar Log</Btn>
        </div>
      </div>

      <Card padding={false} className="bg-white border-gray-200 shadow-sm">
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <InputField label="De" type="date" />
          <InputField label="Até" type="date" />
          <SelectField label="Tipo de Operação">
            <option>Todos os tipos</option>
            <option>Estorno / Cancelamento</option>
            <option>Alteração de Valor</option>
            <option>Exclusão de Atendimento</option>
          </SelectField>
          <SelectField label="Usuário Responsável">
            <option>Todos os usuários</option>
            <option>Admin Sistema</option>
            <option>Dr. João</option>
          </SelectField>
          <Btn icon={Search} className="w-full justify-center">Auditar</Btn>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard icon={AlertCircle} label="Total de Alertas" value="0" color="red" />
        <StatsCard icon={ArrowDownRight} label="Estornos Realizados" value="R$ 0,00" color="yellow" />
        <StatsCard icon={RefreshCcw} label="Atendimentos Excluídos" value="0" color="gray" />
      </div>

      <Card title="Log de Eventos">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Data/Hora', 'Usuário', 'Operação', 'Módulo', 'Detalhes', 'Impacto Financeiro', 'IP'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400">
                  <FileSearch size={40} className="mx-auto mb-3 text-slate-200" />
                  <p className="text-sm">Nenhum registro de auditoria encontrado</p>
                  <p className="text-xs mt-1">Selecione um período para buscar os registros de alterações críticas.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
