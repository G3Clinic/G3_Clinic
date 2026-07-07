import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, User, Phone, MapPin, Calendar, CheckSquare, CheckCircle2, FileText, Users } from 'lucide-react';

// Funções de Máscara
const maskCPF = (value: string) => value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
const maskPhone = (value: string) => value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1');
const maskRG = (value: string) => value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{1})\d+?$/, '$1');
const maskCEP = (value: string) => value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{3})\d+?$/, '$1');

const calculateAge = (birthDateString: string) => {
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

const API_URL = 'http://localhost:5000/api';

export function DonorFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [ageError, setAgeError] = useState('');
  
  const [formData, setFormData] = useState({
    // Tipo de Doação
    donationType: 'Voluntário',
    patientName: '',
    hospitalName: '',
    
    // Dados Pessoais
    fullName: '',
    birthDate: '',
    ethnicity: '',
    gender: 'Masculino',
    maritalStatus: '',
    education: '',
    profession: '',
    
    // Filiação e Origem
    motherName: '',
    fatherName: '',
    nationality: 'Brasileira',
    birthCity: '',
    birthState: '',
    
    // Documentação
    cpf: '',
    rg: '',
    rgIssuer: '',
    rgState: '',
    
    // Endereço e Contato
    zipCode: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    phone: '',
    phone2: '',
    email: '',
    
    // Consentimentos
    acceptsDonation: false,
    acceptsNotifications: false
  });

  useEffect(() => {
    if (isEditing) {
      setIsLoading(true);
      fetch(`${API_URL}/doadores/${id}`)
        .then(res => res.json())
        .then(data => {
          setFormData(prev => ({ ...prev, ...data }));
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Erro ao buscar doador:', err);
          setIsLoading(false);
        });
    }
  }, [isEditing, id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.birthDate) {
      const age = calculateAge(formData.birthDate);
      if (age < 16) {
        setAgeError(`O doador tem apenas ${age} anos. A idade mínima é 16 anos.`);
        return;
      }
    }
    
    setAgeError('');
    setIsLoading(true);
    
    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing ? `${API_URL}/doadores/${id}` : `${API_URL}/doadores`;

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    })
      .then(res => {
        if (!res.ok) throw new Error('Erro ao salvar');
        return res.json();
      })
      .then(() => {
        setIsLoading(false);
        setShowSuccessModal(true);
      })
      .catch(err => {
        console.error('Erro ao salvar doador:', err);
        setIsLoading(false);
        alert('Ocorreu um erro ao salvar. Tente novamente.');
      });
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    if (!isEditing) {
      navigate('/dashboard/doadores'); // Após cadastrar com sucesso, volta pra lista
    } else {
      navigate('/dashboard/doadores');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let formattedValue = value;

    if (name === 'cpf') formattedValue = maskCPF(value);
    if (name === 'phone' || name === 'phone2') formattedValue = maskPhone(value);
    if (name === 'rg') formattedValue = maskRG(value);
    if (name === 'zipCode') formattedValue = maskCEP(value);
    if (name === 'birthDate') setAgeError('');

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
    }
  };

  const getMaxBirthDate = () => {
    const today = new Date();
    today.setFullYear(today.getFullYear() - 16);
    return today.toISOString().split('T')[0];
  };

  const isDirectedDonation = formData.donationType === 'Reposição' || formData.donationType === 'Dirigido';

  return (
    <div className="max-w-5xl mx-auto animate-fade-in-up pb-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          {isEditing ? 'Editar Prontuário do Doador' : 'Novo Cadastro de Doador'}
        </h1>
        <p className="text-slate-500 text-sm">Ficha oficial de registro conforme normas do Hemocentro.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* BLOCO 1: TIPO DE DOAÇÃO */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
            <FileText className="text-brand-red" size={20} /> Classificação da Doação
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Doador</label>
              <select name="donationType" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red font-medium" value={formData.donationType} onChange={handleChange}>
                <option value="Voluntário">Voluntário</option>
                <option value="Reposição">Reposição</option>
                <option value="Campanha">Campanha</option>
                <option value="Autólogo">Autólogo</option>
                <option value="Dirigido">Dirigido</option>
                <option value="Convocado">Convocado</option>
              </select>
            </div>
            
            {isDirectedDonation && (
              <>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Paciente</label>
                  <input type="text" name="patientName" required className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red" placeholder="Para quem é a doação?" value={formData.patientName} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Hospital</label>
                  <input type="text" name="hospitalName" required className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red" placeholder="Nome do hospital" value={formData.hospitalName} onChange={handleChange} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* BLOCO 2: DADOS PESSOAIS */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
            <User className="text-brand-red" size={20} /> Dados Pessoais
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo <span className="text-brand-red">*</span></label>
              <input type="text" name="fullName" required className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red uppercase" placeholder="NOME DO DOADOR" value={formData.fullName} onChange={handleChange} />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Data de Nascimento <span className="text-brand-red">*</span></label>
              <div className="relative">
                <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 ${ageError ? 'text-red-400' : 'text-slate-400'}`} size={18} />
                <input type="date" name="birthDate" required max={getMaxBirthDate()} className={`w-full pl-10 pr-4 py-3 bg-white border rounded-xl outline-none ${ageError ? 'border-red-500' : 'border-gray-200 focus:border-brand-red'}`} value={formData.birthDate} onChange={handleChange} />
              </div>
              {ageError && <p className="mt-1 text-xs font-bold text-red-500">{ageError}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Sexo</label>
              <select name="gender" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red" value={formData.gender} onChange={handleChange}>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Etnia</label>
              <select name="ethnicity" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red" value={formData.ethnicity} onChange={handleChange}>
                <option value="">Selecione...</option>
                <option value="Branca">Branca</option>
                <option value="Preta">Preta</option>
                <option value="Parda">Parda</option>
                <option value="Amarela">Amarela</option>
                <option value="Indígena">Indígena</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Estado Civil</label>
              <select name="maritalStatus" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red" value={formData.maritalStatus} onChange={handleChange}>
                <option value="">Selecione...</option>
                <option value="Solteiro(a)">Solteiro(a)</option>
                <option value="Casado(a)">Casado(a)</option>
                <option value="Divorciado(a)">Divorciado(a)</option>
                <option value="Viúvo(a)">Viúvo(a)</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Escolaridade</label>
              <select name="education" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red" value={formData.education} onChange={handleChange}>
                <option value="">Selecione...</option>
                <option value="Fundamental Incompleto">Fundamental Incompleto</option>
                <option value="Fundamental Completo">Fundamental Completo</option>
                <option value="Médio Incompleto">Médio Incompleto</option>
                <option value="Médio Completo">Médio Completo</option>
                <option value="Superior Incompleto">Superior Incompleto</option>
                <option value="Superior Completo">Superior Completo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Profissão</label>
              <input type="text" name="profession" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red" placeholder="Ex: Professor" value={formData.profession} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* BLOCO 3: FILIAÇÃO E ORIGEM */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
            <Users className="text-brand-red" size={20} /> Filiação & Naturalidade
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Mãe <span className="text-brand-red">*</span></label>
              <input type="text" name="motherName" required className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red uppercase" placeholder="NOME DA MÃE" value={formData.motherName} onChange={handleChange} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Pai</label>
              <input type="text" name="fatherName" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red uppercase" placeholder="NOME DO PAI" value={formData.fatherName} onChange={handleChange} />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Nacionalidade</label>
              <input type="text" name="nationality" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red" placeholder="Ex: Brasileira" value={formData.nationality} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Naturalidade (Cidade)</label>
              <input type="text" name="birthCity" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red" placeholder="Ex: Salvador" value={formData.birthCity} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">UF (Naturalidade)</label>
              <input type="text" name="birthState" maxLength={2} className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red uppercase" placeholder="Ex: BA" value={formData.birthState} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* BLOCO 4: DOCUMENTOS */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
            <FileText className="text-brand-red" size={20} /> Documentação
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">CPF <span className="text-brand-red">*</span></label>
              <input type="text" name="cpf" required className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red font-mono" placeholder="000.000.000-00" value={formData.cpf} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Identidade (RG)</label>
              <input type="text" name="rg" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red font-mono" placeholder="00.000.000-0" value={formData.rg} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Expedidor</label>
              <input type="text" name="rgIssuer" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red uppercase" placeholder="Ex: SSP" value={formData.rgIssuer} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">UF (Doc)</label>
              <input type="text" name="rgState" maxLength={2} className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red uppercase" placeholder="Ex: BA" value={formData.rgState} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* BLOCO 5: ENDEREÇO E CONTATO */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
            <MapPin className="text-brand-red" size={20} /> Endereço Residencial & Contato
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">CEP</label>
              <input type="text" name="zipCode" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red font-mono" placeholder="00000-000" value={formData.zipCode} onChange={handleChange} />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-bold text-slate-700 mb-1">Rua / Avenida</label>
              <input type="text" name="address" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red" placeholder="Logradouro, Número, Complemento" value={formData.address} onChange={handleChange} />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Bairro</label>
              <input type="text" name="neighborhood" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red" placeholder="Nome do Bairro" value={formData.neighborhood} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Cidade</label>
              <input type="text" name="city" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red" placeholder="Ex: Salvador" value={formData.city} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">UF</label>
              <input type="text" name="state" maxLength={2} className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red uppercase" placeholder="Ex: BA" value={formData.state} onChange={handleChange} />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">E-mail</label>
              <input type="email" name="email" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red" placeholder="exemplo@email.com" value={formData.email} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Tel. 1 / WhatsApp <span className="text-brand-red">*</span></label>
              <input type="tel" name="phone" required className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red font-mono" placeholder="(00) 00000-0000" value={formData.phone} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Tel. 2 (Opcional)</label>
              <input type="tel" name="phone2" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-red font-mono" placeholder="(00) 00000-0000" value={formData.phone2} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
            <CheckSquare className="text-brand-red" size={20} /> Consentimentos Internos
          </h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="acceptsDonation" checked={formData.acceptsDonation} onChange={handleChange} className="w-5 h-5 text-brand-red rounded border-gray-300 focus:ring-brand-red" />
              <span className="text-sm font-medium text-slate-700">O doador confirma que aceita receber doação de sangue caso necessite no futuro?</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="acceptsNotifications" checked={formData.acceptsNotifications} onChange={handleChange} className="w-5 h-5 text-brand-red rounded border-gray-300 focus:ring-brand-red" />
              <span className="text-sm font-medium text-slate-700">Autoriza o envio de notificações, campanhas e alertas via E-mail e WhatsApp?</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={() => navigate('/dashboard/doadores')} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={isLoading} className="px-8 py-3 bg-brand-red text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-brand-red/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
            {isLoading ? 'Salvando...' : <><Save size={20} /> {isEditing ? 'Salvar Alterações' : 'Registrar Doador'}</>}
          </button>
        </div>
      </form>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up text-center p-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Sucesso!</h2>
            <p className="text-slate-600 mb-8">
              {isEditing ? 'Os dados do doador foram atualizados com sucesso.' : 'Novo doador registrado na base de dados!'}
            </p>
            <button onClick={handleCloseModal} className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors">
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}