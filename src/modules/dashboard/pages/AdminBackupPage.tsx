import React from 'react';
import { Database, DownloadCloud, UploadCloud, AlertTriangle } from 'lucide-react';
import { PageHeader, Card, Btn, Badge } from '../../../components/ui/shared';

export function AdminBackupPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={Database} title="Backup e Importação" subtitle="Gerencie as cópias de segurança e dados do sistema" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Exportar Backup */}
        <Card title="Exportar Backup">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Gere um arquivo contendo todas as informações do banco de dados (Pacientes, Atendimentos, Prontuários, Estoque e Financeiro).
            </p>
            
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start gap-3">
              <DownloadCloud className="text-emerald-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-sm font-bold text-emerald-800">Último backup realizado</h4>
                <p className="text-xs text-emerald-600">Hoje às 08:30 (Automático)</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <Btn icon={DownloadCloud}>Gerar Novo Backup</Btn>
            </div>
          </div>
        </Card>

        {/* Importar Dados */}
        <Card title="Importar Dados">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Restaure um arquivo de backup ou importe dados de outros sistemas. Arquivos suportados: .sql, .csv, .json.
            </p>
            
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-sm font-bold text-red-800">Atenção</h4>
                <p className="text-xs text-red-600">A importação de um arquivo de backup irá sobrescrever os dados atuais do sistema.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <Btn variant="secondary" icon={UploadCloud}>Selecionar Arquivo</Btn>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
