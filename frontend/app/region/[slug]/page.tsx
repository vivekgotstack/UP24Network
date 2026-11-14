import { PlaceCoverage, placeMetadata } from '@/components/place-coverage';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };
export async function generateMetadata({ params }: Props) {
  return placeMetadata('region', (await params).slug);
}
export default async function RegionPage({ params, searchParams }: Props) {
  const [{ slug }, { page }] = await Promise.all([params, searchParams]);
  return <PlaceCoverage kind="region" slug={slug} page={page} />;
}
