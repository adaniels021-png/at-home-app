import { Slot } from 'expo-router';

import AdminRouteGate from '../../components/AdminRouteGate';

export default function AdminLayout() {
  return (
    <AdminRouteGate>
      <Slot />
    </AdminRouteGate>
  );
}

