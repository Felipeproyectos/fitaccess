import { Toaster } from "@/components/ui/toaster"
  import { QueryClientProvider } from '@tanstack/react-query'
    import { queryClientInstance } from '@/lib/query-client'
      import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Memberships from './pages/Memberships';
import Payments from './pages/Payments';
import Attendance from './pages/Attendance';
import QRScanner from './pages/QRScanner';
import GymSettings from './pages/GymSettings';
import PublicScreen from './pages/PublicScreen';

// Pantalla de carga personalizada ByteSur
const LoadingScreen = () => (
    <div style={{
          position: 'fixed', inset: 0, background: '#0a0a0a',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    }}>
          <svg width="80" height="80" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="20" y="20" width="60" height="60" rx="8" fill="white"/>
                <rect x="20" y="20" width="15" height="15" fill="#0a0a0a"/>
                <rect x="35" y="20" width="10" height="10" fill="#0a0a0a"/>
                <rect x="20" y="35" width="10" height="10" fill="#0a0a0a"/>
                <line x1="65" y1="50" x2="150" y2="30" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                <circle cx="150" cy="30" r="8" fill="white"/>
                <line x1="65" y1="60" x2="140" y2="70" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                <circle cx="140" cy="70" r="8" fill="white"/>
                <line x1="65" y1="70" x2="130" y2="100" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                <circle cx="130" cy="100" r="8" fill="white"/>
          </svg>svg>
        <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 'bold', marginTop: '20px', letterSpacing: '2px' }}>
              Byte Sur Soluciones Tecnologicas
        </h1>h1>
        <p style={{ color: '#aaa', fontSize: '14px', marginTop: '6px' }}>Sistema FITACCESS - Control de asistencia</p>p>
        <div style={{
            width: '40px', height: '40px', border: '3px solid #333',
            borderTop: '3px solid white', borderRadius: '50%',
            animation: 'spin 1s linear infinite', marginTop: '30px'
    }}/>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>style>
    </div>div>
  );

// Pantalla de Login personalizada ByteSur
const LoginScreen = () => {
    const { navigateToLogin } = useAuth();
    return (
          <div style={{
                  position: 'fixed', inset: 0, background: '#0a0a0a',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <svg width="90" height="90" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <rect x="20" y="20" width="75" height="75" rx="10" fill="white"/>
                                  <rect x="20" y="20" width="18" height="18" fill="#0a0a0a"/>
                                  <rect x="40" y="20" width="12" height="12" fill="#0a0a0a"/>
                                  <rect x="20" y="40" width="12" height="12" fill="#0a0a0a"/>
                                  <line x1="75" y1="50" x2="165" y2="28" stroke="white" strokeWidth="7" strokeLinecap="round"/>
                                  <circle cx="165" cy="28" r="10" fill="white"/>
                                  <line x1="75" y1="65" x2="155" y2="78" stroke="white" strokeWidth="7" strokeLinecap="round"/>
                                  <circle cx="155" cy="78" r="10" fill="white"/>
                                  <line x1="75" y1="80" x2="145" y2="115" stroke="white" strokeWidth="7" strokeLinecap="round"/>
                                  <circle cx="145" cy="115" r="10" fill="white"/>
                        </svg>svg>
                        <h1 style={{ color: 'white', fontSize: '26px', fontWeight: 'bold', margin: '16px 0 4px', letterSpacing: '1px' }}>
                                  Byte Sur Soluciones Tecnologicas
                        </h1>h1>
                        <h2 style={{ color: '#888', fontSize: '15px', fontWeight: 'normal', margin: '0 0 8px' }}>
                                  Sistema FITACCESS &mdash; Control de asistencia
                        </h2>h2>
                        <div style={{ width: '60px', height: '2px', background: 'white', margin: '0 auto' }}/>
                </div>div>
          
                <div style={{
                    background: '#111', border: '1px solid #222', borderRadius: '16px',
                    padding: '36px 40px', width: '340px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
          }}>
                        <p style={{ color: '#aaa', textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
                                  Accede con tu cuenta para continuar
                        </p>p>
                        <button
                                    onClick={() => navigateToLogin()}
                                    style={{
                                                  width: '100%', padding: '14px', background: 'white', color: '#0a0a0a',
                                                  border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold',
                                                  cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.5px'
                                    }}
                                    onMouseOver={e => e.target.style.background = '#e0e0e0'}
                                    onMouseOut={e => e.target.style.background = 'white'}
                                  >
                                  Iniciar Sesion
                        </button>button>
                </div>div>
          
                <div style={{ position: 'fixed', bottom: '20px', textAlign: 'center' }}>
                        <p style={{ color: '#555', fontSize: '12px', margin: 0 }}>
                                  Si deseas un Sistema asi o de otras caracteristicas contactanos
                        </p>p>
                        <p style={{ color: '#555', fontSize: '12px', margin: '2px 0 0' }}>
                                  <a href="https://www.bytesur.cl" style={{ color: '#777', textDecoration: 'none' }}>www.bytesur.cl</a>a>
                          {' '}&nbsp;+56982645747&nbsp;
                                  hecho con carino &#10084; BYTE SUR
                        </p>p>
                </div>div>
          </div>div>
        );
};

const AuthenticatedApp = () => {
    const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  
    if (isLoadingPublicSettings || isLoadingAuth) {
          return <LoadingScreen />;
    }
  
    if (authError) {
          if (authError.type === 'user_not_registered') {
                  return <UserNotRegisteredError />;
          } else if (authError.type === 'auth_required') {
                  return <LoginScreen />;
          }
    }
  
    return (
          <Routes>
                <Route path="/public-screen" element={<PublicScreen />} />
                <Route element={<Layout />}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/clients" element={<Clients />} />
                        <Route path="/memberships" element={<Memberships />} />
                        <Route path="/payments" element={<Payments />} />
                        <Route path="/scanner" element={<QRScanner />} />
                        <Route path="/attendance" element={<Attendance />} />
                        <Route path="/settings" element={<GymSettings />} />
                        <Route path="*" element={<PageNotFound />} />
                </Route>Route>
          </Routes>Routes>
        );
};

function App() {
    return (
          <AuthProvider>
                <QueryClientProvider client={queryClientInstance}>
                        <Router>
                                  <AuthenticatedApp />
                        </Router>Router>
                        <Toaster />
                </QueryClientProvider>QueryClientProvider>
          </AuthProvider>AuthProvider>
        );
}

export default App;</svg>import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Memberships from './pages/Memberships';
import Payments from './pages/Payments';
import Attendance from './pages/Attendance';
import QRScanner from './pages/QRScanner';
import GymSettings from './pages/GymSettings';
import PublicScreen from './pages/PublicScreen';
import Achievements from './pages/Achievements';

const LoadingScreen = () => (
  <div style={{
    position: 'fixed', inset: 0, background: '#0a0a0a',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
  }}>
    <svg width="80" height="80" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="20" width="60" height="60" rx="8" fill="white"/>
      <rect x="20" y="20" width="15" height="15" fill="#0a0a0a"/>
      <rect x="35" y="20" width="10" height="10" fill="#0a0a0a"/>
      <rect x="20" y="35" width="10" height="10" fill="#0a0a0a"/>
      <line x1="65" y1="50" x2="150" y2="30" stroke="white" strokeWidth="6" strokeLinecap="round"/>
      <circle cx="150" cy="30" r="8" fill="white"/>
      <line x1="65" y1="60" x2="140" y2="70" stroke="white" strokeWidth="6" strokeLinecap="round"/>
      <circle cx="140" cy="70" r="8" fill="white"/>
      <line x1="65" y1="70" x2="130" y2="100" stroke="white" strokeWidth="6" strokeLinecap="round"/>
      <circle cx="130" cy="100" r="8" fill="white"/>
    </svg>
    <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 'bold', marginTop: '20px', letterSpacing: '2px' }}>
      Byte Sur Soluciones Tecnologicas
    </h1>
    <p style={{ color: '#aaa', fontSize: '14px', marginTop: '6px' }}>Sistema FITACCESS - Control de asistencia</p>
    <div style={{
      width: '40px', height: '40px', border: '3px solid #333',
      borderTop: '3px solid white', borderRadius: '50%',
      animation: 'spin 1s linear infinite', marginTop: '30px'
    }}/>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const LoginScreen = () => {
  const { navigateToLogin } = useAuth();
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0a0a0a',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <svg width="90" height="90" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="20" width="75" height="75" rx="10" fill="white"/>
          <rect x="20" y="20" width="18" height="18" fill="#0a0a0a"/>
          <rect x="40" y="20" width="12" height="12" fill="#0a0a0a"/>
          <rect x="20" y="40" width="12" height="12" fill="#0a0a0a"/>
          <line x1="75" y1="50" x2="165" y2="28" stroke="white" strokeWidth="7" strokeLinecap="round"/>
          <circle cx="165" cy="28" r="10" fill="white"/>
          <line x1="75" y1="65" x2="155" y2="78" stroke="white" strokeWidth="7" strokeLinecap="round"/>
          <circle cx="155" cy="78" r="10" fill="white"/>
          <line x1="75" y1="80" x2="145" y2="115" stroke="white" strokeWidth="7" strokeLinecap="round"/>
          <circle cx="145" cy="115" r="10" fill="white"/>
        </svg>
        <h1 style={{ color: 'white', fontSize: '26px', fontWeight: 'bold', margin: '16px 0 4px', letterSpacing: '1px' }}>
          Byte Sur Soluciones Tecnologicas
        </h1>
        <h2 style={{ color: '#888', fontSize: '15px', fontWeight: 'normal', margin: '0 0 8px' }}>
          Sistema FITACCESS &mdash; Control de asistencia
        </h2>
        <div style={{ width: '60px', height: '2px', background: 'white', margin: '0 auto' }}/>
      </div>

      <div style={{
        background: '#111', border: '1px solid #222', borderRadius: '16px',
        padding: '36px 40px', width: '340px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
      }}>
        <p style={{ color: '#aaa', textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
          Accede con tu cuenta para continuar
        </p>
        <button
          onClick={() => navigateToLogin()}
          style={{
            width: '100%', padding: '14px', background: 'white', color: '#0a0a0a',
            border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold',
            cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.5px'
          }}
          onMouseOver={e => e.target.style.background = '#e0e0e0'}
          onMouseOut={e => e.target.style.background = 'white'}
        >
          Iniciar Sesion
        </button>
      </div>

      <div style={{ position: 'fixed', bottom: '20px', textAlign: 'center' }}>
        <p style={{ color: '#555', fontSize: '12px', margin: 0 }}>
          Si deseas un Sistema asi o de otras caracteristicas contactanos
        </p>
        <p style={{ color: '#555', fontSize: '12px', margin: '2px 0 0' }}>
          <a href="https://www.bytesur.cl" style={{ color: '#777', textDecoration: 'none' }}>www.bytesur.cl</a>
          {' '}&nbsp;+56982645747&nbsp;
          hecho con carino &#10084; BYTE SUR
        </p>
      </div>
    </div>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <LoadingScreen />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return <LoginScreen />;
    }
  }

  return (
    <Routes>
      <Route path="/public-screen" element={<PublicScreen />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/memberships" element={<Memberships />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/scanner" element={<QRScanner />} />
        <Route path="/attendance" element={<Attendance />} />
                <Route path="/settings" element={<GymSettings />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
