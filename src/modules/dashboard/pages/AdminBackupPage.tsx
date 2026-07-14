import { useState, useRef } from 'react';
import { Database, DownloadCloud, UploadCloud, AlertTriangle } from 'lucide-react';
import { PageHeader, Card, Btn } from '../../../components/ui/shared';
import { backupApi } from '../../../services/api';

export function AdminBackupPage() {
  const [gerando, setGerando] = useState(false);
  const [importando, setImportando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const importarBackup = async (file: File) => {
    if (!confirm('Importar este backup? Registros existentes com o mesmo ID serão sobrescritos.')) return;
    setImportando(true);
    try {
      const texto = await file.text();
      const dump = JSON.parse(texto);
      const r = await backupApi.importar(dump);
      alert(`Backup importado: ${r.registros} registro(s) processado(s).`);
    } catch (e) {
      alert(e instanceof Error ? `Falha na importação: ${e.message}` : 'Falha na importação.');
    } finally {
      setImportando(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const gerarBackup = async () => {
    setGerando(true);
    try {
      const dados = await backupApi.exportar();
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-clinica-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao gerar backup.');
    } finally {
      setGerando(false);
    }
  };

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
                <h4 className="text-sm font-bold text-emerald-800">Exportação completa</h4>
                <p className="text-xs text-emerald-600">Gera um arquivo .json com todos os dados da sua empresa.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <Btn icon={DownloadCloud} onClick={gerarBackup} disabled={gerando}>{gerando ? 'Gerando...' : 'Gerar Novo Backup'}</Btn>
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
              <input ref={fileRef} type="file" accept=".json,application/json" className="hidden"
                onChange={e => e.target.files && importarBackup(e.target.files[0])} />
              <Btn variant="secondary" icon={UploadCloud} onClick={() => fileRef.current?.click()} disabled={importando}>
                {importando ? 'Importando...' : 'Selecionar Arquivo'}
              </Btn>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
