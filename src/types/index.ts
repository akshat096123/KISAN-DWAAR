export type Language = 'en' | 'hi';

export const LANGUAGES: Record<Language, { name: string; native: string; flag: string }> = {
  en: { name: 'English', native: 'English', flag: '🇬🇧' },
  hi: { name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
};

export type UserRole = 'farmer' | 'buyer' | 'transporter' | 'government';

export type CropType = 'wheat' | 'rice' | 'moong' | 'masoor' | 'urad' | 'chana' | 'jau' | 'bajra' | 'makai' | 'jowar';

export type Grade = 'A' | 'B' | 'C' | 'Premium';

export type PoolStatus = 'forming' | 'confirmed' | 'failed' | 'delivered' | 'paid';

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'callback-requested';

export type TransporterBidStatus = 'submitted' | 'awarded' | 'declined';

export type DeliveryStatus = 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'quality_check' | 'verified' | 'paid' | 'failed';

export type EscrowStatus = 'held' | 'released';

export type AuditActionType = 
  | 'user_registered_by_govt'
  | 'crop_harvest_registered_by_govt'
  | 'demands_posted'
  | 'combination_deal_locked'
  | 'offer_made'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'offer_callback_requested'
  | 'pool_formed'
  | 'transporter_call_broadcasted'
  | 'transport_bid_placed'
  | 'transport_bid_won'
  | 'payment_escrow_locked'
  | 'delivery_picked_up'
  | 'delivery_in_transit'
  | 'delivery_verified'
  | 'payment_released'
  | 'escrow_funded'
  | 'escrow_released';

export interface IFarmerCropInventory {
  crop: CropType;
  availableQuantity: number;
  minPricePerKg: number;
  grade: Grade;
  registeredByOfficialId: string;
  registeredAt: string;
}

export interface IFarmer {
  id: string;
  aadhaarNumber: string;
  name: string;
  phone: string;
  email?: string;
  identityVerified: boolean;
  registeredByOfficialId: string;
  landSize: number;
  crops: CropType[];
  inventory: IFarmerCropInventory[];
  location: {
    village: string;
    district: string;
    state: string;
    coordinates: [number, number];
  };
  bankDetails?: {
    vpa: string;
    accountNumber: string;
    ifsc: string;
  };
  preferredLanguage: Language;
  createdAt: string;
  isActive: boolean;
}

export interface IBuyer {
  id: string;
  aadhaarNumber?: string;
  organizationName: string;
  taxId: string;
  creditLimit: number;
  creditUsed: number;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  registeredByOfficialId: string;
  location: {
    address: string;
    coordinates: [number, number];
  };
  contactPerson: string;
  phone: string;
  email: string;
  createdAt: string;
  isActive: boolean;
}

export interface ITransporter {
  id: string;
  aadhaarNumber: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehicleNumber: string;
  license?: string;
  rating: number;
  hasSmartphone: boolean;
  registeredByOfficialId: string;
  isActive: boolean;
  createdAt: string;
}

export interface IMandiPrice {
  crop: CropType;
  market: string;
  state: string;
  price: number;
  grade: Grade;
  date: string;
  unit: string;
}

export interface IMSPData {
  crop: CropType;
  state: string;
  msp: number;
  date: string;
}

export interface IFairPrice {
  crop: CropType;
  location: string;
  fairPrice: number;
  mandiPrice: number;
  msp: number;
  confidence: number;
  reason: string;
}

export interface IDemand {
  id: string;
  buyerId: string;
  crop: CropType;
  quantity: number;
  maxPricePerKg: number;
  pricePerKg: number;
  unit: string;
  deliveryLocation: {
    address: string;
    coordinates: [number, number];
  };
  deliveryDeadline: string;
  grade: Grade;
  selectedCombinationId?: string;
  status: 'active' | 'matched' | 'shipped' | 'delivered' | 'closed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface ICandidateCombination {
  id: string;
  farmers: Array<{
    farmer: IFarmer;
    allocatedKg: number;
    minPricePerKg: number;
  }>;
  totalQuantity: number;
  avgPricePerKg: number;
  totalCost: number;
  pickupVillages: string[];
  estimatedDistanceKm: number;
}

export interface IOffer {
  id: string;
  farmerId: string;
  poolId: string;
  demandId: string;
  crop: CropType;
  quantity: number;
  pricePerKg: number;
  status: OfferStatus;
  callbackScheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IPool {
  id: string;
  demandId: string;
  farmers: string[];
  totalQuantity: number;
  committedQuantity: number;
  pricePerKg: number;
  status: PoolStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ITransportBid {
  id: string;
  poolId: string;
  transporterId: string;
  quantity: number;
  ratePerQuintalKm: number;
  estimatedDistance: number;
  estimatedCost: number;
  status: TransporterBidStatus;
  submittedAt: string;
  awardedAt?: string;
}

export interface IDelivery {
  id: string;
  poolId: string;
  transporterId: string;
  pickupLocations: Array<{
    farmerId: string;
    location: string;
    quantity: number;
    photoUrl?: string;
    weight: number;
    timestamp: string;
  }>;
  deliveryLocation: {
    address: string;
    coordinates: [number, number];
  };
  deliveryPhoto?: string;
  actualWeight: number;
  deliveredAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationSignature?: string;
  status: DeliveryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IEscrowAccount {
  id: string;
  poolId: string;
  buyerId: string;
  totalAmount: number;
  platformFee: number;
  farmersShare: number;
  transporterShare: number;
  status: EscrowStatus;
  lockedAt: string;
  releasedAt?: string;
  releaseReason: 'delivery_verified' | 'dispute' | 'cancelled';
}

export interface IAuditLog {
  id: string;
  timestamp: string;
  action: AuditActionType;
  userId: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  ipHash?: string;
}

export interface ICallLog {
  id: string;
  phone: string;
  type: 'farmer' | 'transporter';
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'missed' | 'busy' | 'failed';
  duration: number;
  recordingUrl?: string;
  dtmf?: string[];
  outcome?: OfferStatus | 'accept' | 'reject' | 'rate_submitted' | 'decline';
  language: Language;
  timestamp: string;
}