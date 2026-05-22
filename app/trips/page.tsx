import { redirect } from 'next/navigation';

type SearchParams = {
  origin?: string | string[];
  destination?: string | string[];
};

function firstValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

export default async function TripsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const origin = firstValue(resolvedSearchParams?.origin).trim();
  const destination = firstValue(resolvedSearchParams?.destination).trim();

  const routeQuery = new URLSearchParams();
  if (origin) routeQuery.set('pickup_area', origin);
  if (destination) routeQuery.set('destination_area', destination);

  const nextPath = routeQuery.toString() ? `/routes?${routeQuery.toString()}` : '/routes';
  redirect(nextPath);
}
