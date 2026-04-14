import type { Tab, NavItem } from '../types';

const NAV_ITEMS: NavItem[] = [
  { id: 'profiles',  icon: '👤',  label: 'Профили'   },
  { id: 'calendar',  icon: '📅',  label: 'Календарь' },
  { id: 'add',       icon: '＋',  label: 'Добавить', special: true },
  { id: 'analytics', icon: '📊',  label: 'Аналитика' },
  { id: 'more',      icon: '···', label: 'Ещё'       },
];

export function MiniBottomNav({
  tab,
  onTab,
  onAdd,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  onAdd: () => void;
}) {
  return (
    <nav className="mini-nav">
      {NAV_ITEMS.map(item => {
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
