'use client';

import { useEffect } from 'react';
import { useSviAuthStore } from '@/store/sviAuthStore';
import SviLoginModal from '@/components/svi/SviLoginModal';

export default function SviLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, checkExpiration } = useSviAuthStore();

  useEffect(() => {
    checkExpiration();
  }, []);

  return (
    <>
      <SviLoginModal open={!isAuthenticated} />
      {isAuthenticated ? children : null}
    </>
  );
}
