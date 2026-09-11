import { SessionGuard } from '@/components/ui/session-guard';

export default function AuthLayout() {
  return <SessionGuard onboarding />;
}
