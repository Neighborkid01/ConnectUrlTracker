require('dotenv').config()

var { App } = require('@slack/bolt');
const redis = require('redis');
const client = redis.createClient();


// Initializes your app with your bot token and signing secret
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN
});

function getCommandArgs(text) {
    let args = [];
    if (typeof(text) !== 'string' || text.length <= 0) { return args; }

    let splitText = text.split(' ');
    let firstWord = splitText[0];
    let theRest   = splitText.slice(1).join(' ')
    args.push(firstWord, theRest);

    return args;
}

(async () => {
    // Setting up redis connection
    client.on('error', (err) => console.log('Redis Client Error', err));
    await client.connect();

    // Starting Bolt app
    await app.start(process.env.PORT || 3000);

    app.command('/connect', async ({command, ack, respond}) => {
        await ack();

        if (!command.text || command.text.includes('help')) {
            await respond('Usage: `/connect [env] [org]`, where `[env]` is prod, staging, or dev.\nUse `/connect_orgs [env]` to see a list of orgs.');
            return;
        }

        let args = getCommandArgs(command.text);
        let envName = args[0];
        let orgName = args[1];

        let json = await client.get(envName);
        if (json === null) {
            await respond(`No such environment: \`${envName}\`.\nMust be prod, staging, or dev.`);
            return;
        }

        let orgs = JSON.parse(json);
        let org = orgs[orgName];
        if (!org) {
            await respond(`No such org: \`${orgName}\`.\nUse \`/connect_orgs ${envName}\` to see a list of orgs.`);
            return;
        }

        let orgTitle = org["title"];
        let orgURLs  = org["urls"];


        await respond(`${orgTitle} (${envName.toUpperCase()})\n${orgURLs.join('\n')}`);
    });

    app.command('/connect_orgs', async ({command, ack, respond}) => {
        await ack();

        if (!command.text || command.text.includes('help')) {
            await respond('Usage: `/connect_orgs [env]`, where `[env]` is prod, staging, or dev.');
            return;
        }

        let args = getCommandArgs(command.text);
        let envName = args[0];

        let json = await client.get(envName);
        if (json === null) {
            await respond(`No such environment: \`${envName}\`.\nMust be prod, staging, or dev.`);
            return;
        }

        let orgs = JSON.parse(json);
        let orgNames = Object.keys(orgs);
        await respond(`${envName.toUpperCase()} orgs:\n\`\`\`${orgNames.join('\n')}\`\`\``);
    });

    console.log('⚡️ Bolt app isn\'t running!');
})();
