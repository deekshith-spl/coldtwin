import { useStore } from '@/store/useStore';
import { useT } from '@/i18n';
import type { Role } from '@/types';
import { UserCheck } from 'lucide-react';

const roles: { value: Role; label: (T: ReturnType<typeof useT>) => string }[] = [
  { value: 'owner',  label: T => T.role_owner },
  { value: 'farmer', label: T => T.role_farmer },
  { value: 'staff',  label: T => T.role_staff },
];

export function RoleSwitcher() {
  const T = useT();
  const { role, setRole, currentFarmerId, setCurrentFarmer, farmers, lots } = useStore();

  // If farmers list is empty, derive from lots if available
  const availableFarmers = farmers.length > 0 
    ? farmers 
    : [...new Map(lots.map(l => [l.farmerId, { id: l.farmerId, name: l.farmerName }])).values()];

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    if (newRole === 'farmer' && !currentFarmerId && availableFarmers.length > 0) {
      setCurrentFarmer(availableFarmers[0].id);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 transition-colors">
        {roles.map(r => (
          <button
            key={r.value}
            type="button"
            onClick={() => handleRoleChange(r.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600 dark:focus-visible:ring-cold-400 ${
              role === r.value
                ? 'bg-white dark:bg-gray-900 text-cold-700 dark:text-cold-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {r.label(T)}
          </button>
        ))}
      </div>

      {role === 'farmer' && availableFarmers.length > 0 && (
        <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded-lg text-xs transition-colors">
          <UserCheck size={14} className="text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
          <select
            aria-label="Select active farmer"
            value={currentFarmerId || availableFarmers[0].id}
            onChange={e => setCurrentFarmer(e.target.value)}
            className="bg-transparent text-blue-900 dark:text-blue-200 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600 rounded cursor-pointer"
          >
            {availableFarmers.map(f => (
              <option key={f.id} value={f.id} className="dark:bg-gray-900 dark:text-gray-100">
                {f.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
