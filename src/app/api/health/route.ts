export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    service: "asg-leads",
    version: "1.0.0",
    environment: process.env.NODE_ENV ?? "development",
  });
}
