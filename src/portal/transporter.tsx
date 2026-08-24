import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { IDelivery } from '../types';
import { api } from '../services/api';
import QRCodeGenerator from '../components/QRCodeGenerator';
import { 
  Truck, 
  Gavel, 
  CheckCircle2, 
  Clock, 
  Navigation,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function TransporterPortal() {
  const { state, refreshState } = useAppContext();

  // Active Transporter
  const [selectedTransporterId, setSelectedTransporterId] = useState<string>(state.transporters[0]?.id || 'transporter-001');
  const transporter = state.transporters.find(t => t.id === selectedTransporterId) || state.transporters[0];

  // Pools requiring transport (confirmed pools)
  const confirmedPools = state.pools.filter(p => p.status === 'confirmed');

  // Bids placed by this transporter
  const myBids = state.transportBids.filter(b => b.transporterId === transporter?.id);

  // Single-Round Bidding Form State
  const [biddingPoolId, setBiddingPoolId] = useState<string | null>(null);
  const [bidRate, setBidRate] = useState<string>('2.40');
  const [bidDistance, setBidDistance] = useState<string>('120');
  const [notification, setNotification] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Active Transit Simulation state for selected delivery
  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(state.deliveries[0]?.id || null);
  const activeDelivery = state.deliveries.find(d => d.id === activeDeliveryId);

  const handlePlaceSingleBid = async (poolId: string) => {
    if (!transporter) return;
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await api.transporters.submitBid({
        poolId,
        transporterId: transporter.id,
        ratePerQuintalKm: Number(bidRate),
        estimatedDistance: Number(bidDistance),
      });

      if (res.isWinner) {
        setNotification(`🎉 Single-round bid of ₹${bidRate}/qtl-km placed! Your quote is lowest — Job awarded to ${transporter.name} in database!`);
        if (res.delivery) {
          setActiveDeliveryId(res.delivery.id);
        }
      } else {
        setNotification(`✅ Single-round sealed bid of ₹${bidRate}/qtl-km submitted into database ledger.`);
      }

      await refreshState();
      setBiddingPoolId(null);
    } catch (err: any) {
      console.error('Bid submission error:', err);
      setErrorMessage(err.message || 'Failed to submit transport bid.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setNotification(null), 6000);
    }
  };

  const handleUpdateDeliveryStatus = async (deliveryId: string, nextStatus: IDelivery['status']) => {
    setErrorMessage(null);
    try {
      await api.deliveries.updateStatus(deliveryId, nextStatus);
      setNotification(`🚛 Delivery status updated to: ${nextStatus.toUpperCase()} in database.`);
      await refreshState();
    } catch (err: any) {
      console.error('Delivery status update failed:', err);
      setErrorMessage(err.message || 'Failed to update delivery status.');
    } finally {
      setTimeout(() => setNotification(null), 4000);
    }
  };

  if (!transporter) return <div className="p-8 text-center text-gray-600">No transporters loaded.</div>;

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

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800 rounded flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" />
                Verified Commercial Carrier
              </span>
              <span className="text-xs text-gray-500 font-mono">Vehicle: {transporter.vehicleNumber}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gov-darkest mt-1 flex items-center gap-2">
              🚛 {transporter.name}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Vehicle: {transporter.vehicleType} • Rating: ⭐ {transporter.rating} • Phone: {transporter.phone}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <span className="text-xs text-gray-500 block">Switch Transporter Profile</span>
              <select
                value={selectedTransporterId}
                onChange={(e) => setSelectedTransporterId(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-gray-50 font-medium"
              >
                {state.transporters.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded-xl flex items-center gap-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-sm font-medium">{notification}</span>
          </div>
        )}

        {/* Rule Reminder Banner */}
        <div className="bg-gradient-to-r from-gov-dark to-gov-darkest text-white p-4 rounded-xl flex items-center justify-between gap-4 text-xs sm:text-sm shadow-sm">
          <div className="flex items-center gap-3">
            <Gavel className="w-5 h-5 text-gov-gold shrink-0" />
            <span>
              <strong>Single-Round Sealed Reverse Auction Rule:</strong> Transporters submit a single rate quote per pool. 
              <strong> You cannot counter-bid if outbid.</strong> Lowest qualified bid is awarded the haulage contract.
            </span>
          </div>
          <span className="hidden md:inline-block px-2.5 py-1 bg-white/10 rounded font-mono text-xs text-gov-gold">
            Pan-India Fair Freight Protocol
          </span>
        </div>

        {/* Active Pools for Transport Bidding */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gov-darkest flex items-center gap-2">
                <Gavel className="w-5 h-5 text-amber-600" />
                Available Pools For Single-Round Bidding ({confirmedPools.length})
              </h2>
              <p className="text-xs text-gray-500">
                Pools with 100% farmer quorum ready for rural village pickups & warehouse delivery.
              </p>
            </div>
          </div>

          {confirmedPools.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="font-medium">No confirmed pools currently awaiting transport.</p>
              <p className="text-xs text-gray-400 mt-1">When farmers accept offers to satisfy quorum, pools appear here for bidding.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {confirmedPools.map(pool => {
                const demand = state.demands.find(d => d.id === pool.demandId);
                const hasMyBid = myBids.find(b => b.poolId === pool.id);
                const poolBids = state.transportBids.filter(b => b.poolId === pool.id);
                const awardedBid = poolBids.find(b => b.status === 'awarded');

                return (
                  <div key={pool.id} className="border border-gray-200 rounded-xl p-5 hover:border-amber-500 transition-all bg-white flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="font-bold text-base text-gov-darkest capitalize">
                          🌾 {demand?.crop || 'Crop'} Logistics Lot
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          awardedBid ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {awardedBid ? 'AWARDED' : 'AUCTION OPEN'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-lg mb-4">
                        <div>
                          <span className="text-gray-500 block">Total Weight:</span>
                          <span className="font-bold font-mono text-gray-900 text-sm">
                            {pool.totalQuantity.toLocaleString()} kg ({pool.totalQuantity / 100} Qtl)
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Farmer Pickup Stops:</span>
                          <span className="font-bold text-gray-900">{pool.farmers.length} Villages</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500 block">Delivery Destination:</span>
                          <span className="font-medium text-gray-900 truncate block">
                            {typeof demand?.deliveryLocation === 'object' ? demand.deliveryLocation.address : 'Central Warehouse Depot'}
                          </span>
                        </div>
                      </div>

                      {/* Bidding status */}
                      {hasMyBid ? (
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs mb-4">
                          <div className="flex justify-between font-bold text-amber-900">
                            <span>Your Submitted Single Quote:</span>
                            <span className="font-mono">₹{hasMyBid.ratePerQuintalKm}/qtl-km</span>
                          </div>
                          <div className="flex justify-between text-gray-600 mt-1">
                            <span>Total Estimated Payout: ₹{hasMyBid.estimatedCost.toLocaleString()}</span>
                            <span className="font-semibold text-amber-800 capitalize">Status: {hasMyBid.status}</span>
                          </div>
                          <p className="text-[11px] text-amber-700 mt-1 italic">
                            🔒 Non-editable single bid recorded in audit trail.
                          </p>
                        </div>
                      ) : (
                        biddingPoolId === pool.id ? (
                          <div className="bg-amber-50/70 border border-amber-300 p-4 rounded-xl space-y-3 mb-4">
                            <h4 className="font-bold text-xs text-amber-900 uppercase tracking-wider">
                              Submit Final Single-Round Quote
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                  Rate (₹ / Quintal-km)
                                </label>
                                <input
                                  type="number"
                                  step={0.1}
                                  value={bidRate}
                                  onChange={(e) => setBidRate(e.target.value)}
                                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                  Est. Route Distance (km)
                                </label>
                                <input
                                  type="number"
                                  value={bidDistance}
                                  onChange={(e) => setBidDistance(e.target.value)}
                                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm font-mono"
                                />
                              </div>
                            </div>
                            <div className="text-xs text-gray-700 font-medium">
                              Estimated Job Freight: <strong>₹{Math.round(Number(bidRate) * Number(bidDistance) * (pool.totalQuantity / 100)).toLocaleString()}</strong>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                onClick={() => setBiddingPoolId(null)}
                                disabled={isSubmitting}
                                className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded font-semibold"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handlePlaceSingleBid(pool.id)}
                                disabled={isSubmitting}
                                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs rounded font-bold shadow flex items-center gap-1.5"
                              >
                                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                <span>{isSubmitting ? 'Submitting...' : 'Confirm Sealed Bid'}</span>
                              </button>
                            </div>
                          </div>
                        ) : null
                      )}
                    </div>

                    {!hasMyBid && !awardedBid && biddingPoolId !== pool.id && (
                      <button
                        onClick={() => setBiddingPoolId(pool.id)}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Gavel className="w-3.5 h-3.5" />
                        <span>Place Single-Round Quote</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Delivery Execution & QR Cargo Manifest */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-100 gap-2">
            <div>
              <h2 className="text-xl font-bold text-gov-darkest flex items-center gap-2">
                <Navigation className="w-5 h-5 text-gov-primary" />
                Live Freight Transit & Delivery Manifest
              </h2>
              <p className="text-xs text-gray-500">
                Driver waypoint check-in, weighbridge logging & inspector QR code generation.
              </p>
            </div>

            {state.deliveries.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Select Manifest:</span>
                <select
                  value={activeDeliveryId || ''}
                  onChange={(e) => setActiveDeliveryId(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-gray-50 font-mono font-medium"
                >
                  {state.deliveries.map(d => (
                    <option key={d.id} value={d.id}>{d.id} ({d.status.toUpperCase()})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {activeDelivery ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Transit Progression Steps */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between bg-gov-surface p-4 rounded-xl border border-gray-200">
                  <div>
                    <span className="text-xs text-gray-500">Manifest ID</span>
                    <h3 className="font-mono font-bold text-lg text-gov-darkest">{activeDelivery.id}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 block">Current Status</span>
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                      activeDelivery.status === 'delivered' || activeDelivery.status === 'verified'
                        ? 'bg-green-100 text-green-800'
                        : activeDelivery.status === 'in_transit'
                        ? 'bg-yellow-100 text-yellow-800 animate-pulse'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {activeDelivery.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Multi-Farmer Pickup Stops Checkpoints */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    Pickup Stops & Farmer Loading Verification
                  </h4>

                  {activeDelivery.pickupLocations.map((stop, idx) => (
                    <div key={idx} className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-gov-primary text-white font-bold flex items-center justify-center text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 block">{stop.location}</span>
                          <span className="text-gray-500 text-[11px]">Farmer ID: {stop.farmerId}</span>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className="font-bold text-gray-900">{stop.weight} kg</span>
                        <span className="text-[11px] text-emerald-600 block">✓ Loaded</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Transit Controls Simulator */}
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    Simulate Live Transit Progression
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleUpdateDeliveryStatus(activeDelivery.id, 'picked_up')}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow"
                    >
                      1. Picked Up All Farms
                    </button>
                    <button
                      onClick={() => handleUpdateDeliveryStatus(activeDelivery.id, 'in_transit')}
                      className="px-3.5 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold rounded-lg transition-colors shadow"
                    >
                      2. In-Transit (Highway GPS)
                    </button>
                    <button
                      onClick={() => handleUpdateDeliveryStatus(activeDelivery.id, 'delivered')}
                      className="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors shadow"
                    >
                      3. Arrived at Warehouse
                    </button>
                  </div>
                </div>
              </div>

              {/* QR Cargo Manifest Card for Government Official */}
              <div className="lg:col-span-4 bg-gray-50 p-6 rounded-2xl border border-gray-200 text-center space-y-4">
                <div>
                  <span className="text-xs uppercase font-bold text-gov-primary tracking-wider">
                    Government Inspection Pass
                  </span>
                  <h3 className="font-bold text-gov-darkest text-base mt-0.5">
                    Delivery QR Manifest
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Present to the Government Mandi Inspector at the destination warehouse to scan and release Escrow.
                  </p>
                </div>

                {/* QR Code */}
                <div className="p-4 bg-white rounded-xl border border-gray-200 inline-block shadow-sm">
                  <QRCodeGenerator value={activeDelivery.id} size={160} />
                </div>

                <div className="text-xs font-mono bg-white p-3 rounded-lg border border-gray-200 space-y-1 text-left">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Delivery ID:</span>
                    <strong className="text-gray-900">{activeDelivery.id}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gross Weight:</span>
                    <strong className="text-gray-900">{activeDelivery.actualWeight} kg</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Transporter:</span>
                    <span className="text-gray-900 truncate">{transporter.vehicleNumber}</span>
                  </div>
                </div>

                <a
                  href="/government"
                  className="block w-full py-2.5 bg-gov-saffron hover:bg-orange-600 text-white font-bold text-xs rounded-lg shadow transition-colors"
                >
                  Verify on Government Inspector Portal →
                </a>
              </div>

            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No active delivery manifests found.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}