export async function POST(request: Request) {
  const body = await request.json();

  return Response.json({
    ok: true,
    message: `Application received for ${body.course || 'the selected programme'}. This demo response works for testing the UI and can later be connected to admissions email delivery.`
  });
}
