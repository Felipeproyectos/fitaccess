import { useState, useEffect } from 'react';
import base44 from '@/api/base44Client';

// Definicion de logros para administrador
const ADMIN_ACHIEVEMENTS = [
  {
        id: 'first_client',
        icon: '🏆',
        title: 'Primer Cliente',
        description: 'Registra tu primer cliente en el sistema',
        category: 'admin',
        check: (stats) => stats.totalClients >= 1,
  },
  {
        id: 'ten_clients',
        icon: '👥',
        title: '10 Clientes Activos',
        description: 'Tienes 10 o mas clientes activos',
        category: 'admin',
        check: (stats) => stats.activeClients >= 10,
  },
  {
        id: 'fifty_memberships',
        icon: '💪',
        title: '50 Membresias Vendidas',
        description: 'Has vendido 50 o mas membresias',
        category: 'admin',
        check: (stats) => stats.totalMemberships >= 50,
  },
  {
        id: 'hundred_payments',
        icon: '💰',
        title: '100 Pagos Procesados',
        description: 'Has procesado 100 o mas pagos',
        category: 'admin',
        check: (stats) => stats.totalPayments >= 100,
  },
  {
        id: 'twenty_clients',
        icon: '🌟',
        title: 'Gimnasio Popular',
        description: 'Tienes 20 o mas clientes activos este mes',
        category: 'admin',
        check: (stats) => stats.activeClients >= 20,
  },
  {
        id: 'five_clients',
        icon: '🎯',
        title: 'Comunidad en Crecimiento',
        description: 'Tienes 5 o mas clientes activos',
        category: 'admin',
        check: (stats) => stats.activeClients >= 5,
  },
  ];

// Definicion de logros para usuario/cliente
const USER_ACHIEVEMENTS = [
  {
        id: 'first_visit',
        icon: '🚪',
        title: 'Primera Visita',
        description: 'Registra tu primera asistencia al gimnasio',
        category: 'user',
        check: (stats) => stats.totalAttendances >= 1,
  },
  {
        id: 'ten_visits',
        icon: '🔟',
        title: '10 Visitas',
        description: 'Has asistido 10 veces al gimnasio',
        category: 'user',
        check: (stats) => stats.totalAttendances >= 10,
  },
  {
        id: 'twenty_five_visits',
        icon: '⭐',
        title: '25 Visitas',
        description: 'Has asistido 25 veces al gimnasio',
        category: 'user',
        check: (stats) => stats.totalAttendances >= 25,
  },
  {
        id: 'fifty_visits',
        icon: '🏅',
        title: '50 Visitas',
        description: 'Has asistido 50 veces al gimnasio - eres un campeon!',
        category: 'user',
        check: (stats) => stats.totalAttendances >= 50,
  },
  {
        id: 'hundred_visits',
        icon: '💯',
        title: '100 Visitas',
        description: 'Leyenda del gimnasio - 100 asistencias!',
        category: 'user',
        check: (stats) => stats.totalAttendances >= 100,
  },
  {
        id: 'active_member',
        icon: '🔥',
        title: 'Miembro Activo',
        description: 'Tienes una membresia activa vigente',
        category: 'user',
        check: (stats) => stats.hasActiveMembership,
  },
  ];

export default function Achievements() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [adminStats, setAdminStats] = useState({
          totalClients: 0,
          activeClients: 0,
          totalMemberships: 0,
          totalPayments: 0,
    });
    const [userStats, setUserStats] = useState({
          totalAttendances: 0,
          hasActiveMembership: false,
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
        const loadData = async () => {
                try {
                          setLoading(true);
                          const user = await base44.auth.me();
                          setCurrentUser(user);
                          const userIsAdmin = user?.role === 'admin';
                          setIsAdmin(userIsAdmin);

                  if (userIsAdmin) {
                              const [clients, memberships, payments] = await Promise.all([
                                            base44.entities.Client.list('-created_date', 500),
                                            base44.entities.Membership.list('-created_date', 500),
                                            base44.entities.Payment.list('-created_date', 500),
                                          ]);
                              setAdminStats({
                                            totalClients: clients.length,
                                            activeClients: clients.filter(c => c.active).length,
                                            totalMemberships: memberships.length,
                                            totalPayments: payments.length,
                              });
                  } else {
                              // Para usuarios normales buscar sus datos por email
                            const clients = await base44.entities.Client.filter({ email: user?.email });
                              const client = clients?.[0];
                              if (client) {
                                            const [attendances, memberships] = await Promise.all([
                                                            base44.entities.Attendance.filter({ client_id: client.id }),
                                                            base44.entities.Membership.filter({ client_id: client.id, status: 'active' }),
                                                          ]);
                                            setUserStats({
                                                            totalAttendances: attendances.length,
                                                            hasActiveMembership: memberships.length > 0,
                                            });
                              }
                  }
                } catch (err) {
                          console.error('Error loading achievements:', err);
                } finally {
                          setLoading(false);
                }
        };
        loadData();
  }, []);

  const adminAchievements = ADMIN_ACHIEVEMENTS.map(a => ({
        ...a,
        earned: a.check(adminStats),
  }));

  const userAchievements = USER_ACHIEVEMENTS.map(a => ({
        ...a,
        earned: a.check(userStats),
  }));

  const allAchievements = isAdmin
      ? [...adminAchievements, ...userAchievements]
        : userAchievements;

  const displayAchievements = activeTab === 'earned'
      ? allAchievements.filter(a => a.earned)
        : activeTab === 'pending'
      ? allAchievements.filter(a => !a.earned)
        : activeTab === 'admin'
      ? adminAchievements
        : activeTab === 'user'
      ? userAchievements
        : allAchievements;

  const earnedCount = allAchievements.filter(a => a.earned).length;
    const totalCount = allAchievements.length;
    const progressPct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  if (loading) {
        return (
                <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
                </div>div>
              );
  }
  
    return (
          <div className="p-6 max-w-5xl mx-auto">
            {/* Encabezado */}
                <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">🏆 Logros</h1>h1>
                        <p className="text-gray-500">
                          {isAdmin ? 'Logros del administrador y del sistema' : 'Tu progreso en el gimnasio'}
                        </p>p>
                </div>div>
          
            {/* Tarjeta de progreso */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-2xl p-6 mb-8 text-white shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                                  <div>
                                              <p className="text-gray-300 text-sm">Progreso total</p>p>
                                              <p className="text-4xl font-bold">{earnedCount} <span className="text-xl font-normal text-gray-400">/ {totalCount}</span>span></p>p>
                                              <p className="text-gray-300 text-sm mt-1">logros desbloqueados</p>p>
                                  </div>div>
                                  <div className="text-6xl">{progressPct >= 100 ? '🎉' : progressPct >= 50 ? '🔥' : '💪'}</div>div>
                        </div>div>
                        <div className="w-full bg-gray-600 rounded-full h-3">
                                  <div
                                                className="bg-white rounded-full h-3 transition-all duration-700"
                                                style={{ width: `${progressPct}%` }}
                                              />
                        </div>div>
                        <p className="text-right text-gray-300 text-sm mt-1">{progressPct}%</p>p>
                </div>div>
          
            {/* Estadisticas rapidas */}
            {isAdmin && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      {[
                      { label: 'Clientes Total', value: adminStats.totalClients, icon: '👤' },
                       { label: 'Clientes Activos', value: adminStats.activeClients, icon: '✅' },
                      { label: 'Membresias', value: adminStats.totalMemberships, icon: '💪' },
                      { label: 'Pagos', value: adminStats.totalPayments, icon: '💰' },
                                ].map((stat, i) => (
                                              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                                                            <div className="text-2xl mb-1">{stat.icon}</div>div>
                                                            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>div>
                                                            <div className="text-xs text-gray-500">{stat.label}</div>div>
                                              </div>div>
                                            ))}
                    </div>div>
                )}
          
            {!isAdmin && (
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      {[
                      { label: 'Visitas Totales', value: userStats.totalAttendances, icon: '🏃' },
                      { label: 'Membresia', value: userStats.hasActiveMembership ? 'Activa' : 'Inactiva', icon: '🎫' },
                                ].map((stat, i) => (
                                              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                                                            <div className="text-2xl mb-1">{stat.icon}</div>div>
                                                            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>div>
                                                            <div className="text-xs text-gray-500">{stat.label}</div>div>
                                              </div>div>
                                            ))}
                    </div>div>
                )}
          
            {/* Filtros */}
                <div className="flex gap-2 mb-6 flex-wrap">
                  {[
            { key: 'all', label: 'Todos' },
            { key: 'earned', label: '✅ Obtenidos' },
            { key: 'pending', label: '⏳ Pendientes' },
                      ...(isAdmin ? [{ key: 'admin', label: '👨‍💼 Admin' }, { key: 'user', label: '👤 Usuario' }] : []),
                    ].map(tab => (
                                <button
                                              key={tab.key}
                                              onClick={() => setActiveTab(tab.key)}
                                              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                                              activeTab === tab.key
                                                                ? 'bg-gray-900 text-white shadow'
                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                              }`}
                                            >
                                  {tab.label}
                                </button>button>
                              ))}
                </div>div>
          
            {/* Grid de logros */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayAchievements.map((achievement) => (
                      <div
                                    key={achievement.id}
                                    className={`rounded-2xl p-5 border-2 transition-all duration-300 ${
                                                    achievement.earned
                                                      ? 'bg-white border-gray-900 shadow-lg'
                                                      : 'bg-gray-50 border-gray-200 opacity-60'
                                    }`}
                                  >
                                  <div className="flex items-start gap-4">
                                                <div className={`text-4xl p-2 rounded-xl ${achievement.earned ? 'bg-gray-900' : 'bg-gray-200'}`}
                                                                  style={{ filter: achievement.earned ? 'none' : 'grayscale(100%)' }}>
                                                  {achievement.icon}
                                                </div>div>
                                                <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                                  <h3 className={`font-bold text-base ${achievement.earned ? 'text-gray-900' : 'text-gray-400'}`}>
                                                                                    {achievement.title}
                                                                                    </h3>h3>
                                                                  {achievement.earned && (
                                                        <span className="text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full">✓</span>span>
                                                                                  )}
                                                                </div>div>
                                                                <p className={`text-sm ${achievement.earned ? 'text-gray-600' : 'text-gray-400'}`}>
                                                                  {achievement.description}
                                                                </p>p>
                                                  {achievement.category === 'admin' && isAdmin && (
                                                      <span className="mt-2 inline-block text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Admin</span>span>
                                                                )}
                                                </div>div>
                                  </div>div>
                      </div>div>
                    ))}
                </div>div>
          
            {displayAchievements.length === 0 && (
                    <div className="text-center py-16 text-gray-400">
                              <div className="text-5xl mb-4">🔍</div>div>
                              <p className="text-lg">No hay logros en esta categoria todavia</p>p>
                    </div>div>
                )}
          
            {/* Pie de pagina ByteSur */}
                <div className="mt-12 pt-6 border-t border-gray-200 text-center">
                        <p className="text-xs text-gray-400">
                                  Si deseas un Sistema asi o de otras caracteristicas contactanos{' '}
                                  <a href="https://www.bytesur.cl" className="text-gray-500 hover:underline">www.bytesur.cl</a>a>{' '}
                                  +56982645747 — hecho con carino ❤ BYTE SUR
                        </p>p>
                </div>div>
          </div>div>
        );
}</div>
