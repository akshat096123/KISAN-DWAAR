import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import Home from './portal/home';
import LoginPage from './portal/login';
import FarmerPortal from './portal/farmer';
import BuyerPortal from './portal/buyer';
import TransporterPortal from './portal/transporter';
import GovernmentPortal from './portal/government';
import IVRPortal from './portal/ivr';
import QRDemo from './portal/qr-demo';

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/farmer" element={<FarmerPortal />} />
        <Route path="/buyer" element={<BuyerPortal />} />
        <Route path="/transporter" element={<TransporterPortal />} />
        <Route path="/government" element={<GovernmentPortal />} />
        <Route path="/ivr" element={<IVRPortal />} />
        <Route path="/qr-demo" element={<QRDemo />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
