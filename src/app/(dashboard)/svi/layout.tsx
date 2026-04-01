'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSviAuthStore } from '@/store/sviAuthStore';
import SviLoginModal from '@/components/svi/SviLoginModal';

export default function SviLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, checkExpiration } = useSviAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkExpiration();
  }, []);

  return (
    <>
      <SviLoginModal
        open={!isAuthenticated}
        onClose={() => router.push('/dashboard')}
      />
      {isAuthenticated ? children : null}
    </>
  );
}