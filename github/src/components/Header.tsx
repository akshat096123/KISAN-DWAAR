import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  PhoneCall, 
  RotateCcw, 
  User, 
  LogIn, 
  LogOut,
  Globe
} from 'lucide-react';

export const Header: React.FC = () => {
  const { lang, setLang, dbConnected, refreshState, currentUser, logout } = useAppContext();
  const location = useLocation();

  const toggleLanguage = () => {
    setLang(lang === 'hi' ? 'en' : 'hi');
  };

  const navLinks = [
    { path: '/', label: lang === 'hi' ? 'मुख्य पृष्ठ' : 'Home', icon: '🏠' },
    { path: '/farmer', label: lang === 'hi' ? 'किसान' : 'Farmer', icon: '🌾' },
    { path: '/buyer', label: lang === 'hi' ? 'खरीदार' : 'Buyer', icon: '🏢' },
    { path: '/transporter', label: lang === 'hi' ? 'परिवहन' : 'Transporter', icon: '🚛' },
    { path: '/government', label: lang === 'hi' ? 'सरकारी निगरानी' : 'Govt Oversight', icon: '🏛️' },
    { path: '/ivr', label: lang === 'hi' ? 'आईवीआर कॉल' : 'Keypad IVR', icon: '📞' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm font-sans">
      {/* 1. Official Government Topbar */}
      <div className="bg-gov-darkest text-white text-[11px] py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gov-gold">भारत सरकार</span>
            <span className="text-gray-400">|</span>
            <span className="hidden sm:inline text-gray-300">
              {lang === 'hi' ? 'कृषि एवं किसान कल्याण मंत्रालय' : 'Ministry of Agriculture & Farmers Welfare'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-gray-300 text-xs">
            {/* Live Database Status Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/40 border border-white/10 text-[10px]">
              <span className={`w-2 h-2 rounded-full ${dbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span className="font-mono text-gray-200">
                {dbConnected ? 'SQLite DB Online (:5001)' : 'Connecting DB...'}
              </span>
            </div>

            {/* Toll-free Hotline */}
            <div className="flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-gov-gold" />
              <span className="hidden md:inline">{lang === 'hi' ? 'किसान हेल्पलाइन:' : 'Kisan Helpline:'}</span>
              <strong className="text-white font-mono">1800-180-1551</strong>
            </div>

            {/* Refresh DB Sync Button */}
            <button
              onClick={() => refreshState()}
              title="Sync latest records from SQLite database"
              className="text-gray-400 hover:text-white flex items-center gap-1 text-[11px] bg-white/10 px-2 py-0.5 rounded transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Sync DB</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Institutional Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Brand Logo & Emblem */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-gov-primary to-gov-secondary flex items-center justify-center text-white text-xl sm:text-2xl shadow-md group-hover:scale-105 transition-transform border border-gov-primary">
              🌾
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-gov-darkest">
                  KISAN<span className="text-gov-primary">-DWAAR</span>
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-gov-surface border border-gov-primary/30 text-gov-primary font-bold hidden sm:inline">
                  SIH 2026
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                {lang === 'hi' ? 'किसान द्वार • प्रत्यक्ष कृषि विपणन एवं एस्क्रो' : 'Equitable Price Discovery & Integrated Logistics'}
              </p>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-gov-primary text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gov-surface hover:text-gov-primary'
                  }`}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Items: Language Switcher & User Profile/Login */}
          <div className="flex items-center gap-2.5">
            
            {/* Language Toggle Button */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-300 hover:border-gov-primary bg-gray-50 hover:bg-emerald-50 text-xs font-bold text-gray-800 transition-colors shadow-sm"
              title="Toggle Hindi / English"
            >
              <Globe className="w-3.5 h-3.5 text-gov-primary" />
              <span>{lang === 'hi' ? '🇮🇳 हिन्दी (EN)' : '🇬🇧 English (हिन्दी)'}</span>
            </button>

            {/* User Session or Login Button */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <Link
                  to={
                    currentUser.role === 'farmer' ? '/farmer' :
                    currentUser.role === 'buyer' ? '/buyer' :
                    currentUser.role === 'transporter' ? '/transporter' : '/government'
                  }
                  className="px-3 py-1.5 bg-gov-surface border border-gray-200 rounded-xl text-xs font-bold text-gov-darkest flex items-center gap-1.5 hover:border-gov-primary"
                >
                  <User className="w-3.5 h-3.5 text-gov-primary" />
                  <span className="hidden sm:inline max-w-[120px] truncate">{currentUser.name}</span>
                  <span className="text-[10px] uppercase px-1.5 py-0.2 bg-gray-200 text-gray-700 rounded">
                    {currentUser.role}
                  </span>
                </Link>
                <button
                  onClick={logout}
                  title="Logout"
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-2 bg-gov-primary hover:bg-gov-secondary text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{lang === 'hi' ? 'लॉगिन' : 'Login'}</span>
              </Link>
            )}

          </div>
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="lg:hidden flex items-center justify-between overflow-x-auto px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs gap-2">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 flex items-center gap-1 ${
                isActive ? 'bg-gov-primary text-white' : 'text-gray-600 hover:text-black'
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};
