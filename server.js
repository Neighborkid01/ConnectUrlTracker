require('dotenv').config()

var { App } = require('@slack/bolt');

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  app.command('/test', async ({command, ack, respond}) => {
    await ack();

    console.log(command);
    await respond('response');
  });

  console.log('⚡️ Bolt app isn\'t running!');
})();
