import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { OfferStatus } from '../types';
import { api } from '../services/api';
import { 
  Users, 
  CheckCircle2, 
  PhoneCall, 
  Clock, 
  Check, 
  X, 
  ShieldCheck, 
  Fingerprint, 
  Wheat, 
  Lock,
  AlertCircle
} from 'lucide-react';

export default function FarmerPortal() {
  const { state, refreshState, lang } = useAppContext();
  const isHindi = lang === 'hi';

  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(state.farmers[0]?.id || 'farmer-001');
  const farmer = state.farmers.find(f => f.id === selectedFarmerId) || state.farmers[0];

  const myOffers = state.offers.filter(o => o.farmerId === farmer?.id);
  const myCompletedEscrows = state.escrows.filter(e => {
    const pool = state.pools.find(p => p.id === e.poolId);
    return pool?.farmers.includes(farmer?.id) && e.status === 'released';
  });

  const [notification, setNotification] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOfferAction = async (offerId: string, newStatus: OfferStatus) => {
    const offer = state.offers.find(o => o.id === offerId);
    if (!offer) return;
    setErrorMessage(null);

    try {
      await api.pools.updateOfferStatus(offerId, newStatus);
      await refreshState();

      setNotification(
        newStatus === 'accepted' 
          ? (isHindi ? `✅ प्रस्ताव स्वीकार किया गया! ${offer.quantity} किलो आर्डर डाटाबेस में लॉक हो गया।` : `✅ Offer Accepted! ${offer.quantity} kg locked into database pool.`)
          : newStatus === 'rejected' 
          ? (isHindi ? `❌ प्रस्ताव अस्वीकार कर दिया गया।` : `❌ Offer Rejected in database.`)
          : (isHindi ? `📞 2 घंटे में कॉलबैक निर्धारित किया गया।` : `📞 Callback scheduled in 2 hours.`)
      );
    } catch (err: any) {
      console.error('Error updating offer:', err);
      setErrorMessage(err.message || 'Failed to update offer status.');
    } finally {
      setTimeout(() => setNotification(null), 5000);
    }
  };

  if (!farmer) return <div className="p-8 text-center text-gray-600">No farmers loaded.</div>;

  return (
    <div className="min-h-screen bg-gov-surface p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Error message */}
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

        {/* Top Header Card with Farmer Profile */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-100 text-gov-primary rounded flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {isHindi ? 'आधार-सत्यापित लघु किसान' : 'Aadhaar Verified Smallholder'}
              </span>
              <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                <Fingerprint className="w-3.5 h-3.5 text-gov-primary" />
                Aadhaar: {farmer.aadhaarNumber}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gov-darkest mt-1">
              🌾 {farmer.name}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {farmer.location.village}, {farmer.location.district} ({farmer.location.state}) • 
              Land: <strong>{farmer.landSize} Hectares</strong> • Registered Phone: <strong>{farmer.phone}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <span className="text-xs text-gray-500 block">{isHindi ? 'किसान खाता बदलें' : 'Switch Farmer'}</span>
              <select
                value={selectedFarmerId}
                onChange={(e) => setSelectedFarmerId(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-gray-50 font-medium"
              >
                {state.farmers.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.location.village})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-xl flex items-center gap-3 shadow-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{notification}</span>
          </div>
        )}

        {/* Registered Crop Yields (Entered by Govt Official) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-100 gap-2">
            <div>
              <h2 className="text-xl font-bold text-gov-darkest flex items-center gap-2">
                <Wheat className="w-5 h-5 text-emerald-600" />
                {isHindi ? 'सरकारी अधिकारी द्वारा सत्यापित फसल आवक एवं न्यूनतम भाव' : 'Official Registered Crop Inventory & Price'}
              </h2>
              <p className="text-xs text-gray-500">
                Entered at Panchayat/Mandi office upon Aadhaar e-KYC. Buyers can only pool crops at or above your minimum demand price.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-emerald-50 text-gov-primary border border-emerald-200 rounded-full font-bold flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              {isHindi ? 'सरकारी पंजीकृत' : 'Govt Verified'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {farmer.inventory.map((inv, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-base text-gov-darkest uppercase">🌾 {inv.crop}</span>
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">Grade {inv.grade}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Available Yield:</span>
                  <strong className="text-gray-900 font-mono text-sm">{inv.availableQuantity} kg</strong>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Your Min Demand Price:</span>
                  <strong className="text-gov-primary font-mono text-sm">₹{inv.minPricePerKg}/kg</strong>
                </div>
                <div className="pt-2 border-t border-gray-200 text-[11px] text-gray-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified by Inspector</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Pool Invitations */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gov-darkest flex items-center gap-2">
                <Users className="w-5 h-5 text-gov-primary" />
                {isHindi ? 'सक्रिय समूह प्रस्ताव (Pool Invitations)' : 'Active Pool Invitations'} ({myOffers.length})
              </h2>
              <p className="text-xs text-gray-500">
                Incoming purchase offers from commercial buyer pools. Accept directly or test the voice call.
              </p>
            </div>
          </div>

          {myOffers.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p>{isHindi ? 'वर्तमान में कोई सक्रिय प्रस्ताव नहीं है।' : 'No active purchase offers right now.'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myOffers.map(offer => {
                const pool = state.pools.find(p => p.id === offer.poolId);
                const demand = pool ? state.demands.find(d => d.id === pool.demandId) : null;
                const buyerObj = demand ? state.buyers.find(b => b.id === demand.buyerId) : null;

                return (
                  <div key={offer.id} className="p-5 bg-white border border-gray-200 rounded-xl hover:border-gov-primary transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-gov-darkest capitalize">
                          🌾 {offer.crop} Order from {buyerObj?.organizationName || 'Corporate Buyer'}
                        </span>
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                          offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          offer.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          offer.status === 'callback-requested' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {offer.status.toUpperCase()}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600">
                        Allocated Yield: <strong className="font-mono">{offer.quantity} kg</strong> • 
                        Agreed Rate: <strong className="font-mono text-gov-primary font-bold">₹{offer.pricePerKg}/kg</strong> • 
                        Total Value: <strong className="font-mono text-gray-900">₹{(offer.quantity * offer.pricePerKg).toLocaleString()}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {offer.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleOfferAction(offer.id, 'accepted')}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center gap-1"
                          >
                            <Check className="w-4 h-4" /> Accept (1)
                          </button>
                          <button
                            onClick={() => handleOfferAction(offer.id, 'rejected')}
                            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center gap-1"
                          >
                            <X className="w-4 h-4" /> Reject (3)
                          </button>
                          <button
                            onClick={() => handleOfferAction(offer.id, 'callback-requested')}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Clock className="w-3.5 h-3.5" /> Callback (4)
                          </button>
                        </>
                      )}

                      <a
                        href={`/ivr?poolId=${offer.poolId}&farmerId=${farmer.id}`}
                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center gap-1.5"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>{isHindi ? '📞 IVR कॉल शुरू करें' : '📞 Start IVR Call'}</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DBT Payout History */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-4">
          <h3 className="font-bold text-gov-darkest text-base pb-3 border-b border-gray-100">
            {isHindi ? 'प्रत्यक्ष लाभ अंतरण (DBT) बैंक भुगतान इतिहास' : 'Direct Benefit Transfer (DBT) Payout History'}
          </h3>

          <div className="space-y-2">
            {myCompletedEscrows.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">
                {isHindi 
                  ? 'सरकारी अधिकारी द्वारा डिलीवरी सत्यापन के बाद आपका भुगतान सीधे बैंक खाते में पहुंचेगा।' 
                  : 'Direct DBT bank transfers will appear here once warehouse deliveries are signed off by the Government Inspector.'}
              </p>
            ) : (
              myCompletedEscrows.map(esc => (
                <div key={esc.id} className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center text-xs">
                  <div>
                    <strong className="text-gov-darkest block">Bank Transfer (DBT-PFMS) #{esc.id}</strong>
                    <span className="text-gray-600">Disbursed to: {farmer.bankDetails?.accountNumber} ({farmer.bankDetails?.ifsc})</span>
                  </div>
                  <div className="text-right font-mono font-bold text-emerald-700 text-sm">
                    ₹{esc.farmersShare.toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}