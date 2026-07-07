import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, ShieldAlert, FileText, User, ArrowDownUp, Info } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  category: 'security' | 'operation' | 'modification' | 'critical';
}

export function AdminAuditPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_URL}/auditoria/logs`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setLogs(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar logs de auditoria:', err);
        setIsLoading(false);
      });
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = dateFilter ? log.timestamp.startsWith(dateFilter) : true;

    return matchesSearch && matchesDate;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'critical': return 'bg-red-50 text-red-700 border-red-100';
      case 'security': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'modification': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Logs de Auditoria</h1>
          <p className="text-slate-500 text-sm">Registro imutável de todas as operações do sistema.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
               type="text" 
               placeholder="Buscar por usuário, ação ou detalhe..." 
               className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 outline-none transition-all"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           
           <div className="relative w-full md:w-64">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
               type="date" 
               className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 outline-none transition-all text-slate-600"
               value={dateFilter}
               onChange={(e) => setDateFilter(e.target.value)}
             />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-4">Data / Hora</th>
                <th className="p-4">Usuário Responsável</th>
                <th className="p-4">Ação Realizada</th>
                <th className="p-4">Detalhe Técnico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-400">
                    Carregando registros de auditoria...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-400">
                    Nenhum registro encontrado nos logs.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-600 whitespace-nowrap font-mono text-xs">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs">
                          {log.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-700 text-xs">{log.userName}</p>
                          <p className="text-[10px] text-slate-400 uppercase">{log.userRole}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${getCategoryColor(log.category)}`}>
                        {log.category === 'critical' && <ShieldAlert size={12} />}
                        {log.category === 'operation' && <FileText size={12} />}
                        {log.category === 'security' && <Info size={12} />}
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 max-w-md truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}