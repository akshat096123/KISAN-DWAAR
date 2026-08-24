import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { UserRole } from '../types';
import { api } from '../services/api';
import { 
  ShieldCheck, 
  Users, 
  Building2, 
  Truck, 
  ArrowRight, 
  Lock,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function LoginPage() {
  const { state, login, lang } = useAppContext();
  const navigate = useNavigate();

  const [activeRole, setActiveRole] = useState<UserRole>('farmer');
  const [selectedFarmerId, setSelectedFarmerId] = useState(state.farmers[0]?.id || '');
  const [selectedBuyerId, setSelectedBuyerId] = useState(state.buyers[0]?.id || '');
  const [selectedTransporterId, setSelectedTransporterId] = useState(state.transporters[0]?.id || '');
  const [govtOfficerId] = useState('GOVT-OFFICER-INSPECTOR-12');

  const [mobileOrAadhaar, setMobileOrAadhaar] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isHindi = lang === 'hi';

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      let targetId = '';
      if (activeRole === 'farmer') targetId = selectedFarmerId || state.farmers[0]?.id;
      if (activeRole === 'buyer') targetId = selectedBuyerId || state.buyers[0]?.id;
      if (activeRole === 'transporter') targetId = selectedTransporterId || state.transporters[0]?.id;
      if (activeRole === 'government') targetId = govtOfficerId;

      const res = await api.auth.login(activeRole, targetId, undefined, mobileOrAadhaar || undefined);

      if (res.user) {
        login(res.user.role, res.user.id, res.user.name);
        navigate(`/${activeRole}`);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gov-surface py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-md w-full mx-auto space-y-8">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-gov-primary to-gov-secondary text-white font-bold text-2xl items-center justify-center shadow-lg border border-gov-primary">
            🌾
          </div>
          <h2 className="text-3xl font-black tracking-tight text-gov-darkest">
            KISAN<span className="text-gov-primary">-DWAAR</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 font-medium">
            {isHindi 
              ? 'एकीकृत कृषि पोर्टल • भूमिका अनुसार सुरक्षित प्रवेश' 
              : 'National Agricultural Gateway • Role-Based Authentication'}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-200 space-y-6">
          
          {/* Role Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-gray-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveRole('farmer')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                activeRole === 'farmer' ? 'bg-gov-primary text-white shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{isHindi ? 'किसान' : 'Farmer'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveRole('buyer')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                activeRole === 'buyer' ? 'bg-blue-700 text-white shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>{isHindi ? 'खरीदार' : 'Buyer'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveRole('transporter')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                activeRole === 'transporter' ? 'bg-amber-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>{isHindi ? 'ट्रांसपोर्टर' : 'Transporter'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveRole('government')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                activeRole === 'government' ? 'bg-gov-saffron text-white shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isHindi ? 'सरकारी' : 'Govt'}</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-300 text-red-900 p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* Farmer Selector */}
            {activeRole === 'farmer' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1.5">
                    {isHindi ? 'आधार-सत्यापित किसान प्रोफ़ाइल चुनें' : 'Select Aadhaar-Verified Farmer Account'}
                  </label>
                  <select
                    value={selectedFarmerId}
                    onChange={(e) => setSelectedFarmerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white font-medium focus:ring-2 focus:ring-gov-primary focus:outline-none"
                  >
                    {state.farmers.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} • Aadhaar: {f.aadhaarNumber} ({f.location.village}, {f.location.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    {isHindi ? 'या मोबाइल / आधार संख्या दर्ज करें' : 'Or enter registered Mobile / Aadhaar'}
                  </label>
                  <input
                    type="text"
                    value={mobileOrAadhaar}
                    onChange={(e) => setMobileOrAadhaar(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm"
                  />
                </div>
              </div>
            )}

            {/* Buyer Selector */}
            {activeRole === 'buyer' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1.5">
                    {isHindi ? 'सत्यापित खरीदार संगठन चुनें' : 'Select Registered Corporate Buyer'}
                  </label>
                  <select
                    value={selectedBuyerId}
                    onChange={(e) => setSelectedBuyerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white font-medium focus:ring-2 focus:ring-blue-700 focus:outline-none"
                  >
                    {state.buyers.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.organizationName} • GSTIN: {b.taxId}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Transporter Selector */}
            {activeRole === 'transporter' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1.5">
                    {isHindi ? 'सत्यापित परिवहन वाहक चुनें' : 'Select Verified Transport Carrier'}
                  </label>
                  <select
                    value={selectedTransporterId}
                    onChange={(e) => setSelectedTransporterId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white font-medium focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  >
                    {state.transporters.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.vehicleType} • {t.vehicleNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Government Official */}
            {activeRole === 'government' && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-2 text-xs text-amber-900">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4 text-gov-saffron" />
                  <span>Authorized Mandi / Panchayat Inspector</span>
                </div>
                <p className="leading-relaxed">
                  Official ID: <strong className="font-mono">{govtOfficerId}</strong> (R. K. Verma). Full authority to onboard farmers via Aadhaar, enter crop yields, and release Escrow funds.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gov-primary hover:bg-gov-secondary disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{isLoading ? 'Verifying...' : (isHindi ? 'पोर्टल में प्रवेश करें' : 'Login to Dashboard')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Government Registration Notice */}
          <div className="pt-4 border-t border-gray-100 text-center text-xs text-gray-500 space-y-1">
            <p className="flex items-center justify-center gap-1 font-medium text-gov-darkest">
              <Lock className="w-3.5 h-3.5 text-gov-saffron" />
              {isHindi ? 'नया पंजीकरण केवल सरकारी अधिकारी द्वारा' : 'New Registrations are handled by Govt Officials'}
            </p>
            <p className="text-[11px] text-gray-400">
              {isHindi 
                ? 'किसान अपनी ग्राम पंचायत / मंडी अधिकारी से संपर्क कर आधार सत्यापन द्वारा फसल दर्ज करवाएं।' 
                : 'Farmers and transporters are onboarded directly at the Gram Panchayat/Mandi office with biometric Aadhaar e-KYC.'}
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
