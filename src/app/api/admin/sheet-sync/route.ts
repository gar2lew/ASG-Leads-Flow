// ============================================
// GET /api/admin/sheet-sync — List sync jobs
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getSheetSyncJobRepository, SheetSyncJob } from '@/lib/google/sync-jobs';

export async function GET(req: NextRequest) {
  // TODO: Verify authentication and authorization (admin/manager)
  const url = new URL(req.url);
  const officeId = url.searchParams.get('officeId') || undefined;
  const status = url.searchParams.get('status') || undefined;

  try {
    const repo = getSheetSyncJobRepository();

    if (status === 'failed') {
      const jobs = await repo.getFailedJobs(officeId);
      return NextResponse.json({ jobs });
    }

    // For pending/completed, get all and filter
    const allJobs = await repo.getPendingJobs(100);
    return NextResponse.json({ jobs: allJobs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch sync jobs' }, { status: 500 });
  }
}
