export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // Forzar siempre modo claro en la pantalla de login
    <div className="light" data-theme="light" style={{ colorScheme: 'light' }}>
      {children}
    </div>
  );
}
