import React from 'react';
import HomeScreen from './HomeScreen';

export default function StatusScreen({ hasWA, hasWAB }) {
  return <HomeScreen variant="whatsapp" hasWA={hasWA} hasWAB={hasWAB} />;
}
