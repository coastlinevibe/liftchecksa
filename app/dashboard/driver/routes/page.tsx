import { redirect } from 'next/navigation';

export default async function DriverRoutesPage() {
  redirect('/dashboard/driver#assigned-routes');
}
