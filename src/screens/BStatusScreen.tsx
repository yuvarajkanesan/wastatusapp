import React from 'react';
import HomeScreen from './HomeScreen';

export default function BStatusScreen({ hasWA, hasWAB }) {
  return <HomeScreen variant="business" hasWA={hasWA} hasWAB={hasWAB} />;
}
