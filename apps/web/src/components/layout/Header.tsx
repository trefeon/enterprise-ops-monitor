import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BaseAppHeader } from '@/components/base';

interface HeaderProps {
  mobileOpen: boolean;
  onMobileMenuClick: () => void;
}

function getInitials(username?: string, role?: string): string {
  const source = String(username || role || '').trim();
  if (!source) return '??';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
  }
  const compact = source.replace(/[^a-zA-Z0-9]/g, '');
  return compact.substring(0, 2).toUpperCase() || '??';
}

export default function Header({ mobileOpen, onMobileMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <BaseAppHeader
      title="Enterprise Operations Platform"
      mobileOpen={mobileOpen}
      onMobileMenuClick={onMobileMenuClick}
      profileInitials={getInitials(user?.username, user?.role)}
      onProfileClick={() => navigate('/profile')}
    />
  );
}
