import React from 'react';
import ImmersiveReader from '../components/ImmersiveReader/ImmersiveReader';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ImmersiveReader />
    </>
  );
}
