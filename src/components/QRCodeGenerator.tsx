// QR code rendering component using qrcode.react

import { QRCodeCanvas } from 'qrcode.react';

type QRCodeGeneratorProps = {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
};

export const QRCodeGenerator = ({
  value,
  size = 128,
  bgColor = '#FFFFFF',
  fgColor = '#000000',
}: QRCodeGeneratorProps) => {
  return (
    <QRCodeCanvas
      value={value}
      size={size}
      bgColor={bgColor}
      fgColor={fgColor}
    />
  );
};

export default QRCodeGenerator;
