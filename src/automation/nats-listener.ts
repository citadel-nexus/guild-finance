import  connect, StringCodec  from 'nats';

const sc = StringCodec();

export async function startListener() {
  const nc = await connect( servers: process.env.NATS_URL );
  const sub = nc.subscribe('citadel.finance.>');
  console.log(`[finance] Listening on citadel.finance.*`);
  for await (const msg of sub) {
    const data = sc.decode(msg.data);
    console.log(`[finance] $msg.subject: $data`);
    // Route to handlers based on msg.subject
  }
}
