import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { OfferStatus, Language, ICallLog } from '../types';
import { logAudit } from '../utils/business';
import { api } from '../services/api';
import IVRVoiceEngine from '../components/IVRVoiceEngine';
import { Phone, PhoneCall, CheckCircle2, RotateCcw, Truck } from 'lucide-react';

export default function IVRPortal() {
  const [searchParams] = useSearchParams();
  const poolIdParam = searchParams.get('poolId');
  const farmerIdParam = searchParams.get('farmerId');
  const { state, dispatch, refreshState, lang } = useAppContext();
  const isGlobalHindi = lang === 'hi';

  // Call Mode: 'farmer' or 'transporter'
  const [callMode, setCallMode] = useState<'farmer' | 'transporter'>(() => {
    return poolIdParam ? 'transporter' : 'farmer';
  });

  // Selected pool & farmer & transporter
  const selectedPool = state.pools.find(p => p.id === (poolIdParam || state.pools[0]?.id)) || state.pools[0];
  const selectedFarmer = state.farmers.find(f => f.id === (farmerIdParam || state.farmers[0]?.id)) || state.farmers[0];
  const [activeTransporterIndex, setActiveTransporterIndex] = useState<number>(0);
  const selectedTransporter = state.transporters[activeTransporterIndex] || state.transporters[0];

  const demand = selectedPool ? state.demands.find(d => d.id === selectedPool.demandId) : null;
  const offer = selectedPool && selectedFarmer ? state.offers.find(o => o.poolId === selectedPool.id && o.farmerId === selectedFarmer.id) : null;

  // IVR call state
  const [callActive, setCallActive] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<
    'lang_select' | 'details' | 'main_menu' | 'mandi_info' | 'confirm_accept' | 'callback_scheduled' | 'rejected' | 'completed' | 'transporter_quote'
  >('lang_select');

  const [callLang, setCallLang] = useState<Language>('hi');
  const [dtmfBuffer, setDtmfBuffer] = useState<string>('');
  const [lastActionOutcome, setLastActionOutcome] = useState<string | null>(null);

  // Dynamic voice script builder: Every call starts with Language Selection!
  const getVoiceScript = (): string => {
    const cropName = demand?.crop || 'wheat';
    const quantity = offer?.quantity || 800;
    const price = selectedPool?.pricePerKg || 25.50;
    const mspPrice = 22.75;
    const mandiPrice = 24.50;

    // STEP 1: In EVERY call, ask for language first!
    if (currentStep === 'lang_select') {
      return `Namaste! Welcome to Kisan Dwaar. Hindi ke liye 1 dabayein. For English press 2. (नमस्ते! किसान द्वार में आपका स्वागत है। हिंदी के लिए 1 दबाएं, अंग्रेजी के लिए 2 दबाएं।)`;
    }

    // TRANSPORTER VOICE CALL SCRIPT
    if (callMode === 'transporter') {
      if (callLang === 'hi') {
        switch (currentStep) {
          case 'details':
          case 'main_menu':
            return `नमस्ते ${selectedTransporter?.name || 'परिवहन वाहक'}। किसान द्वार लॉजिस्टिक्स से नया परिवहन आर्डर। ${selectedPool?.farmers.length || 3} गांवों से ${selectedPool?.totalQuantity || 2500} किलो ${cropName} उठाकर गाजियाबाद सेंट्रल वेयरहाउस पहुंचाना है। प्रति क्विंटल किलोमीटर अपनी अंतिम न्यूनतम दर दर्ज करने के लिए 1 दबाएं। अस्वीकार करने के लिए 2 दबाएं।`;
          case 'transporter_quote':
            return `कृपया कीपैड पर प्रति क्विंटल-किलोमीटर अपनी दर (जैसे दो दशमलव चार) दर्ज करें और अंत में हैश (#) दबाएं।`;
          case 'completed':
            return `धन्यवाद! आपकी सिंगल-राउंड बोली दर्ज कर ली गई है। सबसे कम दर वाले वाहक को आर्डर का अनुबंध स्वतः जारी होगा। शुभ दिन।`;
          default:
            return `किसान द्वार में आपका स्वागत है।`;
        }
      } else {
        switch (currentStep) {
          case 'details':
          case 'main_menu':
            return `Namaste ${selectedTransporter?.name || 'Transporter'}. Kisan Dwaar logistics calling. Haulage required for ${selectedPool?.totalQuantity || 2500} kilograms of ${cropName} across ${selectedPool?.farmers.length || 3} rural village pickups to Ghaziabad Central Warehouse. Press 1 to enter your single sealed rate quote per quintal kilometer. Press 2 to decline.`;
          case 'transporter_quote':
            return `Please enter your rate per quintal kilometer on the keypad, followed by the hash key.`;
          case 'completed':
            return `Thank you. Your single-round sealed rate quote has been recorded in the audit trail. Goodbye.`;
          default:
            return `Welcome to Kisan Dwaar.`;
        }
      }
    }

    // FARMER VOICE CALL SCRIPT
    if (callLang === 'hi') {
      switch (currentStep) {
        case 'details':
        case 'main_menu':
          return `नमस्ते ${selectedFarmer?.name || 'किसान भाई'}। आपको ${cropName} की ${quantity} किलोग्राम फसल के लिए ₹${price} प्रति किलो का सरकारी सत्यापित आर्डर मिला है। सरकारी एमएसपी ₹${mspPrice} और स्थानीय मंडी भाव ₹${mandiPrice} है। प्रस्ताव स्वीकार करने के लिए 1 दबाएं। मंडी भाव दोबारा सुनने के लिए 2 दबाएं। अस्वीकार करने के लिए 3 दबाएं। दो घंटे बाद दोबारा कॉल के लिए 4 दबाएं।`;
        case 'mandi_info':
          return `वर्तमान निकटतम एपीएमसी मंडी में ${cropName} का न्यूनतम भाव ₹23, अधिकतम ₹25.20, और औसत भाव ₹${mandiPrice} प्रति किलो है। मुख्य मेनू पर लौटने के लिए 1 दबाएं।`;
        case 'confirm_accept':
          return `आप ${quantity} किलोग्राम ${cropName} को ₹${price} प्रति किलो पर बेचने की पुष्टि कर रहे हैं। अंतिम पुष्टि के लिए 1 दबाएं, वापस जाने के लिए 2 दबाएं।`;
        case 'callback_scheduled':
          return `आपकी कॉलबैक निर्धारित कर दी गई है। हमारे कृषि मित्र 2 घंटे में आपसे पुनः संपर्क करेंगे। धन्यवाद।`;
        case 'rejected':
          return `आपका उत्तर दर्ज कर लिया गया है। किसान द्वार से जुड़ने के लिए धन्यवाद।`;
        case 'completed':
          return `बधाई हो! आपकी फसल का आर्डर सफलतापूर्वक लॉक कर दिया गया है। सरकारी अधिकारी द्वारा माल सत्यापन के बाद तुरंत बैंक खाते में भुगतान जारी होगा। धन्यवाद।`;
        default:
          return `किसान द्वार में आपका स्वागत है।`;
      }
    } else {
      switch (currentStep) {
        case 'details':
        case 'main_menu':
          return `Namaste ${selectedFarmer?.name || 'Farmer'}. You have a verified buyer contract for ${quantity} kg of ${cropName} at ₹${price} per kg. Official MSP is ₹${mspPrice} and APMC Mandi rate is ₹${mandiPrice}. Press 1 to Accept, Press 2 for Mandi price comparison, Press 3 to Reject, Press 4 for a callback in 2 hours.`;
        case 'mandi_info':
          return `Current local APMC Mandi minimum price is ₹23, maximum is ₹25.20, and typical average is ₹${mandiPrice} per kg. Press 1 to return to main menu.`;
        case 'confirm_accept':
          return `You are confirming sale of ${quantity} kg ${cropName} at ₹${price} per kg. Press 1 to Confirm, Press 2 to Go Back.`;
        case 'callback_scheduled':
          return `Callback has been scheduled in 2 hours. Our Krishi Mitra will call you. Thank you.`;
        case 'rejected':
          return `Your rejection has been recorded. Thank you for connecting with Kisan Dwaar.`;
        case 'completed':
          return `Congratulations! Your committed crop quantity has been locked. Direct bank transfer will be disbursed after warehouse delivery sign-off. Goodbye.`;
        default:
          return `Welcome to Kisan Dwaar.`;
      }
    }
  };

  // Handle DTMF Key Presses
  const handleDtmfInput = async (key: string) => {
    if (!callActive) return;
    setDtmfBuffer(prev => prev + key);

    // STEP 1: Handle Language Selection first in all calls
    if (currentStep === 'lang_select') {
      if (key === '1') {
        setCallLang('hi');
        setCurrentStep('main_menu');
      } else if (key === '2') {
        setCallLang('en');
        setCurrentStep('main_menu');
      }
      return;
    }

    // STEP 2: Handle Transporter Mode
    if (callMode === 'transporter') {
      if (currentStep === 'main_menu' || currentStep === 'details') {
        if (key === '1') {
          setCurrentStep('transporter_quote');
        } else if (key === '2') {
          setCurrentStep('completed');
          setTimeout(() => setCallActive(false), 3000);
        }
      } else if (currentStep === 'transporter_quote') {
        if (key === '#') {
          // Submit single rate quote via API
          const parsedRate = 2.40;
          if (selectedPool && selectedTransporter) {
            try {
              await api.transporters.submitBid({
                poolId: selectedPool.id,
                transporterId: selectedTransporter.id,
                ratePerQuintalKm: parsedRate,
                estimatedDistance: 120,
              });

              await api.ivr.logCall({
                phone: selectedTransporter.phone,
                type: 'transporter',
                direction: 'outbound',
                status: 'completed',
                duration: 50,
                dtmf: (dtmfBuffer + '#').split(''),
                outcome: 'rate_submitted',
                language: callLang,
              });

              await refreshState();
            } catch (err) {
              console.error('IVR Bid submission failed:', err);
            }
          }

          setLastActionOutcome(`Transporter ${selectedTransporter.name} submitted sealed rate ₹2.40/qtl-km via IVR DTMF! Saved to database.`);
          setCurrentStep('completed');
          setTimeout(() => setCallActive(false), 4000);
        }
      }
      return;
    }

    // STEP 3: Handle Farmer Mode
    if (currentStep === 'main_menu') {
      if (key === '1') {
        setCurrentStep('confirm_accept');
      } else if (key === '2') {
        setCurrentStep('mandi_info');
      } else if (key === '3') {
        await handleFarmerOutcome('rejected');
      } else if (key === '4') {
        await handleFarmerOutcome('callback-requested');
      }
    } else if (currentStep === 'mandi_info') {
      if (key === '1') {
        setCurrentStep('main_menu');
      }
    } else if (currentStep === 'confirm_accept') {
      if (key === '1') {
        handleFarmerOutcome('accepted');
      } else if (key === '2') {
        setCurrentStep('main_menu');
      }
    }
  };

  const handleFarmerOutcome = (status: OfferStatus) => {
    if (offer && selectedPool) {
      dispatch({ type: 'UPDATE_OFFER_STATUS', payload: { id: offer.id, status } });

      if (status === 'accepted') {
        const poolOffers = state.offers.map(o => o.id === offer.id ? { ...o, status } : o).filter(o => o.poolId === selectedPool.id);
        const acceptedOffers = poolOffers.filter(o => o.status === 'accepted');
        const newCommitted = acceptedOffers.reduce((sum, o) => sum + o.quantity, 0);
        const isQuorumReached = newCommitted >= (selectedPool.totalQuantity * 0.9);

        dispatch({
          type: 'UPDATE_POOL_COMMITTED',
          payload: {
            id: selectedPool.id,
            committedQuantity: newCommitted,
            status: isQuorumReached ? 'confirmed' : selectedPool.status,
          },
        });
      }

      const callLog: ICallLog = {
        id: `call-${Date.now()}`,
        phone: selectedFarmer.phone,
        type: 'farmer',
        direction: 'outbound',
        status: 'completed',
        duration: 45,
        dtmf: dtmfBuffer.split(''),
        outcome: status,
        language: callLang,
        timestamp: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_CALL_LOG', payload: callLog });

      dispatch({
        type: 'ADD_AUDIT_LOG',
        payload: logAudit(
          status === 'accepted' ? 'offer_accepted' : status === 'rejected' ? 'offer_rejected' : 'offer_callback_requested',
          selectedFarmer.id,
          'offer',
          offer.id,
          { channel: 'IVR_VOICE_CALL', dtmfOutcome: status, poolId: selectedPool.id }
        ),
      });

      setLastActionOutcome(
        status === 'accepted' 
          ? `Farmer ${selectedFarmer.name} ACCEPTED ${offer.quantity} kg offer via IVR keypad! Quorum committed.`
          : `Farmer selected ${status} over IVR.`
      );
    }

    if (status === 'accepted') setCurrentStep('completed');
    else if (status === 'rejected') setCurrentStep('rejected');
    else setCurrentStep('callback_scheduled');

    setTimeout(() => setCallActive(false), 5000);
  };

  const startCall = () => {
    setCallActive(true);
    setCurrentStep('lang_select');
    setDtmfBuffer('');
  };

  const endCall = () => {
    setCallActive(false);
  };

  return (
    <div className="min-h-screen bg-gov-surface p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {isGlobalHindi ? 'टेलीकॉम आईवीआर वॉइस सिम्युलेटर' : 'Telecom IVR Gateway Simulator'}
              </span>
              <span className="text-xs text-gray-500 font-mono">100% Keypad Phone Inclusive</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gov-darkest mt-1 flex items-center gap-2">
              📞 {isGlobalHindi ? 'किसान द्वार स्वचालित वॉयस टेलीफोनी' : 'Kisan-Dwaar Automated Voice Telephony'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Zero-internet connectivity: Automated outbound calls with mandatory language selection, DTMF keypad responses, and speech synthesis.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => { setCallMode('farmer'); endCall(); }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                callMode === 'farmer' ? 'bg-gov-primary text-white shadow' : 'text-gray-700 hover:text-black'
              }`}
            >
              🌾 Farmer IVR Call
            </button>
            <button
              onClick={() => { setCallMode('transporter'); endCall(); }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                callMode === 'transporter' ? 'bg-amber-600 text-white shadow' : 'text-gray-700 hover:text-black'
              }`}
            >
              🚛 Transporter Broadcast Call
            </button>
          </div>
        </div>

        {/* Action Outcome Banner */}
        {lastActionOutcome && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-xl flex items-center gap-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{lastActionOutcome}</span>
          </div>
        )}

        {/* Main Grid: Interactive Phone Simulator vs Call Context */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Phone Simulator */}
          <div className="lg:col-span-5 flex justify-center">
            <IVRVoiceEngine
              script={getVoiceScript()}
              lang={callLang}
              onDtmfKey={handleDtmfInput}
              callActive={callActive}
              onEndCall={endCall}
              onStartCall={startCall}
            />
          </div>

          {/* Right: Telephony Metadata & Transporter Queue */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Call Target Details */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-bold text-gov-darkest text-base">
                  Call Target & Telephony Session
                </h3>
                <span className="text-xs font-mono font-normal text-gray-500">
                  Target: {callMode === 'farmer' ? selectedFarmer?.phone : selectedTransporter?.phone}
                </span>
              </div>

              {/* Transporter Switcher when in transporter broadcast mode */}
              {callMode === 'transporter' && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-amber-950 uppercase flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-amber-600" />
                    Automated Nearby Transporter Broadcast Queue ({state.transporters.length} Carriers)
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {state.transporters.map((t, idx) => (
                      <button
                        key={t.id}
                        onClick={() => { setActiveTransporterIndex(idx); endCall(); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                          activeTransporterIndex === idx ? 'bg-amber-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
                        }`}
                      >
                        {t.name} ({t.vehicleType})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-500 block">Recipient:</span>
                  <strong className="text-gray-900">{callMode === 'farmer' ? selectedFarmer?.name : selectedTransporter?.name}</strong>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-500 block">Crop / Commodity:</span>
                  <strong className="text-gray-900 capitalize">{demand?.crop || 'Wheat'}</strong>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-500 block">Total Haulage Weight:</span>
                  <strong className="text-gov-primary">{selectedPool?.totalQuantity || 2500} kg</strong>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-500 block">Current Step:</span>
                  <strong className="text-purple-700 uppercase">{currentStep}</strong>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-500 block">Language Selected:</span>
                  <strong className="text-gov-primary uppercase">{callLang === 'hi' ? 'Hindi (1)' : 'English (2)'}</strong>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-500 block">DTMF Digits:</span>
                  <strong className="font-mono text-gray-900">{dtmfBuffer || 'None'}</strong>
                </div>
              </div>

              {/* Call Controls */}
              <div className="pt-2 flex flex-wrap gap-2">
                {!callActive ? (
                  <button
                    onClick={startCall}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-2"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Dial Outbound Call (Language Prompt First)</span>
                  </button>
                ) : (
                  <button
                    onClick={endCall}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow transition-colors"
                  >
                    Hang Up Call
                  </button>
                )}

                <button
                  onClick={() => startCall()}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restart Simulator
                </button>
              </div>
            </div>

            {/* Bids Placed by Transporters */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-bold text-gov-darkest text-base pb-3 border-b border-gray-100">
                Single-Round Transporter Quotes for Pool ({state.transportBids.filter(b => b.poolId === selectedPool?.id).length} Quotes)
              </h3>

              <div className="space-y-2.5">
                {state.transportBids.filter(b => b.poolId === selectedPool?.id).map(bid => {
                  const t = state.transporters.find(tr => tr.id === bid.transporterId);
                  return (
                    <div key={bid.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-gray-900 block">🚛 {t?.name || bid.transporterId}</span>
                        <span className="text-gray-500 font-mono">
                          Rate: <strong>₹{bid.ratePerQuintalKm}/qtl-km</strong> • Trip Est: ₹{bid.estimatedCost.toLocaleString()}
                        </span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                        bid.status === 'awarded' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {bid.status === 'awarded' ? '🏆 AWARDED (LOWEST)' : bid.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}