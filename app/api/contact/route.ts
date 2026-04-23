export async function POST() {
  return Response.json({
    ok: true,
    message: 'Your message has been received in demo mode. You can later connect this form to a real email service.'
  });
}
