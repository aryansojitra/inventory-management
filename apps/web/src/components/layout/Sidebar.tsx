import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import {
  LayoutDashboard,
  Boxes,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  QrCode,
  Users,
  History,
  BarChart3,
  ShieldAlert,
  LogOut,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout, isCoordinator, isStudent } = useAuth();
  const { totalCartQuantity } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const coordinatorLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/inventory', label: 'Inventory Items', icon: Boxes },
    {
      to: '/issue-items',
      label: 'Issue Workbench',
      icon: ArrowUpRight,
      badge: totalCartQuantity > 0 ? `${totalCartQuantity}` : undefined,
    },
    { to: '/returns', label: 'Returns & QC', icon: ArrowDownLeft },
    { to: '/renewals', label: 'Renewal Requests', icon: RefreshCw },
    { to: '/assets', label: 'Asset Barcodes', icon: QrCode },
    { to: '/students', label: 'Students', icon: Users },
    { to: '/stock-history', label: 'Stock History', icon: History },
    { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
    { to: '/audit-logs', label: 'Audit Logs', icon: ShieldAlert },
  ];

  const studentLinks = [
    { to: '/student/portal', label: 'My Borrowings', icon: GraduationCap },
    { to: '/student/catalog', label: 'Browse Catalog', icon: Boxes },
  ];

  const links = isCoordinator ? coordinatorLinks : studentLinks;

  return (
    <aside className="w-64 bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border flex flex-col h-screen select-none shrink-0">
      {/* Brand Header */}
      <div className="p-5 flex items-center gap-3 border-b border-sidebar-border/80">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Boxes className="w-6 h-6" />
        </div>
        <div>
          <div className="font-bold text-white text-base tracking-tight flex items-center gap-1.5">
            DIMS <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-[11px] text-sidebar-foreground/70 font-medium">Dept. Inventory System</div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50">
          {isCoordinator ? 'Operations Management' : 'Student Portal'}
        </div>

        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>{link.label}</span>
              </div>
              {link.badge && (
                <span className="bg-amber-400 text-amber-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {link.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User info & Logout */}
      <div className="p-4 border-t border-sidebar-border/80 bg-sidebar-background/80">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 font-bold text-xs uppercase">
            {user?.name?.slice(0, 2) || 'US'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name || 'Department User'}</p>
            <p className="text-[10px] text-sidebar-foreground/60 capitalize flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {user?.role || 'Guest'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-sidebar-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
