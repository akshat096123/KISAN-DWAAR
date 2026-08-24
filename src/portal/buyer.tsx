import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { CropType, Grade, ICandidateCombination } from '../types';
import { calculateFairPrice } from '../utils/business';
import { api } from '../services/api';
import { 
  Building2, 
  Search,
  CheckCircle2,
  Layers, 
  Lock, 
  ArrowRight, 
  Sparkles,
  MapPin,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function BuyerPortal() {
  const { state, refreshState, lang } = useAppContext();
  const navigate = useNavigate();
  const isHindi = lang === 'hi';

  // Active Buyer Profile
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>(state.buyers[0]?.id || 'buyer-001');
  const buyer = state.buyers.find(b => b.id === selectedBuyerId) || state.buyers[0];

  // Demand Wizard State
  const [selectedCrop, setSelectedCrop] = useState<CropType>('wheat');
  const [quantityKg, setQuantityKg] = useState<string>('2000');
  const [maxPricePerKg, setMaxPricePerKg] = useState<string>('26.00');
  const [selectedGrade, setSelectedGrade] = useState<Grade>('A');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('ITC Food Depot, Ghaziabad Central Warehouse, UP');
  const [deliveryDeadline, setDeliveryDeadline] = useState<string>('2026-09-10');

  // Candidate Combinations State
  const [candidateCombinations, setCandidateCombinations] = useState<ICandidateCombination[]>([]);
  const [selectedCombinationId, setSelectedCombinationId] = useState<string | null>(null);
  const [isSearchingCombinations, setIsSearchingCombinations] = useState<boolean>(false);
  const [isLockingDeal, setIsLockingDeal] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cropOptions: CropType[] = ['wheat', 'rice', 'moong', 'masoor', 'urad', 'chana', 'jau', 'bajra', 'makai', 'jowar'];
  const livePriceBenchmark = calculateFairPrice(selectedCrop, deliveryAddress, selectedGrade);

  // Search candidate farmer combinations via Backend
  const handleSearchCombinations = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSearchingCombinations(true);

    try {
      const res = await api.combinations.search({
        buyerId: buyer.id,
        crop: selectedCrop,
        quantity: Number(quantityKg),
        maxPricePerKg: Number(maxPricePerKg),
        grade: selectedGrade,
        deliveryAddress,
        deliveryDeadline,
      });

      if (res.combinations && res.combinations.length > 0) {
        setCandidateCombinations(res.combinations);
        setSelectedCombinationId(res.combinations[0].id);
      } else {
        setCandidateCombinations([]);
        setSelectedCombinationId(null);
        setErrorMessage('No viable farmer combinations found meeting this price/quantity. Try adjusting price or quantity.');
      }
    } catch (err: any) {
      console.error('Error searching combinations:', err);
      setErrorMessage(err.message || 'Failed to search combinations.');
    } finally {
      setIsSearchingCombinations(false);
    }
  };

  // Lock Deal on the chosen combination & trigger IVR transport calls
  const handleMakeDeal = async () => {
    if (!selectedCombinationId) {
      setErrorMessage('Please select a farmer combination first.');
      return;
    }

    const chosenComb = candidateCombinations.find(c => c.id === selectedCombinationId);
    if (!chosenComb) return;

    setErrorMessage(null);
    setIsLockingDeal(true);

    try {
      const res = await api.combinations.lockDeal({
        buyerId: buyer.id,
        crop: selectedCrop,
        quantity: Number(quantityKg),
        maxPricePerKg: Number(maxPricePerKg),
        grade: selectedGrade,
        deliveryAddress,
        deliveryDeadline,
        combination: chosenComb,
      });

      if (res.deal) {
        setNotification(`🎉 Deal Confirmed in Database! Escrow payment of ₹${res.deal.escrow.totalAmount.toLocaleString()} locked. Automated IVR calls broadcasted to all nearby transporters!`);
        await refreshState();
        setTimeout(() => {
          navigate(`/ivr?poolId=${res.deal.pool.id}`);
        }, 1500);
      }
    } catch (err: any) {
      console.error('Error locking deal:', err);
      setErrorMessage(err.message || 'Failed to lock deal into database.');
    } finally {
      setIsLockingDeal(false);
    }
  };

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

        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-100 text-blue-800 rounded flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {isHindi ? 'सत्यापित खरीदार गेटवे' : 'Verified Commercial Buyer'}
              </span>
              <span className="text-xs text-gray-500 font-mono">GSTIN: {buyer?.taxId}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gov-darkest mt-1">
              🏢 {buyer?.organizationName}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Contact: {buyer?.contactPerson} • Phone: {buyer?.phone} • Credit Limit: ₹{buyer?.creditLimit.toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <span className="text-xs text-gray-500 block">Switch Buyer Account</span>
              <select
                value={selectedBuyerId}
                onChange={(e) => setSelectedBuyerId(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-gray-50 font-medium"
              >
                {state.buyers.map(b => (
                  <option key={b.id} value={b.id}>{b.organizationName}</option>
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

        {/* Main 2-Column Layout: Demand Request Form vs Candidate Combinations */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Crop Purchase Request Form */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <div className="pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gov-darkest flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-700" />
                {isHindi ? '1. फसल खरीद मांग एवं अधिकतम मूल्य' : '1. Request Crop & Set Target Price'}
              </h2>
              <p className="text-xs text-gray-500">
                Specify what crop you need and the maximum rate (₹/kg) you are ready to pay.
              </p>
            </div>

            <form onSubmit={handleSearchCombinations} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Crop (फसल)</label>
                  <select
                    value={selectedCrop}
                    onChange={(e) => setSelectedCrop(e.target.value as CropType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white font-medium"
                  >
                    {cropOptions.map(c => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Grade</label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value as Grade)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white font-medium"
                  >
                    <option value="A">Grade A (Standard)</option>
                    <option value="Premium">Grade Premium</option>
                    <option value="B">Grade B</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Quantity Needed (kg)</label>
                  <input
                    type="number"
                    required
                    value={quantityKg}
                    onChange={(e) => setQuantityKg(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono"
                    placeholder="e.g. 2000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Max Price You'll Pay (₹/kg)</label>
                  <input
                    type="number"
                    step={0.1}
                    required
                    value={maxPricePerKg}
                    onChange={(e) => setMaxPricePerKg(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono font-bold text-blue-700"
                    placeholder="e.g. 26.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Delivery Destination</label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Required By Deadline</label>
                <input
                  type="date"
                  value={deliveryDeadline}
                  onChange={(e) => setDeliveryDeadline(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs"
                />
              </div>

              {/* Price Benchmark Indicator */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Live Market Benchmark:</span>
                  <span className="font-mono">₹{livePriceBenchmark.fairPrice}/kg</span>
                </div>
                <div className="text-[11px] text-gray-600">
                  APMC Avg: ₹{livePriceBenchmark.mandiPrice}/kg • Official MSP: ₹{livePriceBenchmark.msp}/kg
                </div>
              </div>

              <button
                type="submit"
                disabled={isSearchingCombinations}
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-2"
              >
                {isSearchingCombinations ? (
                  <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-300" />
                )}
                <span>{isSearchingCombinations ? 'Matching Combinations from Database...' : 'Find Farmer Combinations That Work'}</span>
              </button>
            </form>
          </div>

          {/* Right Column: Farmer Combinations & Deal Making */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gov-darkest flex items-center gap-2">
                  <Layers className="w-5 h-5 text-gov-primary" />
                  {isHindi ? '2. उपलब्ध किसान संयोजन एवं विकल्प' : '2. Matching Farmer Combinations'}
                </h2>
                <p className="text-xs text-gray-500">
                  Choose the best farmer or multi-farmer combination matching your crop demand and price.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                {candidateCombinations.length} Options Found
              </span>
            </div>

            {/* If no search performed yet or empty */}
            {candidateCombinations.length === 0 ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-2xl space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-xl font-bold">
                  ⚖️
                </div>
                <h3 className="text-sm font-bold text-gray-800">
                  {isHindi ? 'कोई किसान संयोजन सक्रिय नहीं' : 'No Farmer Combinations Generated Yet'}
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  {isHindi 
                    ? 'बाईं ओर फसल और मात्रा भरें और "Find Farmer Combinations" पर क्लिक करें।' 
                    : 'Fill in your requested crop and quantity on the left, then click "Find Farmer Combinations" to evaluate multi-farmer aggregates.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {candidateCombinations.map((comb) => {
                  const isSelected = selectedCombinationId === comb.id;
                  return (
                    <div
                      key={comb.id}
                      onClick={() => setSelectedCombinationId(comb.id)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-3 ${
                        isSelected 
                          ? 'border-gov-primary bg-emerald-50/40 shadow-md ring-2 ring-gov-primary/20' 
                          : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                      }`}
                    >
                      {/* Top Row: Combination Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="combination"
                            checked={isSelected}
                            onChange={() => setSelectedCombinationId(comb.id)}
                            className="w-4 h-4 text-gov-primary focus:ring-gov-primary cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-bold uppercase text-gov-primary">
                              {comb.farmers.length === 1 ? 'Single Farmer Match' : `${comb.farmers.length}-Farmer Pooled Cluster`}
                            </span>
                            <h4 className="text-sm font-extrabold text-gov-darkest">
                              Total: {comb.totalQuantity} kg {selectedCrop.toUpperCase()}
                            </h4>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-gray-500 block">Avg Rate / kg</span>
                          <span className="font-mono font-bold text-gov-primary text-base">
                            ₹{comb.avgPricePerKg}
                          </span>
                        </div>
                      </div>

                      {/* Farmers Breakdown list */}
                      <div className="space-y-1.5 text-xs bg-white p-3 rounded-xl border border-gray-100">
                        {comb.farmers.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-gray-700">
                            <span>
                              🌾 <strong>{item.farmer.name}</strong> ({item.farmer.location.village}, {item.farmer.location.district})
                            </span>
                            <span className="font-mono">
                              <strong>{item.allocatedKg} kg</strong> @ ₹{item.minPricePerKg}/kg
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Pickup locations & Cost Details */}
                      <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 pt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-amber-600" />
                          <span>Villages: {comb.pickupVillages.join(' → ')} (~{comb.estimatedDistanceKm} km)</span>
                        </span>
                        <span className="font-bold text-gray-900 font-mono">
                          Total Crop Value: ₹{comb.totalCost.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Make Deal / Lock Contract Button */}
                <div className="p-4 bg-gov-dark text-white rounded-2xl space-y-3 shadow-md">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300">Selected Combination:</span>
                    <strong className="text-gov-gold">
                      {candidateCombinations.find(c => c.id === selectedCombinationId)?.farmers.length || 0} Farmers Pooled ({quantityKg} kg)
                    </strong>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    Locking the deal puts the purchase amount into secure Government Escrow and immediately broadcasts 
                    <strong> automated IVR phone calls</strong> to all registered nearby transporters.
                  </p>

                  <button
                    onClick={handleMakeDeal}
                    disabled={isLockingDeal}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-gov-darkest font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    {isLockingDeal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    <span>{isLockingDeal ? 'Locking Escrow into Database...' : 'Make Deal & Broadcast Automated Transporter Calls'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}