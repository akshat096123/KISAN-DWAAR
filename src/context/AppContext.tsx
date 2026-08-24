import React, { createContext, useReducer, useContext, useEffect, ReactNode, useState, useCallback } from 'react';
import { 
  IFarmer, 
  IBuyer, 
  IDemand, 
  IPool, 
  ITransporter, 
  IOffer, 
  ITransportBid, 
  IEscrowAccount, 
  IAuditLog, 
  ICallLog, 
  IDelivery,
  Language,
  UserRole,
  IFarmerCropInventory
} from '../types';
import { 
  farmers as seedFarmers, 
  buyers as seedBuyers, 
  demands as seedDemands, 
  pools as seedPools, 
  transporters as seedTransporters,
  offers as seedOffers,
  transportBids as seedTransportBids,
  escrows as seedEscrows,
  deliveries as seedDeliveries,
  callLogs as seedCallLogs,
  auditLogs as seedAuditLogs
} from '../data/seedData';
import { api } from '../services/api';

// ---------- State Shape ----------
export interface AppState {
  farmers: IFarmer[];
  buyers: IBuyer[];
  demands: IDemand[];
  pools: IPool[];
  transporters: ITransporter[];
  offers: IOffer[];
  transportBids: ITransportBid[];
  escrows: IEscrowAccount[];
  auditLogs: IAuditLog[];
  callLogs: ICallLog[];
  deliveries: IDelivery[];
}

export interface AuthSession {
  role: UserRole;
  id: string;
  name: string;
  phone?: string;
  aadhaar?: string;
}

// ---------- Actions ----------
export type Action =
  | { type: 'SET_INITIAL_STATE'; payload: AppState }
  | { type: 'RESET_STATE' }
  | { type: 'ADD_FARMER'; payload: IFarmer }
  | { type: 'ADD_FARMER_CROP'; payload: { farmerId: string; inventory: IFarmerCropInventory } }
  | { type: 'ADD_BUYER'; payload: IBuyer }
  | { type: 'ADD_TRANSPORTER'; payload: ITransporter }
  | { type: 'ADD_DEMAND'; payload: IDemand }
  | { type: 'UPDATE_DEMAND_STATUS'; payload: { id: string; status: IDemand['status'] } }
  | { type: 'ADD_OFFER'; payload: IOffer }
  | { type: 'UPDATE_OFFER_STATUS'; payload: { id: string; status: IOffer['status'] } }
  | { type: 'ADD_POOL'; payload: IPool }
  | { type: 'UPDATE_POOL_STATUS'; payload: { id: string; status: IPool['status'] } }
  | { type: 'UPDATE_POOL_COMMITTED'; payload: { id: string; committedQuantity: number; status?: IPool['status'] } }
  | { type: 'ADD_BID'; payload: ITransportBid }
  | { type: 'AWARD_BID'; payload: { id: string } }
  | { type: 'ADD_ESCROW'; payload: IEscrowAccount }
  | { type: 'RELEASE_ESCROW'; payload: { id: string; releaseReason: IEscrowAccount['releaseReason'] } }
  | { type: 'ADD_AUDIT_LOG'; payload: IAuditLog }
  | { type: 'ADD_CALL_LOG'; payload: ICallLog }
  | { type: 'ADD_DELIVERY'; payload: IDelivery }
  | { type: 'UPDATE_DELIVERY_STATUS'; payload: { id: string; status: IDelivery['status']; actualWeight?: number; verificationSignature?: string; verifiedAt?: string } }
  | { type: 'UPDATE_FARMER'; payload: IFarmer };

export const defaultSeededState: AppState = {
  farmers: seedFarmers,
  buyers: seedBuyers,
  demands: seedDemands,
  pools: seedPools,
  transporters: seedTransporters,
  offers: seedOffers,
  transportBids: seedTransportBids,
  escrows: seedEscrows,
  deliveries: seedDeliveries,
  callLogs: seedCallLogs,
  auditLogs: seedAuditLogs,
};

// ---------- Reducer ----------
function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_INITIAL_STATE':
      return action.payload;
    case 'RESET_STATE':
      return defaultSeededState;
    case 'ADD_FARMER':
      return { ...state, farmers: [action.payload, ...state.farmers.filter(f => f.id !== action.payload.id)] };
    case 'ADD_FARMER_CROP':
      return {
        ...state,
        farmers: state.farmers.map(f =>
          f.id === action.payload.farmerId
            ? {
                ...f,
                crops: f.crops.includes(action.payload.inventory.crop) ? f.crops : [...f.crops, action.payload.inventory.crop],
                inventory: [action.payload.inventory, ...f.inventory.filter(i => i.crop !== action.payload.inventory.crop)],
              }
            : f
        ),
      };
    case 'ADD_BUYER':
      return { ...state, buyers: [action.payload, ...state.buyers.filter(b => b.id !== action.payload.id)] };
    case 'ADD_TRANSPORTER':
      return { ...state, transporters: [action.payload, ...state.transporters.filter(t => t.id !== action.payload.id)] };
    case 'ADD_DEMAND':
      return { ...state, demands: [action.payload, ...state.demands.filter(d => d.id !== action.payload.id)] };
    case 'UPDATE_DEMAND_STATUS':
      return {
        ...state,
        demands: state.demands.map(d =>
          d.id === action.payload.id ? { ...d, status: action.payload.status, updatedAt: new Date().toISOString() } : d
        ),
      };
    case 'ADD_OFFER':
      return { ...state, offers: [...state.offers.filter(o => o.id !== action.payload.id), action.payload] };
    case 'UPDATE_OFFER_STATUS':
      return {
        ...state,
        offers: state.offers.map(o =>
          o.id === action.payload.id ? { ...o, status: action.payload.status, updatedAt: new Date().toISOString() } : o
        ),
      };
    case 'ADD_POOL':
      return { ...state, pools: [action.payload, ...state.pools.filter(p => p.id !== action.payload.id)] };
    case 'UPDATE_POOL_STATUS':
      return {
        ...state,
        pools: state.pools.map(p =>
          p.id === action.payload.id ? { ...p, status: action.payload.status, updatedAt: new Date().toISOString() } : p
        ),
      };
    case 'UPDATE_POOL_COMMITTED':
      return {
        ...state,
        pools: state.pools.map(p =>
          p.id === action.payload.id
            ? {
                ...p,
                committedQuantity: action.payload.committedQuantity,
                status: action.payload.status || p.status,
                updatedAt: new Date().toISOString(),
              }
            : p
        ),
      };
    case 'ADD_BID':
      return { ...state, transportBids: [action.payload, ...state.transportBids.filter(b => b.id !== action.payload.id)] };
    case 'AWARD_BID':
      return {
        ...state,
        transportBids: state.transportBids.map(b =>
          b.id === action.payload.id
            ? { ...b, status: 'awarded' as const, awardedAt: new Date().toISOString() }
            : (b.poolId === state.transportBids.find(x => x.id === action.payload.id)?.poolId ? { ...b, status: 'declined' as const } : b)
        ),
      };
    case 'ADD_ESCROW':
      return { ...state, escrows: [action.payload, ...state.escrows.filter(e => e.id !== action.payload.id)] };
    case 'RELEASE_ESCROW':
      return {
        ...state,
        escrows: state.escrows.map(e =>
          e.id === action.payload.id
            ? { ...e, status: 'released', releasedAt: new Date().toISOString(), releaseReason: action.payload.releaseReason }
            : e
        ),
      };
    case 'ADD_AUDIT_LOG':
      return { ...state, auditLogs: [action.payload, ...state.auditLogs] };
    case 'ADD_CALL_LOG':
      return { ...state, callLogs: [action.payload, ...state.callLogs] };
    case 'ADD_DELIVERY':
      return { ...state, deliveries: [action.payload, ...state.deliveries.filter(d => d.id !== action.payload.id)] };
    case 'UPDATE_DELIVERY_STATUS':
      return {
        ...state,
        deliveries: state.deliveries.map(d =>
          d.id === action.payload.id
            ? { 
                ...d, 
                status: action.payload.status, 
                actualWeight: action.payload.actualWeight !== undefined ? action.payload.actualWeight : d.actualWeight,
                verificationSignature: action.payload.verificationSignature || d.verificationSignature,
                verifiedAt: action.payload.verifiedAt || d.verifiedAt,
                updatedAt: new Date().toISOString() 
              }
            : d
        ),
      };
    case 'UPDATE_FARMER':
      return {
        ...state,
        farmers: state.farmers.map(f =>
          f.id === action.payload.id ? { ...action.payload } : f
        ),
      };
    default:
      return state;
  }
}

// ---------- Context Interface ----------
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  refreshState: () => Promise<void>;
  isLoading: boolean;
  dbConnected: boolean;
  lang: Language;
  setLang: (l: Language) => void;
  currentUser: AuthSession | null;
  login: (role: UserRole, id: string, name: string) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ---------- Provider ----------
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, defaultSeededState);
  const [lang, setLang] = useState<Language>('hi');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbConnected, setDbConnected] = useState<boolean>(false);

  const [currentUser, setCurrentUser] = useState<AuthSession | null>(() => {
    const saved = localStorage.getItem('kisan-dwaar-user');
    return saved ? JSON.parse(saved) : { role: 'government', id: 'GOVT-OFFICER-INSPECTOR-12', name: 'R. K. Verma (Mandi Officer)' };
  });

  // Load authoritative state from SQLite backend
  const refreshState = useCallback(async () => {
    try {
      setIsLoading(true);
      const serverState = await api.state.getGlobalState();
      if (serverState && serverState.farmers && serverState.farmers.length > 0) {
        dispatch({ type: 'SET_INITIAL_STATE', payload: serverState });
        setDbConnected(true);
      } else {
        dispatch({ type: 'SET_INITIAL_STATE', payload: defaultSeededState });
      }
    } catch (err) {
      console.warn('Backend API offline or unreachable; using local cached/seed state.', err);
      setDbConnected(false);
      const stored = localStorage.getItem('kisan-dwaar-state-v3');
      if (stored) {
        try {
          dispatch({ type: 'SET_INITIAL_STATE', payload: JSON.parse(stored) });
        } catch {
          dispatch({ type: 'SET_INITIAL_STATE', payload: defaultSeededState });
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  // Sync to localStorage as client cache fallback
  useEffect(() => {
    try {
      localStorage.setItem('kisan-dwaar-state-v3', JSON.stringify(state));
    } catch (e) {
      console.error('Failed to cache state in localStorage', e);
    }
  }, [state]);

  const login = (role: UserRole, id: string, name: string) => {
    const session = { role, id, name };
    setCurrentUser(session);
    localStorage.setItem('kisan-dwaar-user', JSON.stringify(session));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('kisan-dwaar-user');
  };

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        refreshState,
        isLoading,
        dbConnected,
        lang,
        setLang,
        currentUser,
        login,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
