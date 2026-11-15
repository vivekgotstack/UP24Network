import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export function GET() {
  const fingerprints = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS ?? '').split(',').map(value => value.trim().toUpperCase())
    .filter(value => /^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(value));
  const packageName = process.env.ANDROID_APP_ID ?? 'com.up24network.news';
  const validPackage = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/.test(packageName);
  return NextResponse.json(fingerprints.length && validPackage ? [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: fingerprints },
  }] : [], { headers: { 'Cache-Control': 'public, max-age=300' } });
}
