import { Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function OrgSwitcher() {
  const { currentOrgId, user } = useAuth();

  // In v1 we only support a single org — just display the org name / ID
  if (!currentOrgId) return null;

  const orgName = user?.orgName || user?.orgId || currentOrgId;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
      <Building2 aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="truncate max-w-[120px] font-medium" title={orgName}>
        {orgName}
      </span>
    </div>
  );
}
