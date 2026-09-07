/* React import removed for JSX runtime */
import { Link } from 'react-router-dom';
import QRCodeGenerator from '../components/QRCodeGenerator';

export default function QRDemo() {
  const sampleEscrowId = 'ESCROW-123456';
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">QR Code Demo</h2>
      <QRCodeGenerator value={sampleEscrowId} size={200} />
      <p className="mt-4">Escrow ID: {sampleEscrowId}</p>
      <Link to="/" className="text-gov-primary hover:underline mt-4 block">
        Back to Home
      </Link>
    </div>
  );
}
