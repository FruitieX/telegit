# telegit
GitHub web hooks for your Telegram groups

## Setup
1. `git clone https://github.com/FruitieX/telegit`
2. `cd telegit`
3. `mkdir ~/.telegit && cp config.example.js ~/.telegit/config.js`
4. Set up your GitHub web hooks. Do this from your repository settings ->
   Webhooks & services.
   1. Payload URL should point to your machine, port 3420, default callback
      path is `/github/callback`. For example:
      http://example.com:3420/github/callback
   2. Content type should be left as `application/json`
   3. Set up a secret so others can't send fake events to your bot. Note
      the secret down, you'll need it soon.
   4. Remember to pick `Send me everything` or `Let me select individual events`
      to choose which events you want to see on Telegram.
5. Set up a Telegram bot with [BotFather](https://telegram.me/botfather),
   store the API token somewhere safe, you'll need it soon
6. Use BotFather's `/setcommands` command on your newly created bot. Paste the
   contents of the [commands.txt](/commands.txt) file to BotFather.
7. Edit the default config: `$EDITOR ~/.telegit/config.js`
8. `npm start`
9. Now invite your bot to a group and greet it with `/gitstart@botname`

You can stop the bot from sending messages with `/gitstop@botname`.
