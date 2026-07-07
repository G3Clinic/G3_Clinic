import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl text-center max-w-lg border border-gray-200">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={48} className="text-brand-red" />
        </div>
        
        <h1 className="text-4xl font-bold text-slate-800 mb-2">404</h1>
        <h2 className="text-xl font-bold text-slate-700 mb-4">Página não encontrada</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          O caminho que você tentou acessar não existe ou você não tem permissão para visualizá-lo. Verifique o endereço e tente novamente.
        </p>

        <button 
          onClick={() => navigate('/dashboard')}
          className="px-8 py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2 w-full"
        >
          <ArrowLeft size={20} />
          Voltar para o Início
        </button>
      </div>
    </div>
  );
}