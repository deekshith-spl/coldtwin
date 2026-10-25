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
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {roles.map(r => (
          <button
            key={r.value}
            onClick={() => handleRoleChange(r.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              role === r.value
                ? 'bg-white text-cold-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {r.label(T)}
          </button>
        ))}
      </div>

      {role === 'farmer' && availableFarmers.length > 0 && (
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg text-xs">
          <UserCheck size={14} className="text-blue-600 shrink-0" />
          <select
            value={currentFarmerId || availableFarmers[0].id}
            onChange={e => setCurrentFarmer(e.target.value)}
            className="bg-transparent text-blue-900 font-medium focus:outline-none cursor-pointer"
          >
            {availableFarmers.map(f => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
