var githubhook = require('githubhook');
var ellipsize = require('ellipsize');
var Telegram = require('node-telegram-bot-api');
var yargs = require('yargs');

var argv = yargs
.usage('Usage: $0 [options]')

.alias('c', 'config')
.describe('c', 'Use config from given path')

.alias('h', 'help')
.help()
.strict()
.argv;

var path = require('path');
var os = require('os');
var fs = require('fs');

var configPath = argv.c || path.join(os.homedir(), '.telegit', 'config.js')
try {
    var config = require(configPath);
} catch (e) {
    console.log('Exception caught while loading config file:');
    console.log(e);

    console.log('\nPlease make sure the config file exists in ' + configPath);
    console.log('\nSee https://github.com/FruitieX/telegit/blob/master/config.example.js');
    console.log('for an example config file.');
    process.exit(1);
}

var START_STR = 'Ok, I will be sending you updates from the following GitHub repo: ';
START_STR += config.git.reponame;

var STOP_STR = 'Ok, I will no longer be sending you GitHub updates.';

var github = githubhook(config.git);

var tg = new Telegram(config.telegram.token, {polling: true});

var tgChats = [];

var chatsPath = configPath + '.chatIds.json';
try {
    console.log('Attempting to restore group chat IDs from ' + chatsPath + '...');
    tgChats = require(chatsPath);
    console.log('Successfully restored group chat IDs.');
} catch (e) {
    console.log('Error while reading from ' + chatsPath + ':');
    console.log(e);

    console.log('\nNot restoring group chat IDs. You MUST greet the bot with the /gitstart');
    console.log('command in each group chat where you want it to send any github events.');
}

var writeTgChats = function() {
    fs.writeFileSync(chatsPath, JSON.stringify(tgChats));
};

tg.on('message', function(msg) {
    // ignore non message events
    if (!msg.text) {
        return;
    }

    var chatId = msg.chat.id;
    if (!msg.text.indexOf('/gitstart')) {
        if (tgChats.indexOf(chatId) === -1) {
            tgChats.push(chatId);
            writeTgChats();
            tg.sendMessage(chatId, START_STR);
        }
    } else if (!msg.text.indexOf('/gitstop')) {
        var chatIndex = tgChats.indexOf(chatId);
        if (chatIndex !== -1) {
            tgChats.splice(chatIndex, 1);
            writeTgChats();
            tg.sendMessage(chatId, STOP_STR);
        }
    }
});

var escapeMd = function(text) {
    // make sure we're dealing with a string
    text = text.toString();

    // Telegram Bot API supports *_[]()` markdown control characters
    var specialChars = new RegExp('([\\\\`*_\\[]){1}', 'g');

    return text.replace(specialChars, function(match) {
        return '\\' + match;
    });
};

var sendTg = function(msg) {
    console.log('Sending to Telegram: ' + msg);

    tgChats.forEach(function(chatId) {
        tg.sendMessage(chatId, msg, {
            disable_web_page_preview: true,
            parse_mode: 'Markdown'
        });
    });
};

var isConfiguredRepo = function(repo) {
    if (config.git.repos && config.git.repos.indexOf(repo) !== -1) {
        return true;
    }

    if (config.git.reponame && config.git.reponame === repo) {
        return true;
    }

    return false;
}

github.on('push', function(repo, ref, data) {
    if (!isConfiguredRepo(repo)) {
        return;
    }

    // don't care about branch deletes
    if (!data.commits.length) {
        return;
    }

    var s = repo + ': ';

    s += '[' + escapeMd(data.after.substr(0, 8)) + '](' + escapeMd(data.compare) + ')';

    s += ': ' + escapeMd(data.pusher.name) + ', (' + escapeMd(data.pusher.email) + ')';
    s += ' pushed ' + data.commits.length;
    s += ' ' + (data.commits.length === 1 ? 'commit' : 'commits') + ' to ' + ref;

    if (data.commits.length === 1) {
        s += ': "' + escapeMd(data.commits[0].message) + '"';
    }

    sendTg(s);
});

github.on('pull_request', function(repo, ref, data) {
    if (!isConfiguredRepo(repo)) {
        return;
    }

    var s = repo + ': ';

    s += '[Pull request #';

    s += escapeMd(data.number);
    s += '](' + escapeMd(data.pull_request.html_url) + ')';

    s += ' (' + escapeMd(data.pull_request.title) + ')';

    s += ' ' + escapeMd(data.action);
    s += ' by ' + escapeMd(data.sender.login);

    sendTg(s);
});

github.on('issues', function(repo, ref, data) {
    if (!isConfiguredRepo(repo)) {
        return;
    }

    var s = repo + ': ';

    s += '[Issue #';

    s += escapeMd(data.issue.number);
    s += '](' + escapeMd(data.issue.html_url) + ')';

    s += ' (' + escapeMd(data.issue.title) + ')';
    s += ' ' + escapeMd(data.action);

    if (data.action === 'unassigned') {
        s += ' from ' + escapeMd(data.assignee.login);
    } else if (data.action === 'assigned') {
        s += ' to ' + escapeMd(data.assignee.login);
    }

    s += ' by ' + escapeMd(data.sender.login);

    sendTg(s);
});

github.on('issue_comment', function(repo, ref, data) {
    if (!isConfiguredRepo(repo)) {
        return;
    }

    var s = repo + ': ';

    s += escapeMd(data.sender.login) + ' commented on [';
    s += data.issue.pull_request ? 'pull request' : 'issue';
    s += ' #';
    s += escapeMd(data.issue.number);
    s += '](' + escapeMd(data.comment.html_url) + ')';

    s += ' (' + escapeMd(data.issue.title) + '): ';

    s += escapeMd(ellipsize(data.comment.body, 120));

    sendTg(s);
});

github.listen();
