# ConnectUrlTracker

This is a Slack app to quickly see prod/staging/dev urls.

## Available slash commands

1. `/connect`: Get the URLs for the specified org

2. `/connect_orgs`: See available orgs

3. `/connect_add`: Add a URL or create an org

4. `/connect_del`: Delete an existing org

### `/connect`
Usage: `/connect [env] [org]`, where `[env]` is prod, staging, or dev and `[org]` is the organization to view

### `/connect_orgs`
Usage: `/connect_orgs [env]`, where `[env]` is prod, staging, or dev.

### `/connect_add`
Usage: `/connect_add [env] [org] ["Org Title"] [list,of,urls]`, where `[env]` is prod, staging, or dev, `[org]` is the lowercase org name, `["Org Title"]` is the org\'s name in the db in quotes (enter `""` to keep the same name), and `[list,of,urls]` is the comma separated list of URLs you wish to add.

### `/connect_del`
Usage: `/connect_del [env] [org]`, where `[env]` is prod, staging, or dev and `[org]` is the lowercase org name.
*WARNING:* This will removed all saved URLs for this org and cannot be undone.
