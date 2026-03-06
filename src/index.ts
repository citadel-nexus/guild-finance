import  GuildClient  from '@citadel-guilds/sdk';

const guild = new GuildClient({
  name: 'finance',
  natsPrefix: 'citadel.finance',
  port: 8092,
});

guild.start();
