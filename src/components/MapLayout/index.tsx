import { ReactNode } from 'react';
import MapProvider from 'src/contexts/map.context';
import HoverCellOverview from './HoverCellOverview';

interface TProps {
  children: ReactNode;
}

export default function MapLayout({ children }: TProps) {
  return (
    <MapProvider>
      <HoverCellOverview />
      {children}
    </MapProvider>
  );
}
