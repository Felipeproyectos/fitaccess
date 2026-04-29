import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const ADMIN_ACHIEVEMENTS = [
  { id: 'first_client', icon: '🏆', title: 'Primer Cliente', description: 'Registra tu primer cliente en el sistema', category: 'admin', check: (s) => s.totalClients >= 1 },
  { id: 'five_clients', icon: '🎯', title: 'Comunidad en Crecimiento', description: 'Tienes 5 o más clientes activos', category: 'admin', check: (s) => s.activeClients >= 5 },
  { id: 'ten_clients', icon: '👥', title: '10 Clientes Activos', description: 'Tienes 10 o más clientes activos', category: 'admin', check: (s) => s.activeClients >= 10 },
  { id: 'twenty_clients', icon: '🌟', title: 'Gimnasio Popular', description: 'Tienes 20 o más clientes activos', category: 'admin', check: (s) => s.activeClients >= 20 },
  { id: 'fifty_memberships', icon: '💪', title: '50 Membresías Vendidas', description: 'Has vendido 50 o más membresías', category: 'admin', check: (s) => s.totalMemberships >= 50 },
  { id: 'hundred_payments', icon: '💰', title: '100 Pagos Procesados', description: 'Has procesado 100 o más pagos', category: 'admin', check: (s) => s.totalPayments >= 100 },
];

const USER_ACHIEVEMENTS = [
  { id: 'first_visit', icon: '🚪', title: 'Primera Visita', description: 'Registra tu primera asistencia al gimnasio', category: 'user', check: (s) => s.totalAttendances >= 1 },
  { id: 'ten_visits', icon: '🔟', title: '10 Visitas', description: 'Has asistido 10 veces al gimnasio', category: 'user', check: (s) => s.totalAttendances >= 10 },
  { id: 'twenty_five_visits', icon: '⭐', title: '25 Visitas', description: 'Has asistido 25 veces al gimnasio', category: 'user', check: (s) => s.totalAttendances >= 25 },
  { id: 'fifty_visits', icon: '🏅', title: '50 Visitas', description: 'Has asistido 50 veces - eres un campeón!', category: 'user', check: (s) => s.totalAttendances >= 50 },
  { id: 'hundred_visits', icon: '💯', title: '100 Visitas', description: 'Leyenda del gimnasio - 100 asistencias!', category: 'user', check: (s) => s.totalAttendances >= 100 },
  { id: 'active_member', icon: '🔥', title: 'Miembro Activo', description: 'Tienes una membresía activa vigente', category: 'user', check: (s) => s.hasActiveMembership },
];

export default function Achievements() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminStats, setAdminStats] = useState({ totalClients: 0, activeClients: 0, totalMemberships: 0, totalPayments: 0 });
  const [userStats, setUserStats] = useState({ totalAttendances: 0, hasActiveMembership: false });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const user = await base44.auth.me();
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
        const clients = await base44.entities.Client.filter({ email: user?.email });
        const client = clients?.[0];
        if (client) {
          const [attendances, memberships] = await Promise.all([
            base44.entities.Attendance.filter({ client_id: client.id }),
            base44.entities.Membership.filter({ client_id: client.id, status: 'active' }),
          ]);
          setUserStats({ totalAttendances: attendances.length, hasActiveMembership: memberships.length > 0 });
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const adminAchievements = ADMIN_ACHIEVEMENTS.map(a => ({ ...a, earned: a.check(adminStats) }));
  const userAchievements = USER_ACHIEVEMENTS.map(a => ({ ...a, earned: a.check(userStats) }));
  const allAchievements = isAdmin ? [...adminAchievements, ...userAchievements] : userAchievements;

  const displayAchievements = activeTab === 'earned' ? allAchievements.filter(a => a.earned)
    : activeTab === 'pending' ? allAchievements.filter(a => !a.earned)
    : activeTab === 'admin' ? adminAchievements
    : activeTab === 'user' ? userAchievements
    : allAchievements;

  const earnedCount = allAchievements.filter(a => a.earned).length;
  const totalCount = allAchievements.length;
  const progressPct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">🏆 Logros</h1>
        <p className="text-muted-foreground">
          {isAdmin ? 'Logros del administrador y del sistema' : 'Tu progreso en el gimnasio'}
        </p>
      </div>

      {/* Progress Card */}
      <div className="bg-gradient-to-r from-card to-secondary rounded-2xl p-6 border border-border shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-muted-foreground text-sm">Progreso total</p>
            <p className="text-4xl font-bold text-white">{earnedCount} <span className="text-xl font-normal text-muted-foreground">/ {totalCount}</span></p>
            <p className="text-muted-foreground text-sm mt-1">logros desbloqueados</p>
          </div>
          <div className="text-6xl">{progressPct >= 100 ? '🎉' : progressPct >= 50 ? '🔥' : '💪'}</div>
        </div>
        <div className="w-full bg-muted rounded-full h-3">
          <div className="bg-primary rounded-full h-3 transition-all duration-700" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-right text-muted-foreground text-sm mt-1">{progressPct}%</p>
      </div>

      {/* Stats */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Clientes Total', value: adminStats.totalClients, icon: '👤' },
            { label: 'Clientes Activos', value: adminStats.activeClients, icon: '✅' },
            { label: 'Membresías', value: adminStats.totalMemberships, icon: '💪' },
            { label: 'Pagos', value: adminStats.totalPayments, icon: '💰' },
          ].map((stat, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {!isAdmin && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Visitas Totales', value: userStats.totalAttendances, icon: '🏃' },
            { label: 'Membresía', value: userStats.hasActiveMembership ? 'Activa' : 'Inactiva', icon: '🎫' },
          ].map((stat, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'earned', label: '✅ Obtenidos' },
          { key: 'pending', label: '⏳ Pendientes' },
          ...(isAdmin ? [{ key: 'admin', label: '👨‍💼 Admin' }, { key: 'user', label: '👤 Usuario' }] : []),
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === t.key ? 'bg-primary text-white shadow' : 'bg-card text-muted-foreground hover:text-white border border-border'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayAchievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`rounded-2xl p-5 border-2 transition-all duration-300 ${
              achievement.earned ? 'bg-card border-primary/40 shadow-lg' : 'bg-card/50 border-border opacity-60'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`text-4xl p-2 rounded-xl ${achievement.earned ? 'bg-primary/20' : 'bg-muted'}`}
                style={{ filter: achievement.earned ? 'none' : 'grayscale(100%)' }}>
                {achievement.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-bold text-base ${achievement.earned ? 'text-white' : 'text-muted-foreground'}`}>
                    {achievement.title}
                  </h3>
                  {achievement.earned && (
                    <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">✓</span>
                  )}
                </div>
                <p className={`text-sm ${achievement.earned ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                  {achievement.description}
                </p>
                {achievement.category === 'admin' && isAdmin && (
                  <span className="mt-2 inline-block text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">Admin</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {displayAchievements.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-lg">No hay logros en esta categoría todavía</p>
        </div>
      )}
    </div>
  );
}