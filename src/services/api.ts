import axios from 'axios';
import {
  IFarmer,
  IBuyer,
  ITransporter,
  IDemand,
  IPool,
  IOffer,
  ITransportBid,
  IEscrowAccount,
  IDelivery,
  IAuditLog,
  ICallLog,
  CropType,
  Grade,
  OfferStatus,
  DeliveryStatus,
  UserRole,
  ICandidateCombination,
  IFairPrice,
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '') + '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Response interceptor for consistent error extraction
client.interceptors.response.use(
  response => response,
  error => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected network error occurred';
    return Promise.reject(new Error(message));
  }
);

export const api = {
  // Global State Sync
  state: {
    getGlobalState: async () => {
      const res = await client.get<{
        farmers: IFarmer[];
        buyers: IBuyer[];
        demands: IDemand[];
        pools: IPool[];
        transporters: ITransporter[];
        offers: IOffer[];
        transportBids: ITransportBid[];
        deliveries: IDelivery[];
        escrows: IEscrowAccount[];
        auditLogs: IAuditLog[];
        callLogs: ICallLog[];
      }>('/state');
      return res.data;
    },
  },

  // Auth
  auth: {
    login: async (role: UserRole, id?: string, name?: string, aadhaarOrMobile?: string) => {
      const res = await client.post('/auth/login', { role, id, name, aadhaarOrMobile });
      return res.data;
    },
  },

  // Farmers
  farmers: {
    getAll: async () => {
      const res = await client.get<IFarmer[]>('/farmers');
      return res.data;
    },
    getById: async (id: string) => {
      const res = await client.get<IFarmer>(`/farmers/${id}`);
      return res.data;
    },
    register: async (farmerData: {
      aadhaarNumber: string;
      name: string;
      phone: string;
      email?: string;
      landSize?: number;
      village?: string;
      district?: string;
      state?: string;
      bankAccount?: string;
      bankIfsc?: string;
      bankVpa?: string;
      cropType?: CropType;
      cropQuantity?: number;
      cropMinDemandPrice?: number;
      cropGrade?: Grade;
      registeredByOfficialId?: string;
      preferredLanguage?: string;
    }) => {
      const res = await client.post<{ success: boolean; message: string; farmer: IFarmer }>('/farmers', farmerData);
      return res.data;
    },
    addCropInventory: async (
      farmerId: string,
      cropData: {
        crop: CropType;
        availableQuantity: number;
        minPricePerKg: number;
        grade: Grade;
        registeredByOfficialId?: string;
      }
    ) => {
      const res = await client.post<{ success: boolean; message: string; farmer: IFarmer; inventory: any }>(
        `/farmers/${farmerId}/inventory`,
        cropData
      );
      return res.data;
    },
  },

  // Buyers & Demands
  buyers: {
    getAll: async () => {
      const res = await client.get<IBuyer[]>('/buyers');
      return res.data;
    },
    register: async (buyerData: {
      organizationName: string;
      taxId: string;
      aadhaarNumber?: string;
      contactPerson?: string;
      phone: string;
      email?: string;
      address?: string;
      registeredByOfficialId?: string;
    }) => {
      const res = await client.post<{ success: boolean; message: string; buyer: IBuyer }>('/buyers', buyerData);
      return res.data;
    },
    getDemands: async () => {
      const res = await client.get<IDemand[]>('/buyers/demands');
      return res.data;
    },
    postDemand: async (demandData: {
      buyerId: string;
      crop: CropType;
      quantity: number;
      maxPricePerKg: number;
      pricePerKg?: number;
      unit?: string;
      deliveryAddress?: string;
      deliveryDeadline?: string;
      grade?: Grade;
    }) => {
      const res = await client.post<{ success: boolean; message: string; demand: IDemand }>('/buyers/demands', demandData);
      return res.data;
    },
  },

  // Transporters & Bids
  transporters: {
    getAll: async () => {
      const res = await client.get<ITransporter[]>('/transporters');
      return res.data;
    },
    register: async (transporterData: {
      aadhaarNumber: string;
      name: string;
      phone: string;
      vehicleType?: string;
      vehicleNumber: string;
      license?: string;
      hasSmartphone?: boolean;
      registeredByOfficialId?: string;
    }) => {
      const res = await client.post<{ success: boolean; message: string; transporter: ITransporter }>(
        '/transporters',
        transporterData
      );
      return res.data;
    },
    getBids: async () => {
      const res = await client.get<ITransportBid[]>('/transporters/bids');
      return res.data;
    },
    submitBid: async (bidData: {
      poolId: string;
      transporterId: string;
      ratePerQuintalKm: number;
      estimatedDistance?: number;
    }) => {
      const res = await client.post<{
        success: boolean;
        message: string;
        isWinner: boolean;
        bid: ITransportBid;
        delivery?: IDelivery;
      }>('/transporters/bids', bidData);
      return res.data;
    },
  },

  // Combinations
  combinations: {
    search: async (params: {
      crop: CropType;
      quantity: number;
      maxPricePerKg: number;
      grade?: Grade;
      deliveryAddress?: string;
      deliveryDeadline?: string;
      buyerId?: string;
    }) => {
      const res = await client.post<{ success: boolean; count: number; combinations: ICandidateCombination[] }>(
        '/combinations/search',
        params
      );
      return res.data;
    },
    lockDeal: async (dealData: {
      buyerId: string;
      crop: CropType;
      quantity: number;
      maxPricePerKg: number;
      grade?: Grade;
      deliveryAddress?: string;
      deliveryDeadline?: string;
      combination: ICandidateCombination;
    }) => {
      const res = await client.post<{
        success: boolean;
        message: string;
        deal: {
          demandId: string;
          pool: IPool;
          offers: IOffer[];
          escrow: IEscrowAccount;
        };
      }>('/combinations/deal', dealData);
      return res.data;
    },
  },

  // Pools & Offers
  pools: {
    getAll: async () => {
      const res = await client.get<IPool[]>('/pools');
      return res.data;
    },
    getOffers: async () => {
      const res = await client.get<IOffer[]>('/pools/offers');
      return res.data;
    },
    updateOfferStatus: async (offerId: string, status: OfferStatus, callbackScheduledAt?: string) => {
      const res = await client.patch<{
        success: boolean;
        message: string;
        offerId: string;
        status: OfferStatus;
        poolStatus?: string;
      }>(`/pools/offers/${offerId}`, { status, callbackScheduledAt });
      return res.data;
    },
  },

  // Deliveries & QR Verification
  deliveries: {
    getAll: async () => {
      const res = await client.get<IDelivery[]>('/deliveries');
      return res.data;
    },
    verify: async (
      deliveryId: string,
      payload: {
        officialId?: string;
        actualWeight?: number;
        inspectorNotes?: string;
        signature?: string;
      }
    ) => {
      const res = await client.post<{
        success: boolean;
        message: string;
        delivery: IDelivery;
        escrowReleased: boolean;
      }>(`/deliveries/${deliveryId}/verify`, payload);
      return res.data;
    },
    updateStatus: async (deliveryId: string, status: DeliveryStatus, actualWeight?: number) => {
      const res = await client.patch<{
        success: boolean;
        message: string;
        deliveryId: string;
        status: DeliveryStatus;
      }>(`/deliveries/${deliveryId}/status`, { status, actualWeight });
      return res.data;
    },
  },

  // Escrows
  escrows: {
    getAll: async () => {
      const res = await client.get<IEscrowAccount[]>('/escrows');
      return res.data;
    },
    release: async (escrowId: string, releaseReason?: string, officialId?: string) => {
      const res = await client.post<{
        success: boolean;
        message: string;
        escrow: IEscrowAccount;
      }>(`/escrows/${escrowId}/release`, { releaseReason, officialId });
      return res.data;
    },
  },

  // Pricing
  pricing: {
    getFairPrice: async (crop: CropType, location: string, grade: string = 'A') => {
      const res = await client.get<IFairPrice>('/pricing/fair-price', {
        params: { crop, location, grade },
      });
      return res.data;
    },
    getMandiRates: async () => {
      const res = await client.get<{
        mspBenchmarks: Record<CropType, number>;
        nationalAverages: Record<CropType, number>;
        regionalPrices: Record<string, Partial<Record<CropType, number>>>;
      }>('/pricing/mandi-rates');
      return res.data;
    },
    getRegions: async () => {
      const res = await client.get<string[]>('/pricing/regions');
      return res.data;
    },
  },

  // Audit Logs
  audit: {
    getLogs: async (params?: { action?: string; userId?: string; entityType?: string; limit?: number }) => {
      const res = await client.get<IAuditLog[]>('/audit-logs', { params });
      return res.data;
    },
    log: async (logData: {
      action: string;
      userId: string;
      entityType: string;
      entityId: string;
      details?: Record<string, unknown>;
      ipHash?: string;
    }) => {
      const res = await client.post<{ success: boolean; id: string; timestamp: string }>('/audit-logs', logData);
      return res.data;
    },
  },

  // IVR
  ivr: {
    getLogs: async () => {
      const res = await client.get<ICallLog[]>('/ivr/logs');
      return res.data;
    },
    logCall: async (callData: Partial<ICallLog>) => {
      const res = await client.post<{ success: boolean; message: string; callId: string }>('/ivr/logs', callData);
      return res.data;
    },
    broadcast: async (poolId: string, customMessage?: string) => {
      const res = await client.post<{
        success: boolean;
        message: string;
        poolId: string;
        transportersContacted: number;
        calls: any[];
      }>('/ivr/broadcast', { poolId, customMessage });
      return res.data;
    },
  },
};

export default api;
