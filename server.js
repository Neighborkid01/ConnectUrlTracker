require('dotenv').config()

var { App } = require('@slack/bolt');
const redis = require('redis');
const client = redis.createClient({
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD
});
console.log(process.env.REDIS_URL);


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

    let quoteStrings = text.match(/["“](.*?)[”"]/g);
    quoteStrings = quoteStrings || [];
    for (let quoteString of quoteStrings) {
        let preceedingArgString = text.split(quoteString)[0];
        let validPreceedingStrings = preceedingArgString.split(' ').filter(word => word != '');
        args.push(...validPreceedingStrings);
        args.push(stripQuotes(quoteString));
        text = text.replace(preceedingArgString, '');
        text = text.replace(quoteString, '');
    }
    args.push(...text.split(' ').filter(word => word != ''));

    return args;
}

function stripQuotes(text) {
    let quotes = ['"', '“', '”'];
    for (let quote of quotes) {
        text = text.replace(quote, '');
    }

    return text;
}

(async () => {
    // Setting up redis connection
    client.on('error', (err) => console.log('Redis Client Error', err));
    await client.connect();

    // Starting Bolt app
    await app.start(process.env.PORT || 3000);

    app.command('/connect', async ({command, ack, respond}) => {
        await ack();

        console.log(`Request received: /connect ${command.text}`);
        if (!command.text || command.text.includes('help') || command.text == '[env] [org]') {
            await respond('Usage: `/connect [env] [org]`, where `[env]` is prod, staging, or dev.\n\nOther available commands:\n`/connect_orgs`: See available orgs\n`/connect_add`: Add a URL or create an org\n`/connect_del`: Delete an existing org');
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

        console.log(`Request received: /connect_orgs ${command.text}`);
        if (!command.text || command.text.includes('help') || command.text == '[env]') {
            await respond('Usage: `/connect_orgs [env]`, where `[env]` is prod, staging, or dev.\n\nOther available commands:\n`/connect`: Get the URLs for the specified org\n`/connect_add`: Add a URL or create an org\n`/connect_del`: Delete an existing org');
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

    app.command('/connect_add', async ({command, ack, respond}) => {
        await ack();

        console.log(`Request received: /connect_add ${command.text}`);
        if (!command.text || command.text.includes('help') || command.text == '[env] [org] ["Org Title"] [list,of,urls]') {
            await respond('Usage: `/connect_add [env] [org] ["Org Title"] [list,of,urls]`, where `[env]` is prod, staging, or dev, `[org]` is the lowercase org name, `["Org Title"]` is the org\'s name in the db in quotes (enter `""` to keep the same name), and `[list,of,urls]` is the comma separated list of URLs you wish to add.\n\nOther available commands:\n`/connect`: Get the URLs for the specified org\n`/connect_orgs`: See available orgs\n`/connect_del`: Delete an existing org');
            return;
        }

        let args = getCommandArgs(command.text);
        let envName  = args[0];
        let orgName  = args[1];
        let orgTitle = args[2];
        let orgURLs  = args[3];
        let successString = 'updated';

        let json = await client.get(envName);
        if (json === null) {
            await respond(`No such environment: \`${envName}\`.\nMust be prod, staging, or dev.`);
            return;
        }

        let orgs = JSON.parse(json);
        let org = orgs[orgName] || {};
        if (Object.keys(org).length === 0) { successString = 'added' }
        if (orgTitle == '') { orgTitle = org.title }
        if (orgTitle === undefined) {
            await respond(`Org title cannot be blank when adding a new org URL`);
            return;
        }

        let savedURLs = org.urls || [];
        orgURLs = orgURLs.split(',').map(url => url.trim()).filter(url => url != '');
        let urlCount = orgURLs.length;
        if (urlCount === 0) {
            await respond(`You must add at least 1 URL.`);
            return;
        }

        savedURLs.push(...orgURLs);

        org.title = orgTitle;
        org.urls  = savedURLs;
        orgs[orgName] = org;

        let orgString = JSON.stringify(orgs);
        await client.set(envName, orgString);

        await respond(`${urlCount} URL(s) for org \`${orgName}\` have been ${successString} successfully.`);
    });

    app.command('/connect_del', async ({command, ack, respond}) => {
        await ack();

        console.log(`Request received: /connect_del ${command.text}`);
        if (!command.text || command.text.includes('help') || command.text == '[env] [org]') {
            await respond('Usage: `/connect_del [env] [org]`, where `[env]` is prod, staging, or dev and `[org]` is the lowercase org name.\n*WARNING:* This will removed all saved URLs for this org and cannot be undone.\n\nOther available commands:\n`/connect`: Get the URLs for the specified org\n`/connect_orgs`: See available orgs\n`/connect_add`: Add a URL or create an org');
            return;
        }

        let args = getCommandArgs(command.text);
        let envName  = args[0];
        let orgName  = args[1];

        let json = await client.get(envName);
        if (json === null) {
            await respond(`No such environment: \`${envName}\`.\nMust be prod, staging, or dev.`);
            return;
        }

        let orgs = JSON.parse(json);
        if (orgs[orgName] === undefined) {
            await respond(`No such org: \`${orgName}\`.\nUse \`/connect_orgs ${envName}\` to see a list of orgs.`);
            return;
        }

        delete orgs[orgName];
        let orgString = JSON.stringify(orgs);
        await client.set(envName, orgString);

        await respond(`Org \`${orgName}\` has been successfully deleted.`);
    });

    console.log('⚡️ Bolt app is running!');
})();
