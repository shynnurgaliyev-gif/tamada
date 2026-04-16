import type { MiniPermissions, Tab, NavItem } from '../types';

const NAV_ITEMS: NavItem[] = [
  { id: 'profiles',  icon: '👤',  label: 'Профили'   },
  { id: 'calendar',  icon: '📅',  label: 'Календарь' },
  { id: 'add',       icon: '＋',  label: 'Добавить', special: true },
  { id: 'analytics', icon: '📊',  label: 'Аналитика' },
  { id: 'more',      icon: '···', label: 'Ещё'       },
];

export function MiniBottomNav({
  tab,
  permissions,
  onTab,
  onAdd,
}: {
  tab: Tab;
  permissions: MiniPermissions;
  onTab: (t: Tab) => void;
  onAdd: () => void;
}) {
  const items = NAV_ITEMS.filter(item => {
    if (item.id === 'calendar') return permissions.can_manage_calendar;
    if (item.id === 'analytics') return permissions.can_view_analytics;
    if (item.id === 'add') return permissions.can_manage_calendar || permissions.can_create_profile;
    return true;
  });

  return (
    <nav className="mini-nav">
      {items.map(item => {
        if (item.special) {
          return (
            <button key="add" onClick={onAdd} className="mini-nav-add mini-tap">
              <div className="mini-nav-add-pill">＋</div>
              <span className="mini-nav-label" style={{ marginTop: 2 }}>Добавить</span>
            </button>
          );
        }

        const isActive = tab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTab(item.id as Tab)}
            className="mini-nav-item mini-tap"
            data-active={String(isActive)}
          >
            <span className="mini-nav-icon">{item.icon}</span>
            <span className="mini-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
