import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { IDelivery, AuditActionType, CropType, Grade } from '../types';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Search, 
  Lock, 
  Unlock, 
  Flag, 
  FileCheck, 
  Truck, 
  QrCode, 
  UserPlus, 
  PlusCircle,
  Wheat,
  Fingerprint,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function GovernmentPortal() {
  const { state, dispatch, refreshState, lang } = useAppContext();
  const isHindi = lang === 'hi';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'registration' | 'crop_entry' | 'verification' | 'audit'>('dashboard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Registration Form State
  const [regType, setRegType] = useState<'farmer' | 'buyer' | 'transporter'>('farmer');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('Uttar Pradesh');
  const [landSize, setLandSize] = useState('1.5');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc] = useState('SBIN0001234');

  // Buyer Specific
  const [orgName, setOrgName] = useState('');
  const [gstin, setGstin] = useState('');

  // Transporter Specific
  const [vehicleType, setVehicleType] = useState('Eicher Pro 2049 (3.5 Ton)');
  const [vehicleNumber, setVehicleNumber] = useState('UP-14-BT-9901');

  // Crop Entry State
  const [cropFarmerId, setCropFarmerId] = useState<string>(state.farmers[0]?.id || '');
  const [cropType, setCropType] = useState<CropType>('wheat');
  const [cropQuantity, setCropQuantity] = useState<string>('1500');
  const [cropMinDemandPrice, setCropMinDemandPrice] = useState<string>('24.50');
  const [cropGrade, setCropGrade] = useState<Grade>('A');

  // Verification State
  const [deliverySearchInput, setDeliverySearchInput] = useState<string>('DEL-2026-904');
  const [selectedDelivery, setSelectedDelivery] = useState<IDelivery | null>(() => state.deliveries[0] || null);
  const [inspectorNotes, setInspectorNotes] = useState<string>('Visual grain moisture within 12% tolerance. Weight matches electronic weighbridge slip.');

  // Audit Filters
  const [auditFilters, setAuditFilters] = useState({ action: '', userId: '', search: '' });
  const [flaggedIds, setFlaggedIds] = useState<string[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // Stats calculation
  const totalHeldEscrows = state.escrows.filter(e => e.status === 'held');
  const totalReleasedEscrows = state.escrows.filter(e => e.status === 'released');

  // Handle Official Aadhaar Registration
  const handleRegisterEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!aadhaarNumber || aadhaarNumber.length < 8) {
      setErrorMessage('Please enter a valid 12-digit Aadhaar number for biometric verification.');
      return;
    }

    if (!name || !phone) {
      setErrorMessage('Please enter both Name and Phone number.');
      return;
    }

    const officialId = 'GOVT-OFFICER-INSPECTOR-12';
    setIsSubmitting(true);

    try {
      if (regType === 'farmer') {
        const response = await api.farmers.register({
          aadhaarNumber,
          name,
          phone,
          landSize: Number(landSize) || 1.0,
          village: village || 'Gramin Basti',
          district: district || 'Meerut',
          state: stateName,
          bankAccount: accountNumber || '309911223344',
          bankIfsc: ifsc || 'SBIN0001234',
          bankVpa: `${phone}@upi`,
          cropType,
          cropQuantity: Number(cropQuantity) || 1000,
          cropMinDemandPrice: Number(cropMinDemandPrice) || 24.0,
          cropGrade,
          registeredByOfficialId: officialId,
          preferredLanguage: 'hi',
        });

        if (response.farmer) {
          dispatch({ type: 'ADD_FARMER', payload: response.farmer });
        }
        setNotification(`✅ Farmer ${name} registered successfully with Aadhaar Verification (${aadhaarNumber}) in database!`);
      } else if (regType === 'buyer') {
        const response = await api.buyers.register({
          aadhaarNumber,
          organizationName: orgName || name,
          taxId: gstin || '07AAACI1234F1Z8',
          address: `${district || 'Meerut'}, ${stateName}`,
          contactPerson: name,
          phone,
          email: `${name.toLowerCase().replace(/\s+/g, '')}@buyer.in`,
          registeredByOfficialId: officialId,
        });

        if (response.buyer) {
          dispatch({ type: 'ADD_BUYER', payload: response.buyer });
        }
        setNotification(`✅ Corporate Buyer ${orgName || name} registered and verified in database!`);
      } else if (regType === 'transporter') {
        const response = await api.transporters.register({
          aadhaarNumber,
          name,
          phone,
          vehicleType,
          vehicleNumber,
          hasSmartphone: true,
          registeredByOfficialId: officialId,
        });

        if (response.transporter) {
          dispatch({ type: 'ADD_TRANSPORTER', payload: response.transporter });
        }
        setNotification(`✅ Transporter ${name} (${vehicleNumber}) registered with Aadhaar in database!`);
      }

      await refreshState();
    } catch (err: any) {
      console.error('Registration failed:', err);
      setErrorMessage(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setNotification(null), 7000);
    }
  };

  // Handle Official Crop Entry for a Farmer
  const handleOfficialCropEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const targetFarmerId = cropFarmerId || state.farmers[0]?.id;
    const farmer = state.farmers.find(f => f.id === targetFarmerId);
    if (!farmer) {
      setErrorMessage('Please select a valid registered farmer.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.farmers.addCropInventory(farmer.id, {
        crop: cropType,
        availableQuantity: Number(cropQuantity),
        minPricePerKg: Number(cropMinDemandPrice),
        grade: cropGrade,
        registeredByOfficialId: 'GOVT-OFFICER-INSPECTOR-12',
      });

      if (res.farmer) {
        dispatch({ type: 'UPDATE_FARMER', payload: res.farmer });
      }

      setNotification(`🌾 Harvest lot of ${cropQuantity} kg ${cropType.toUpperCase()} (Min rate ₹${cropMinDemandPrice}/kg) saved to database for Farmer ${farmer.name}!`);
      await refreshState();
    } catch (err: any) {
      console.error('Crop entry failed:', err);
      setErrorMessage(err.message || 'Failed to add crop inventory.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setNotification(null), 7000);
    }
  };

  // Handle Delivery Verification & Escrow Release
  const handleVerifyAndReleaseEscrow = async () => {
    if (!selectedDelivery) return;
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await api.deliveries.verify(selectedDelivery.id, {
        officialId: 'GOVT-OFFICER-INSPECTOR-12',
        actualWeight: selectedDelivery.actualWeight,
        inspectorNotes,
        signature: 'GOVT-OFFICER-INSPECTOR-12-DIGITAL-SIGN',
      });

      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setNotification(`✅ Delivery #${selectedDelivery.id} verified in database! Government sign-off completed and Escrow payment unlocked directly to farmers via DBT.`);
      await refreshState();
    } catch (err: any) {
      console.error('Verification failed:', err);
      setErrorMessage(err.message || 'Failed to verify delivery.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setNotification(null), 8000);
    }
  };

  const handleFlagAudit = async (auditId: string) => {
    setFlaggedIds(prev => [...prev, auditId]);
    try {
      await api.audit.log({
        action: 'escrow_released',
        userId: 'GOVT-INSPECTOR-12',
        entityType: 'audit_log',
        entityId: auditId,
        details: { flagged: true, reason: 'Marked for formal vigilance inquiry by government officer' },
      });
      alert(`Audit entry #${auditId} flagged for vigilance investigation.`);
      await refreshState();
    } catch (err) {
      console.error('Audit flag failed:', err);
    }
  };

  const filteredAuditLogs = state.auditLogs.filter(log => {
    if (auditFilters.action && log.action !== auditFilters.action) return false;
    if (auditFilters.userId && !log.userId.toLowerCase().includes(auditFilters.userId.toLowerCase())) return false;
    if (auditFilters.search) {
      const q = auditFilters.search.toLowerCase();
      return (
        log.entityId.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.userId.toLowerCase().includes(q) ||
        JSON.stringify(log.details).toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getActionLabel = (action: AuditActionType) => {
    const labels: Record<AuditActionType, string> = {
      user_registered_by_govt: 'Aadhaar Verified Registration',
      crop_harvest_registered_by_govt: 'Govt Crop Harvest Entry',
      demands_posted: 'Demand Posted',
      combination_deal_locked: 'Farmer Combination Locked',
      offer_made: 'Offer Made',
      offer_accepted: 'Offer Accepted (IVR/Web)',
      offer_rejected: 'Offer Rejected',
      offer_callback_requested: 'Callback Scheduled',
      pool_formed: 'Multi-Farmer Pool Formed',
      transporter_call_broadcasted: 'IVR Transport Broadcast',
      transport_bid_placed: 'Sealed Transport Bid',
      transport_bid_won: 'Transport Bid Awarded',
      payment_escrow_locked: 'Buyer Escrow Locked',
      delivery_picked_up: 'Farm Pickups Loaded',
      delivery_in_transit: 'In Transit GPS Waypoint',
      delivery_verified: 'Government Delivery Sign-Off',
      payment_released: 'DBT Payment Disbursed',
      escrow_funded: 'Escrow Funded',
      escrow_released: 'Escrow Payout Complete',
    };
    return labels[action] || action;
  };

  const cropOptions: CropType[] = ['wheat', 'rice', 'moong', 'masoor', 'urad', 'chana', 'jau', 'bajra', 'makai', 'jowar'];

  return (
    <div className="min-h-screen bg-gov-surface p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Government Inspectorate Header */}
        <div className="bg-gradient-to-r from-gov-darkest via-gov-dark to-gov-primary text-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gov-darkest flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 bg-gov-gold text-gov-darkest rounded font-mono">
                {isHindi ? 'सरकारी निगरानी पोर्टल' : 'Official Oversight Portal'}
              </span>
              <span className="text-xs text-gray-300">Auth Token: APMC-DEL-9921-INSP</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2.5 text-white">
              <ShieldCheck className="w-8 h-8 text-gov-gold" />
              {isHindi ? 'सरकारी निगरानी, आधार पंजीकरण एवं सत्यापन' : 'Government Oversight & Aadhaar Inspectorate'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-300">
              Department of Agriculture & Farmers Welfare • Aadhaar Onboarding, Crop Verification & Escrow Release
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/15 text-right">
              <span className="text-[11px] text-gov-gold uppercase block font-semibold">Inspector on Duty</span>
              <span className="text-sm font-bold font-mono">R. K. Verma (Mandi Officer)</span>
            </div>
          </div>
        </div>

        {/* Error Messages */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-300 text-red-900 p-4 rounded-xl flex items-center gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Notifications */}
        {notification && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-xl flex items-center gap-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{notification}</span>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
          {[
            { id: 'dashboard', label: isHindi ? '📊 राष्ट्रीय डैशबोर्ड' : '📊 Executive Dashboard' },
            { id: 'registration', label: isHindi ? '🪪 आधार पंजीकरण (किसान/खरीदार)' : '🪪 Aadhaar Registration' },
            { id: 'crop_entry', label: isHindi ? '🌾 फसल आवक प्रविष्टि' : '🌾 Official Crop Yield Entry' },
            { id: 'verification', label: isHindi ? '✅ क्यूआर सत्यापन एवं एस्क्रो' : '✅ QR Delivery Sign-Off & Escrow' },
            { id: 'audit', label: isHindi ? '📋 अपरिवर्तनीय ऑडिट लेजर' : '📋 Immutable Audit Trail' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-gov-primary text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Executive Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center text-xs font-semibold text-gray-500 uppercase">
                  <span>Aadhaar Verified Farmers</span>
                  <Fingerprint className="w-4 h-4 text-gov-primary" />
                </div>
                <p className="text-2xl font-black font-mono text-gov-darkest mt-2">{state.farmers.length}</p>
                <span className="text-xs text-emerald-700 font-medium mt-1 block">100% Biometric e-KYC</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center text-xs font-semibold text-gray-500 uppercase">
                  <span>Escrow Locked</span>
                  <Lock className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-2xl font-black font-mono text-gov-darkest mt-2">
                  ₹{totalHeldEscrows.reduce((s, e) => s + e.totalAmount, 0).toLocaleString()}
                </p>
                <span className="text-xs text-amber-700 font-medium mt-1 block">
                  {totalHeldEscrows.length} pending delivery sign-off
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center text-xs font-semibold text-gray-500 uppercase">
                  <span>DBT Released to Farmers</span>
                  <Unlock className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-black font-mono text-emerald-700 mt-2">
                  ₹{totalReleasedEscrows.reduce((s, e) => s + e.farmersShare, 0).toLocaleString()}
                </p>
                <span className="text-xs text-emerald-700 font-medium mt-1 block">100% direct bank payout</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center text-xs font-semibold text-gray-500 uppercase">
                  <span>Deliveries In Transit</span>
                  <Truck className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-black font-mono text-blue-700 mt-2">
                  {state.deliveries.length}
                </p>
                <span className="text-xs text-gray-500 mt-1 block">Single-Round Bid Logistics</span>
              </div>
            </div>

            {/* Quick Action: Pending Inspections List */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-bold text-gov-darkest text-base">
                  Deliveries Requiring Warehouse Physical Inspection ({state.deliveries.length})
                </h3>
                <span className="text-xs text-gray-500">Click to verify and release held funds</span>
              </div>

              <div className="space-y-3">
                {state.deliveries.map(delivery => {
                  const pool = state.pools.find(p => p.id === delivery.poolId);
                  const demand = pool ? state.demands.find(d => d.id === pool.demandId) : null;
                  const escrow = pool ? state.escrows.find(e => e.poolId === pool.id) : null;

                  return (
                    <div
                      key={delivery.id}
                      className="p-4 bg-gov-surface rounded-xl border border-gray-200 hover:border-gov-primary transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gov-darkest text-base">
                            🚚 Manifest #{delivery.id}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                            delivery.status === 'verified'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {delivery.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Commodity: <strong>{demand?.crop.toUpperCase()} (Grade {demand?.grade})</strong> • Weight: <strong>{delivery.actualWeight} kg</strong> • To: <strong>{delivery.deliveryLocation.address}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs">
                          <span className="text-gray-500 block">Held in Escrow</span>
                          <span className="font-bold font-mono text-gov-primary text-sm">
                            ₹{escrow?.totalAmount.toLocaleString() || '0'}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedDelivery(delivery);
                            setActiveTab('verification');
                          }}
                          className="px-4 py-2 bg-gov-primary hover:bg-gov-secondary text-white font-bold text-xs rounded-lg transition-colors shadow flex items-center gap-1.5"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Audit & Release Escrow</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Aadhaar Registration of Farmers, Buyers, Transporters */}
        {activeTab === 'registration' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
            <div className="pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-gov-primary" />
                <h2 className="text-xl font-bold text-gov-darkest">
                  {isHindi ? 'सरकारी अधिकारी द्वारा आधार सत्यापन एवं पंजीकरण' : 'Official Aadhaar e-KYC User Registration Desk'}
                </h2>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                All farmers, buyers, and transporters must be registered by authorized Mandi / Panchayat officials through physical Aadhaar verification.
              </p>
            </div>

            {/* Entity Selector */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRegType('farmer')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  regType === 'farmer' ? 'bg-gov-primary text-white shadow' : 'bg-gray-100 text-gray-700'
                }`}
              >
                🌾 Onboard Farmer (किसान)
              </button>
              <button
                type="button"
                onClick={() => setRegType('buyer')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  regType === 'buyer' ? 'bg-blue-700 text-white shadow' : 'bg-gray-100 text-gray-700'
                }`}
              >
                🏢 Onboard Corporate Buyer
              </button>
              <button
                type="button"
                onClick={() => setRegType('transporter')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  regType === 'transporter' ? 'bg-amber-600 text-white shadow' : 'bg-gray-100 text-gray-700'
                }`}
              >
                🚛 Onboard Transporter Carrier
              </button>
            </div>

            <form onSubmit={handleRegisterEntity} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Aadhaar Number (12 Digits) *
                  </label>
                  <input
                    type="text"
                    required
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value)}
                    placeholder="e.g. 7829-4412-9018"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-gov-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Full Name (as on Aadhaar) *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ram Charan"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-gov-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Mobile Phone (for IVR Voice Calls) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-gov-primary focus:outline-none"
                  />
                </div>

                {regType === 'farmer' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                        Land Holding Size (Hectares)
                      </label>
                      <input
                        type="number"
                        step={0.1}
                        value={landSize}
                        onChange={(e) => setLandSize(e.target.value)}
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                        Village / Gram Panchayat
                      </label>
                      <input
                        type="text"
                        value={village}
                        onChange={(e) => setVillage(e.target.value)}
                        placeholder="e.g. Biharpur"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                        Bank Account Number (DBT)
                      </label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="e.g. 309811223344"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-mono"
                      />
                    </div>
                  </>
                )}

                {regType === 'buyer' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                        Organization / Trade Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g. Agro Foods India Ltd"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                        GSTIN / Tax ID
                      </label>
                      <input
                        type="text"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value)}
                        placeholder="e.g. 07AAACI1234F1Z8"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-mono"
                      />
                    </div>
                  </>
                )}

                {regType === 'transporter' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                        Vehicle Type & Capacity
                      </label>
                      <input
                        type="text"
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                        Commercial Vehicle Number
                      </label>
                      <input
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        placeholder="e.g. UP-14-BT-9901"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-mono uppercase"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Bulandshahr"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gov-primary hover:bg-gov-secondary disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-gov-gold" /> : <Fingerprint className="w-4 h-4 text-gov-gold" />}
                  <span>{isSubmitting ? 'Saving to Database...' : 'Verify Aadhaar & Complete Registration'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Official Crop Yield Entry (Farmer contacts official) */}
        {activeTab === 'crop_entry' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
            <div className="pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Wheat className="w-6 h-6 text-emerald-600" />
                <h2 className="text-xl font-bold text-gov-darkest">
                  {isHindi ? 'सरकारी अधिकारी द्वारा किसान फसल आवक प्रविष्टि' : 'Official Crop Harvest Registration Desk'}
                </h2>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                The farmer contacts the Mandi/Panchayat officer. The officer enters the available crop harvest and the 
                <strong> minimum expected demand price (₹/kg)</strong> specified by the farmer.
              </p>
            </div>

            <form onSubmit={handleOfficialCropEntry} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Select Registered Aadhaar-Verified Farmer *
                </label>
                <select
                  value={cropFarmerId}
                  onChange={(e) => setCropFarmerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white font-medium focus:ring-2 focus:ring-gov-primary focus:outline-none"
                >
                  {state.farmers.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} (Aadhaar: {f.aadhaarNumber}) • {f.location.village}, {f.location.district}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Crop / Commodity (फसल) *
                  </label>
                  <select
                    value={cropType}
                    onChange={(e) => setCropType(e.target.value as CropType)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white font-medium"
                  >
                    {cropOptions.map(c => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Quality Grade (गुणवत्ता)
                  </label>
                  <select
                    value={cropGrade}
                    onChange={(e) => setCropGrade(e.target.value as Grade)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white font-medium"
                  >
                    <option value="A">Grade A (Standard)</option>
                    <option value="Premium">Grade Premium</option>
                    <option value="B">Grade B</option>
                    <option value="C">Grade C</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Available Yield Quantity (kg) *
                  </label>
                  <input
                    type="number"
                    required
                    value={cropQuantity}
                    onChange={(e) => setCropQuantity(e.target.value)}
                    placeholder="e.g. 1200"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Farmer Minimum Expected Demand Price (₹ / kg) *
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    required
                    value={cropMinDemandPrice}
                    onChange={(e) => setCropMinDemandPrice(e.target.value)}
                    placeholder="e.g. 24.50"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-mono font-bold text-gov-primary"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                  <span>{isSubmitting ? 'Saving to Database...' : 'Register Crop Yield & Set Minimum Price'}</span>
                </button>
              </div>
            </form>

            {/* List of currently registered farmer inventories */}
            <div className="pt-6 border-t border-gray-100 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-600">
                Verified Available Farmer Crop Inventory Pool ({state.farmers.reduce((sum, f) => sum + f.inventory.length, 0)} Lots)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {state.farmers.map(f => (
                  f.inventory.map((inv, idx) => (
                    <div key={`${f.id}-${idx}`} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-bold text-gray-900 block">🌾 {f.name} ({f.location.village})</span>
                        <span className="text-gray-500">
                          {inv.crop.toUpperCase()} (Grade {inv.grade}) • Min Rate: <strong className="text-gov-primary font-mono">₹{inv.minPricePerKg}/kg</strong>
                        </span>
                      </div>
                      <div className="text-right font-mono font-bold text-emerald-700 text-sm">
                        {inv.availableQuantity} kg
                      </div>
                    </div>
                  ))
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Tab 4: QR Delivery Verification & Escrow Release */}
        {activeTab === 'verification' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gov-darkest flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-gov-saffron" />
                  Electronic Delivery Verification & Escrow Payout Unlock
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                  Scan QR code or enter delivery manifest ID to audit contract specifications against physical cargo.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={deliverySearchInput}
                    onChange={(e) => setDeliverySearchInput(e.target.value)}
                    placeholder="DEL-2026-904"
                    className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-mono w-48 focus:ring-2 focus:ring-gov-primary focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => {
                    const match = state.deliveries.find(d => d.id.toLowerCase() === deliverySearchInput.trim().toLowerCase());
                    if (match) setSelectedDelivery(match);
                    else alert('Delivery ID not found.');
                  }}
                  className="px-3.5 py-2 bg-gov-primary text-white text-xs font-bold rounded-lg hover:bg-gov-secondary shadow"
                >
                  Load
                </button>
              </div>
            </div>

            {selectedDelivery ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Contract Promised Specs */}
                  <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-5 space-y-3 text-xs">
                    <span className="font-bold text-blue-900 uppercase">1. Contract Promised Specification</span>
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between"><span>Demanded Crop:</span><strong>Wheat (Grade A)</strong></div>
                      <div className="flex justify-between"><span>Promised Quantity:</span><strong className="font-mono">2,500 kg (100% Quorum)</strong></div>
                      <div className="flex justify-between"><span>Agreed Rate:</span><strong className="font-mono text-gov-primary">₹25.50/kg</strong></div>
                    </div>
                  </div>

                  {/* Right: Actual Delivered Cargo Specs */}
                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-5 space-y-3 text-xs">
                    <span className="font-bold text-emerald-900 uppercase">2. Electronic Weighbridge & Quality Audit</span>
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between"><span>Delivered To:</span><strong>{selectedDelivery.deliveryLocation.address}</strong></div>
                      <div className="flex justify-between"><span>Gross Weighed:</span><strong className="font-mono text-emerald-700">{selectedDelivery.actualWeight} kg (PASS)</strong></div>
                      <div className="flex justify-between"><span>Status:</span><strong className="uppercase text-emerald-800">{selectedDelivery.status}</strong></div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Inspector Notes:</label>
                      <textarea
                        value={inspectorNotes}
                        onChange={(e) => setInspectorNotes(e.target.value)}
                        rows={2}
                        className="w-full p-2 border border-emerald-200 rounded-lg text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Sign-off button */}
                <div className="p-4 bg-gov-dark text-white rounded-xl flex items-center justify-between">
                  <span className="text-xs text-gray-300">Authorized Mandi Inspector Sign-off triggers immediate DBT bank transfer to farmers.</span>
                  {selectedDelivery.status !== 'verified' ? (
                    <button
                      onClick={handleVerifyAndReleaseEscrow}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-gov-darkest font-black text-xs rounded-lg shadow flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Delivery & Release Escrow</span>
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400 font-bold">✓ Verified & Escrow Released</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500 text-xs">Select or scan a delivery manifest to begin inspection.</p>
            )}
          </div>
        )}

        {/* Tab 5: Immutable Audit Trail */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-100 gap-4">
              <div>
                <h2 className="text-xl font-bold text-gov-darkest flex items-center gap-2">
                  <FileCheck className="w-6 h-6 text-gov-primary" />
                  Immutable Platform Audit Ledger
                </h2>
                <p className="text-xs text-gray-500">
                  Permanent record of Aadhaar registrations, farmer crop entries, buyer combination deals, IVR transport bids, and escrow releases.
                </p>
              </div>

              <input
                type="text"
                value={auditFilters.search}
                onChange={(e) => setAuditFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search logs..."
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gov-darkest text-white border-b border-gov-dark">
                    <th className="p-3 font-mono">Timestamp</th>
                    <th className="p-3 font-bold">Action Event</th>
                    <th className="p-3 font-bold">Actor</th>
                    <th className="p-3 font-bold">Entity ID</th>
                    <th className="p-3 font-bold">Details</th>
                    <th className="p-3 font-bold text-center">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAuditLogs.map(log => (
                    <tr key={log.id} className={`hover:bg-gray-50 ${flaggedIds.includes(log.id) ? 'bg-red-50' : ''}`}>
                      <td className="p-3 font-mono text-gray-600 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="p-3 font-bold text-gov-darkest">{getActionLabel(log.action)}</td>
                      <td className="p-3 font-mono text-gray-700">{log.userId}</td>
                      <td className="p-3 font-mono text-blue-700 font-semibold">{log.entityId}</td>
                      <td className="p-3 font-mono text-[11px] text-gray-600 max-w-xs truncate" title={JSON.stringify(log.details)}>
                        {JSON.stringify(log.details)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleFlagAudit(log.id)}
                          className="px-2 py-0.5 text-[10px] bg-gray-100 hover:bg-red-100 text-gray-600 rounded"
                        >
                          <Flag className="w-3 h-3 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}