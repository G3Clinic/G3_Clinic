import { useState, useEffect } from 'react';
import { Search, Filter, Edit, Clock, X, Calendar, User, CheckCircle2, Activity, AlertCircle, Download, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

interface Donor {
  id: string;
  code: string;
  name: string;
  socialName?: string;
  bloodType: string;
  status: 'apto' | 'inapto' | 'bloqueado';
  lastDonation: string;
  gender: string;
  age: number;
}

export function DonorsListPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  
  const [selectedHistoryDonor, setSelectedHistoryDonor] = useState<Donor | null>(null);

  const [donors, setDonors] = useState<Donor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_URL}/doadores`)
      .then(res => res.json())
      .then(data => {
        setDonors(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar doadores:', err);
        setIsLoading(false);
      });
  }, []);

  const filteredDonors = donors.filter(donor => {
    const matchesSearch = donor.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (donor.code && donor.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (donor.bloodType && donor.bloodType.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'todos' || donor.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'apto': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircle2 size={12} /> Apto</span>;
      case 'inapto': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100"><Activity size={12} /> Inapto Temp.</span>;
      case 'bloqueado': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-100"><AlertCircle size={12} /> Bloqueado</span>;
      default: return null;
    }
  };

  const handleExportExcel = () => {
    alert("Exportando lista de doadores para Excel...");
  };

  // Nova função para enviar o doador para a tela de triagem
  const handleNewDonation = (donor: Donor) => {
    navigate('/dashboard/triagem', { 
      state: { 
        donor: {
          id: donor.id,
          name: donor.name,
          code: donor.code,
          bloodType: donor.bloodType
        } 
      } 
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão de Doadores</h1>
          <p className="text-slate-500 text-sm">Base de doadores cadastrados e histórico clínico.</p>
        </div>
        <button 
          onClick={handleExportExcel}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
        >
          <Download size={18} />
          Exportar Excel
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 bg-gray-50/50">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
               type="text" 
               placeholder="Buscar por Nome, CPF ou Código..." 
               className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 outline-none transition-all"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           <div className="flex items-center gap-2">
             <Filter size={18} className="text-slate-400" />
             <select 
               className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-slate-600 focus:border-brand-red outline-none cursor-pointer"
               value={filterStatus}
               onChange={(e) => setFilterStatus(e.target.value)}
             >
               <option value="todos">Todos os Status</option>
               <option value="apto">Aptos</option>
               <option value="inapto">Inaptos Temporários</option>
               <option value="bloqueado">Bloqueados Definitivos</option>
             </select>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-4">Doador</th>
                <th className="p-4">Código / Tipo</th>
                <th className="p-4">Perfil</th>
                <th className="p-4">Status</th>
                <th className="p-4">Última Doação</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredDonors.map((donor) => (
                <tr key={donor.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <p className="font-bold text-slate-700 text-base">{donor.name}</p>
                      {donor.socialName && (
                        <p className="text-xs text-purple-600 font-medium flex items-center gap-1 mt-0.5">
                          <User size={10} /> Social: {donor.socialName}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-mono font-bold text-slate-600 text-xs">{donor.code}</p>
                    <span className="font-bold text-brand-red">{donor.bloodType}</span>
                  </td>
                  <td className="p-4 text-slate-600">
                    <p>{donor.gender}</p>
                    <p className="text-xs text-slate-400">{donor.age} anos</p>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(donor.status)}
                  </td>
                  <td className="p-4 text-slate-600">
                    {new Date(donor.lastDonation).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setSelectedHistoryDonor(donor)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver Histórico Completo"
                      >
                        <Clock size={18} />
                      </button>

                      <button 
                        onClick={() => navigate(`/dashboard/doadores/editar/${donor.id}`)}
                        className="p-2 text-slate-400 hover:text-brand-red hover:bg-red-50 rounded-lg transition-colors"
                        title="Editar Cadastro"
                      >
                        <Edit size={18} />
                      </button>
                      
                      {/* Novo Botão de Triagem/Doação */}
                      <button 
                        onClick={() => handleNewDonation(donor)}
                        disabled={donor.status === 'bloqueado'}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Iniciar Triagem"
                      >
                        <Heart size={14} />
                        Triagem
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Activity className="animate-spin text-brand-red w-8 h-8" />
              <p className="font-medium">Carregando dados...</p>
            </div>
          ) : filteredDonors.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p>Nenhum doador encontrado.</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Histórico Modal (Mantido Igual) */}
      {selectedHistoryDonor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-up">
            
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                  <Clock className="text-brand-red" size={20} />
                  Histórico do Doador
                </h3>
                <p className="text-sm text-slate-500 mt-1">{selectedHistoryDonor.name} • <span className="font-bold text-slate-700">{selectedHistoryDonor.bloodType}</span></p>
              </div>
              <button 
                onClick={() => setSelectedHistoryDonor(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-gray-200 rounded-full p-2 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-center">
                  <p className="text-xs text-blue-600 font-bold uppercase">Total Doações</p>
                  <p className="text-2xl font-bold text-blue-800">12</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <p className="text-xs text-emerald-600 font-bold uppercase">Última Doação</p>
                  <p className="text-lg font-bold text-emerald-800">15/10/2023</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-center">
                  <p className="text-xs text-purple-600 font-bold uppercase">Próxima Aptidão</p>
                  <p className="text-lg font-bold text-purple-800">15/12/2023</p>
                </div>
              </div>

              <h4 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2">
                <Calendar size={16} /> Registro de Atividades
              </h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Local</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3 text-right">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-mono text-slate-600">15/10/2023</td>
                      <td className="p-3">Hemocentro Regional</td>
                      <td className="p-3"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">Total</span></td>
                      <td className="p-3 text-right"><span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded border border-emerald-100">Coletada</span></td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-mono text-slate-600">10/05/2023</td>
                      <td className="p-3">Unidade Móvel 01</td>
                      <td className="p-3"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">Total</span></td>
                      <td className="p-3 text-right"><span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded border border-emerald-100">Coletada</span></td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-mono text-slate-600">02/01/2023</td>
                      <td className="p-3">Hemocentro Regional</td>
                      <td className="p-3"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">Total</span></td>
                      <td className="p-3 text-right"><span className="text-amber-600 font-bold text-xs bg-amber-50 px-2 py-1 rounded border border-amber-100">Inapto Triagem</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setSelectedHistoryDonor(null)}
                className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}