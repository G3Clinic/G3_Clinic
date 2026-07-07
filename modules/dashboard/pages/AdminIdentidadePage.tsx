import { useState, useRef } from 'react';
import { Palette, Save, Image as ImageIcon, UploadCloud, RefreshCcw } from 'lucide-react';
import { PageHeader, Card, Btn, InputField } from '../../../components/ui/shared';
import { useTheme } from '../../../contexts/ThemeContext';

export function AdminIdentidadePage() {
  const { theme, updateTheme } = useTheme();
  
  const [primaryColor, setPrimaryColor] = useState(theme.primaryColor);
  const [sidebarColor, setSidebarColor] = useState(theme.sidebarColor);
  const [topbarColor, setTopbarColor] = useState(theme.topbarColor);
  const [logoFullUrl, setLogoFullUrl] = useState(theme.logoFullUrl);
  const [logoIconUrl, setLogoIconUrl] = useState(theme.logoIconUrl);
  const [companyName, setCompanyName] = useState(theme.companyName);

  const [isUploading, setIsUploading] = useState(false);

  const fileInputFullRef = useRef<HTMLInputElement>(null);
  const fileInputIconRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, type: 'full' | 'icon') => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        if (type === 'full') setLogoFullUrl(data.url);
        if (type === 'icon') setLogoIconUrl(data.url);
      }
    } catch (error) {
      console.error("Erro ao enviar imagem:", error);
      alert("Erro ao enviar imagem. Verifique se o backend está rodando na porta 8000.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    updateTheme({
      primaryColor,
      sidebarColor,
      topbarColor,
      logoFullUrl,
      logoIconUrl,
      companyName
    });
    alert('Identidade visual atualizada com sucesso!');
  };

  const handleReset = () => {
    // Reset context
    updateTheme({
      primaryColor: '#10B981',
      sidebarColor: '#FFFFFF',
      topbarColor: '#FFFFFF',
    });
    // Reset local state
    setPrimaryColor('#10B981');
    setSidebarColor('#FFFFFF');
    setTopbarColor('#FFFFFF');
    alert('Cores restauradas para o padrão!');
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Palette} title="Identidade Visual" subtitle="Personalize as cores, logos e nome da sua clínica" />

      <Card>
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
          <ImageIcon size={18} className="text-brand-primary" />
          Logos e Identificação
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <InputField 
            label="Nome da Empresa" 
            value={companyName} 
            onChange={(e: any) => setCompanyName(e.target.value)} 
            placeholder="Ex: Clínica Saúde" 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center relative min-h-[140px]">
            {logoFullUrl ? (
              <img src={logoFullUrl} alt="Logo Completa" className="h-12 object-contain mb-4" />
            ) : (
              <div className="w-16 h-12 bg-gray-200 rounded mb-4 flex items-center justify-center text-xs text-slate-400">Sem Imagem</div>
            )}
            <input 
              type="file" 
              accept="image/*,.svg" 
              className="hidden" 
              ref={fileInputFullRef}
              onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'full')}
            />
            <Btn size="sm" variant="secondary" icon={UploadCloud} onClick={() => fileInputFullRef.current?.click()} disabled={isUploading}>
              {isUploading ? 'Enviando...' : 'Upload Logo Completa'}
            </Btn>
            <p className="text-xs text-slate-500 mt-2 text-center">Utilizada no cabeçalho superior (Topbar).<br/>Recomendado: Imagem horizontal (PNG/SVG).</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center relative min-h-[140px]">
            {logoIconUrl ? (
              <img src={logoIconUrl} alt="Ícone da Logo" className="w-12 h-12 object-contain mb-4" />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4 flex items-center justify-center text-xs text-slate-400">Sem Ícone</div>
            )}
            <input 
              type="file" 
              accept="image/*,.svg" 
              className="hidden" 
              ref={fileInputIconRef}
              onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'icon')}
            />
            <Btn size="sm" variant="secondary" icon={UploadCloud} onClick={() => fileInputIconRef.current?.click()} disabled={isUploading}>
              {isUploading ? 'Enviando...' : 'Upload Ícone'}
            </Btn>
            <p className="text-xs text-slate-500 mt-2 text-center">Utilizado no menu lateral (Sidebar).<br/>Recomendado: Formato quadrado (PNG/SVG).</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-xs text-blue-700"><strong>Dica de Contraste:</strong> Caso a sua logo não tenha contraste suficiente com a cor de fundo escolhida para os menus, recomendamos fazer o upload de uma versão monocromática (toda em branco ou toda em preto - versão positiva/negativa) com fundo transparente (.png ou .svg).</p>
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
          <Palette size={18} className="text-brand-primary" />
          Cores do Sistema
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cor Principal (Botões e Destaques)</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded border border-gray-200 cursor-pointer p-1" />
              <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary uppercase" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cor do Menu Lateral (Sidebar)</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={sidebarColor} onChange={(e) => setSidebarColor(e.target.value)} className="w-10 h-10 rounded border border-gray-200 cursor-pointer p-1" />
              <input type="text" value={sidebarColor} onChange={(e) => setSidebarColor(e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary uppercase" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cor do Cabeçalho (Topbar)</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={topbarColor} onChange={(e) => setTopbarColor(e.target.value)} className="w-10 h-10 rounded border border-gray-200 cursor-pointer p-1" />
              <input type="text" value={topbarColor} onChange={(e) => setTopbarColor(e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary uppercase" />
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-between items-center pt-4">
        <Btn variant="cancel" icon={RefreshCcw} onClick={handleReset}>Restaurar Cores Padrão</Btn>
        <Btn icon={Save} onClick={handleSave}>Salvar Configurações</Btn>
      </div>
    </div>
  );
}
