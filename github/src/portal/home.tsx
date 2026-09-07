import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { calculateFairPrice, MSP_BENCHMARKS, MANDI_AVERAGES, ALL_MANDI_REGIONS } from '../utils/business';
import { CropType } from '../types';
import { 
  ArrowRight, 
  ShieldCheck, 
  PhoneCall, 
  Lock, 
  Sparkles, 
  Scale, 
  Building2, 
  Award,
  Fingerprint
} from 'lucide-react';

const Home: React.FC = () => {
  const { state, lang } = useAppContext();
  const isHindi = lang === 'hi';

  // Fair price calculator interactive widget state
  const [calcCrop, setCalcCrop] = useState<CropType>('wheat');
  const [calcLocation, setCalcLocation] = useState('Meerut APMC, UP');
  const [calcGrade, setCalcGrade] = useState('A');
  const [calculatedPrice, setCalculatedPrice] = useState(() => calculateFairPrice('wheat', 'Meerut APMC, UP', 'A'));

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const res = calculateFairPrice(calcCrop, calcLocation, calcGrade);
    setCalculatedPrice(res);
  };

  const cropOptions: CropType[] = ['wheat', 'rice', 'moong', 'masoor', 'urad', 'chana', 'jau', 'bajra', 'makai', 'jowar'];

  const totalFarmers = state.farmers.length;
  const activeDemandsCount = state.demands.length;
  const confirmedPoolsCount = state.pools.filter(p => p.status === 'confirmed' || p.status === 'delivered' || p.status === 'paid').length;
  const totalEscrowLocked = state.escrows.reduce((sum, e) => sum + e.totalAmount, 0);

  return (
    <div className="min-h-screen bg-gov-surface text-gray-800">
      
      {/* 1. Live Mandi & MSP Marquee Ticker */}
      <div className="bg-gov-darkest text-white text-xs py-2 px-4 border-b border-gov-dark overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 whitespace-nowrap">
          <div className="flex items-center gap-2 text-gov-gold font-bold uppercase tracking-wider text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
            {isHindi ? 'लाइव मंडी एवं एमएसपी दरें:' : 'Live APMC Mandi Ticker:'}
          </div>
          <div className="flex items-center gap-6 text-gray-300 text-xs overflow-x-auto scrollbar-none py-0.5">
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-white">Wheat (गेहूं):</span> ₹{MANDI_AVERAGES.wheat}/kg 
              <span className="text-emerald-400 font-mono text-[11px]">(MSP: ₹{MSP_BENCHMARKS.wheat})</span>
            </span>
            <span className="text-gray-500">•</span>
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-white">Rice/Paddy (धान):</span> ₹{MANDI_AVERAGES.rice}/kg 
              <span className="text-emerald-400 font-mono text-[11px]">(MSP: ₹{MSP_BENCHMARKS.rice})</span>
            </span>
            <span className="text-gray-500">•</span>
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-white">Moong (मूंग दाल):</span> ₹{MANDI_AVERAGES.moong}/kg 
              <span className="text-emerald-400 font-mono text-[11px]">(MSP: ₹{MSP_BENCHMARKS.moong})</span>
            </span>
            <span className="text-gray-500">•</span>
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-white">Chana (चना):</span> ₹{MANDI_AVERAGES.chana}/kg 
              <span className="text-emerald-400 font-mono text-[11px]">(MSP: ₹{MSP_BENCHMARKS.chana})</span>
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-2 text-xs text-gray-400">
            <span>Refreshed: 16:00 IST</span>
          </div>
        </div>
      </div>

      {/* 2. Hero Section — full-bleed farmer photo background */}
      <section className="relative text-white overflow-hidden shadow-2xl" style={{ minHeight: '520px' }}>
        {/* Full-bleed background image */}
        <img
          src="/assets/hero1.png"
          alt="Indian farmers harvesting wheat at sunrise"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Strong dark overlay — heavier left, still present right so text is always readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/45" />
        {/* Subtle green tint layer matching old gov brand */}
        <div className="absolute inset-0 bg-gradient-to-br from-gov-darkest/60 via-transparent to-transparent" />
        {/* Dot-grid pattern */}
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:18px_18px] pointer-events-none" />
        {/* Subtle animated shimmer band at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gov-accent/60 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left: main text block */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/25 text-xs font-semibold text-gov-accent">
              <Sparkles className="w-3.5 h-3.5 text-gov-gold" />
              <span>Smart India Hackathon 2026 • Team Macros • Problem Statement</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.7)' }}>
              KISAN<span className="text-gov-accent">‑DWAAR</span>
              <br />
              <span className="text-lg sm:text-xl lg:text-2xl text-amber-300 font-semibold mt-1 block" style={{ textShadow: '0 1px 12px rgba(0,0,0,0.8)' }}>
                {isHindi
                  ? 'प्रत्यक्ष किसान-खरीदार संपर्क, न्यायसंगत मूल्य निर्धारण'
                  : 'AI-Driven Farmer–Buyer Direct Connectivity & Equitable Price Discovery'}
              </span>
            </h1>

            <p className="text-sm sm:text-base text-gray-100 leading-relaxed max-w-xl" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}>
              {isHindi
                ? 'आधार e-KYC सत्यापन, IVR कीपैड कॉल, सर्वोत्तम किसान संयोजन एवं पारदर्शी ट्रांसपोर्ट नीलामी।'
                : 'Eliminating rural middlemen through government Aadhaar verification, automated IVR keypad phone calls, optimal farmer combinations, and single-round sealed transport auctions.'}
            </p>

            {/* Stats row — frosted glass badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {[
                { val: '0%', label: 'Middleman Cut', color: 'text-gov-accent' },
                { val: '100%', label: 'Keypad Inclusive', color: 'text-amber-300' },
                { val: 'Aadhaar', label: 'Govt e-KYC', color: 'text-emerald-300' },
                { val: 'DBT', label: 'Escrow Payout', color: 'text-blue-300' },
              ].map(s => (
                <div
                  key={s.label}
                  className="bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/25 text-center shadow-lg hover:bg-black/50 transition-colors"
                >
                  <div className={`${s.color} font-extrabold text-lg leading-none drop-shadow`}>{s.val}</div>
                  <div className="text-[11px] text-gray-200 mt-0.5 font-medium">{s.label}</div>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link to="/login" className="px-6 py-3 bg-gov-saffron hover:bg-orange-600 text-white font-bold rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-xl transition-all flex items-center gap-2 text-sm">
                {isHindi ? 'पोर्टल में लॉगिन करें' : 'Login by Role'} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/buyer" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4" /> {isHindi ? 'खरीदार मांग दर्ज करें' : 'Post Buyer Demand'}
              </Link>
              <Link to="/government" className="px-6 py-3 bg-black/30 hover:bg-black/50 text-white font-semibold rounded-xl border border-white/40 backdrop-blur-md transition-all flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-gov-gold" /> {isHindi ? 'सरकारी निगरानी' : 'Government Portal'}
              </Link>
            </div>
          </div>

          {/* Right: Live Metrics card */}
          <div className="lg:col-span-5 bg-white/95 backdrop-blur-md rounded-3xl overflow-hidden text-gray-800 shadow-2xl border border-white/80">
            {/* Mandi image header */}
            <div className="h-44 overflow-hidden relative">
              <img src="/assets/banner1.png" alt="Indian Mandi" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex items-end p-4">
                <span className="text-sm text-white font-bold drop-shadow">🌾 Aadhaar-Verified Direct Agri Hub</span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gov-primary">National Hub</span>
                  <h3 className="text-base font-bold text-gov-darkest">Live Metrics</h3>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {[
                  { icon: <Fingerprint className="w-4 h-4 text-gov-primary" />, label: 'Aadhaar Verified Farmers', val: `${totalFarmers} Registered` },
                  { icon: <Building2 className="w-4 h-4 text-blue-700" />, label: 'Commercial Demands', val: `${activeDemandsCount} Active` },
                  { icon: <Scale className="w-4 h-4 text-amber-600" />, label: 'Multi-Farmer Pools', val: `${confirmedPoolsCount} Formed` },
                  { icon: <Lock className="w-4 h-4 text-emerald-600" />, label: 'Escrow Funds Held', val: `₹${totalEscrowLocked.toLocaleString()}` },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2">{row.icon} {row.label}</span>
                    <span className="font-bold text-gray-900">{row.val}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-gray-100">
                <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Payments unlocked strictly after Mandi Inspector QR audit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Gateways Grid with Images */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-gov-primary bg-gov-primary/10 px-3 py-1 rounded-full mb-3">Integrated Platform</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gov-darkest">Select Your Gateway Portal</h2>
          <p className="text-gray-500 text-sm sm:text-base mt-3">
            Each role interacts through specialized, secure interfaces tailored for ease of use, transparency, and governance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Farmer */}
          <div className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-gov-primary hover:shadow-xl shadow-sm transition-all duration-300 flex flex-col">
            <div className="h-44 overflow-hidden relative">
              <img src="/assets/farm1.png" alt="Indian farmer in wheat field" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <span className="absolute top-3 right-3 px-2.5 py-1 bg-emerald-700/90 text-white rounded-lg text-xs font-bold backdrop-blur-sm">Aadhaar e-KYC</span>
              <span className="absolute bottom-3 left-3 text-white font-bold text-lg drop-shadow">🌾 Farmer Corner</span>
            </div>
            <div className="p-6 flex flex-col flex-1">
              <p className="text-sm text-gray-500 mb-5 leading-relaxed flex-1">
                {isHindi ? 'सरकार द्वारा दर्ज फसल उपज, न्यूनतम मांग मूल्य, और DBT भुगतान लेजर।' : 'Government-registered harvest yields, minimum demand prices, and direct DBT bank payout ledger.'}
              </p>
              <Link to="/farmer" className="w-full py-2.5 bg-gov-surface hover:bg-gov-primary text-gov-primary hover:text-white font-semibold rounded-xl border border-gov-primary/30 transition-all text-center text-sm flex items-center justify-center gap-1.5">
                {isHindi ? 'किसान पोर्टल खोलें' : 'Open Farmer Portal'} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: Buyer */}
          <div className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-blue-500 hover:shadow-xl shadow-sm transition-all duration-300 flex flex-col">
            <div className="h-44 overflow-hidden relative">
              <img src="/assets/tractor1.png" alt="Corporate buyer reviewing grain samples" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <span className="absolute top-3 right-3 px-2.5 py-1 bg-blue-700/90 text-white rounded-lg text-xs font-bold backdrop-blur-sm">Combination Matching</span>
              <span className="absolute bottom-3 left-3 text-white font-bold text-lg drop-shadow">🏢 Bulk Buyer</span>
            </div>
            <div className="p-6 flex flex-col flex-1">
              <p className="text-sm text-gray-500 mb-5 leading-relaxed flex-1">
                {isHindi ? 'फसल मांग दर्ज करें, सर्वोत्तम किसान संयोजन चुनें और सौदा पक्का करें।' : 'Post crop demand. System finds all feasible farmer combos. Choose and lock the deal instantly.'}
              </p>
              <Link to="/buyer" className="w-full py-2.5 bg-blue-50 hover:bg-blue-700 text-blue-700 hover:text-white font-semibold rounded-xl border border-blue-200 transition-all text-center text-sm flex items-center justify-center gap-1.5">
                {isHindi ? 'खरीदार पोर्टल खोलें' : 'Open Buyer Portal'} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 3: Transporter */}
          <div className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-amber-500 hover:shadow-xl shadow-sm transition-all duration-300 flex flex-col">
            <div className="h-44 overflow-hidden relative">
              <img src="/assets/badge1.png" alt="Grain transport truck on rural highway" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <span className="absolute top-3 right-3 px-2.5 py-1 bg-amber-700/90 text-white rounded-lg text-xs font-bold backdrop-blur-sm">Sealed Min Bid</span>
              <span className="absolute bottom-3 left-3 text-white font-bold text-lg drop-shadow">🚛 Transporter Hub</span>
            </div>
            <div className="p-6 flex flex-col flex-1">
              <p className="text-sm text-gray-500 mb-5 leading-relaxed flex-1">
                {isHindi ? 'IVR कॉल पर दर उद्धरण दें। न्यूनतम बोली जीतती है।' : 'Automated IVR calls ring nearby carriers. Enter a single rate quote (₹/qtl-km). Minimum quote wins.'}
              </p>
              <Link to="/transporter" className="w-full py-2.5 bg-amber-50 hover:bg-amber-700 text-amber-700 hover:text-white font-semibold rounded-xl border border-amber-200 transition-all text-center text-sm flex items-center justify-center gap-1.5">
                {isHindi ? 'परिवहन पोर्टल खोलें' : 'Open Transporter Portal'} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 4: Government */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-orange-400 hover:shadow-xl shadow-sm transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-3xl mb-4 shadow-sm">🏛️</div>
              <h3 className="text-lg font-bold text-gov-darkest mb-2">
                {isHindi ? 'सरकारी निगरानी एवं आधार सत्यापन' : 'Government Oversight & Sign-off'}
              </h3>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                {isHindi ? 'मंडी अधिकारी किसान पंजीकरण, फसल दर्ज, QR स्कैन एवं भुगतान जारी करते हैं।' : 'Mandi officer onboards farmers via Aadhaar e-KYC, logs crop yields, scans delivery QR codes, and releases escrow.'}
              </p>
            </div>
            <Link to="/government" className="w-full py-2.5 bg-orange-50 hover:bg-gov-saffron text-gov-saffron hover:text-white font-semibold rounded-xl border border-orange-200 transition-all text-center text-sm flex items-center justify-center gap-1.5">
              {isHindi ? 'सरकारी पोर्टल खोलें' : 'Open Government Portal'} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 5: Keypad IVR */}
          <div className="bg-gradient-to-br from-purple-700 to-purple-900 rounded-2xl p-6 border border-purple-600 hover:shadow-xl shadow-sm transition-all duration-300 flex flex-col justify-between md:col-span-2 text-white">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-3xl mb-4">📞</div>
              <h3 className="text-lg font-bold mb-2">
                {isHindi ? 'कीपैड फोन आईवीआर वॉयस सिम्युलेटर' : 'Keypad Phone IVR Voice Simulator'}
              </h3>
              <p className="text-sm text-purple-100 mb-5 leading-relaxed">
                {isHindi
                  ? 'भाषा चयन, DTMF कीपैड ध्वनि, प्रस्ताव स्वीकृति और ट्रांसपोर्टर उद्धरण सहित ग्रामीण IVR इंटरफ़ेस टेस्ट करें।'
                  : 'Test the primary rural interface: language selection, audible DTMF keypad beeps, offer acceptance, mandi comparison, and transporter quoting flows.'}
              </p>
            </div>
            <Link to="/ivr" className="w-full py-3 bg-white text-purple-800 hover:bg-purple-100 font-bold rounded-xl transition-all text-center text-sm flex items-center justify-center gap-2 shadow-md">
              {isHindi ? 'आईवीआर सिम्युलेटर शुरू करें' : 'Launch Phone Simulator'} <PhoneCall className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Interactive AI Fair Price Discovery Calculator */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-emerald-900 via-gov-dark to-gov-darkest rounded-3xl p-6 sm:p-10 text-white shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-emerald-300">
                <Scale className="w-3.5 h-3.5 text-gov-gold" />
                <span>Price Discovery Engine</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold">
                {isHindi ? 'लाइव एआई उचित मूल्य निर्धारक' : 'Live AI Fair Price Predictor'}
              </h2>
              <p className="text-sm text-gray-200 leading-relaxed">
                KISAN-DWAAR constantly indexes APMC mandis and official government MSP benchmarks to protect farmers 
                from distress selling and ensure buyers receive transparent market-indexed rates.
              </p>

              {/* Interactive Form */}
              <form onSubmit={handleCalculate} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Crop (फसल)</label>
                  <select
                    value={calcCrop}
                    onChange={(e) => setCalcCrop(e.target.value as CropType)}
                    className="w-full bg-white/10 text-white rounded-lg px-3 py-2 text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    {cropOptions.map((c) => (
                      <option key={c} value={c} className="text-gray-900">
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Grade (गुणवत्ता)</label>
                  <select
                    value={calcGrade}
                    onChange={(e) => setCalcGrade(e.target.value)}
                    className="w-full bg-white/10 text-white rounded-lg px-3 py-2 text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="Premium" className="text-gray-900">Premium Grade</option>
                    <option value="A" className="text-gray-900">Grade A (Standard)</option>
                    <option value="B" className="text-gray-900">Grade B</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Mandi Cluster</label>
                  <select
                    value={calcLocation}
                    onChange={(e) => setCalcLocation(e.target.value)}
                    className="w-full bg-white/10 text-white rounded-lg px-3 py-2 text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400 truncate"
                  >
                    {ALL_MANDI_REGIONS.map((region) => (
                      <option key={region} value={region} className="text-gray-900">
                        {region}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3 pt-1">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors text-sm shadow flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-gov-gold" /> Calculate Fair Recommendation
                  </button>
                </div>
              </form>
            </div>

            {/* Calculated Result Card */}
            <div className="lg:col-span-6 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 text-white space-y-4">
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <span className="text-xs uppercase font-bold text-emerald-300">AI Recommendation Result</span>
                <span className="text-xs bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded">Confidence: 94%</span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-gray-300 block">Recommended Fair Crop Price</span>
                  <span className="text-4xl font-black text-amber-300 font-mono">
                    ₹{calculatedPrice.fairPrice}
                    <span className="text-sm font-normal text-gray-200"> / kg</span>
                  </span>
                </div>
                <div className="text-right font-mono text-sm">
                  <div className="text-gray-300 text-xs">Official MSP</div>
                  <div className="text-emerald-300 font-bold">₹{calculatedPrice.msp}/kg</div>
                  <div className="text-gray-300 text-xs mt-1">APMC Mandi Avg</div>
                  <div className="text-white font-bold">₹{calculatedPrice.mandiPrice}/kg</div>
                </div>
              </div>

              <div className="bg-black/20 p-3 rounded-lg text-xs text-gray-200 border border-white/10">
                <p className="leading-relaxed">{calculatedPrice.reason}</p>
              </div>

              <div className="flex justify-between items-center text-xs text-gray-300 pt-1">
                <span>Integrated agricultural indexing</span>
                <Link to="/buyer" className="text-emerald-300 hover:underline font-semibold flex items-center gap-1">
                  Place order with this rate <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. Footer with Team Macros Credits */}
      <footer className="bg-gov-darkest text-gray-300 pt-16 pb-12 border-t border-gov-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-white/10">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gov-primary flex items-center justify-center text-white font-bold text-lg">
                  🌾
                </div>
                <span className="text-xl font-bold text-white tracking-tight">KISAN-DWAAR</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Empowering India's farmers through Aadhaar registration, equitable AI price discovery, automated IVR phone connectivity, 
                and verified transparent logistics.
              </p>
            </div>

            <div>
              <h4 className="text-white text-sm font-bold mb-3 uppercase tracking-wider">Gateways</h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/farmer" className="hover:text-gov-accent transition-colors">Farmer Corner (किसान पोर्टल)</Link></li>
                <li><Link to="/buyer" className="hover:text-gov-accent transition-colors">Commercial Buyer Portal</Link></li>
                <li><Link to="/transporter" className="hover:text-gov-accent transition-colors">Transporter Auction Hub</Link></li>
                <li><Link to="/government" className="hover:text-gov-accent transition-colors">Government Oversight & Sign-Off</Link></li>
                <li><Link to="/ivr" className="hover:text-gov-accent transition-colors">Keypad Phone IVR Simulator</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white text-sm font-bold mb-3 uppercase tracking-wider">Authentication</h4>
              <ul className="space-y-2 text-xs text-gray-400">
                <li>• Aadhaar Biometric e-KYC Verification</li>
                <li>• Gram Panchayat Official Onboarding</li>
                <li>• Direct Benefit Transfer (DBT) Escrow</li>
                <li>• Single-Round Sealed Reverse Logistics</li>
              </ul>
            </div>

            <div>
              <h4 className="text-white text-sm font-bold mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-gov-gold" /> Team Macros
              </h4>
              <p className="text-xs text-gray-400 mb-2 font-medium">Smart India Hackathon 2026 Contributors:</p>
              <div className="text-xs text-gray-300 space-y-1 font-mono">
                <div>• Akshat Jain</div>
                <div>• Ashwani Visen</div>
                <div>• Disha Sirohi</div>
                <div>• Eindri Garg</div>
                <div>• Saksham Agarwal</div>
                <div>• Saksham Chaudhary</div>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <div>
              © 2026 KISAN-DWAAR • Ministry of Agriculture & Farmers Welfare / SIH 2026. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <span>National Toll-Free Helpline: 1800-180-1551</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Home;
