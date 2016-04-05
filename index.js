var githubhook = require('githubhook');
var ellipsize = require('ellipsize');
var Telegram = require('node-telegram-bot-api');
var path = require('path');
var os = require('os');
var fs = require('fs');

var configPath = path.join(os.homedir(), '.telegit', 'config.js')
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

var chatsPath = path.join(os.homedir(), '.telegit', 'chats.json')
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
    var chatId = msg.chat.id;
    if (msg.text === '/gitstart') {
        if (tgChats.indexOf(chatId) === -1) {
            tgChats.push(chatId);
            writeTgChats();
            tg.sendMessage(chatId, START_STR);
        }
    } else if (msg.text === '/gitstop') {
        var chatIndex = tgChats.indexOf(chatId);
        if (chatIndex !== -1) {
            tgChats.splice(chatIndex, 1);
            writeTgChats();
            tg.sendMessage(chatId, STOP_STR);
        }
    }
});

var sendTg = function(msg) {
    console.log('Sending to Telegram: ' + msg);

    tgChats.forEach(function(chatId) {
        tg.sendMessage(chatId, msg, {
            disable_web_page_preview: true,
            parse_mode: 'Markdown'
        });
    });
};

github.on('push:' + config.git.reponame, function(ref, data) {
    // don't care about branch deletes
    if (!data.commits.length) {
        return;
    }

    var s = '[' + data.after.substr(0, 8) + '](' + data.compare + ')';

    s += ': ' + data.pusher.name + ', (' + data.pusher.email + ')';
    s += ' pushed ' + data.commits.length;
    s += ' ' + (data.commits.length === 1 ? 'commit' : 'commits') + ' to ' + ref;

    if (data.commits.length === 1) {
        s += ': "' + data.commits[0].message + '"';
    }

    sendTg(s);
});

github.on('pull_request:' + config.git.reponame, function(ref, data) {
    var s = '[Pull request #';

    s += data.number;
    s += '](' + data.pull_request.html_url + ')';

    s += ' (' + data.pull_request.title + ')';

    s += ' ' + data.action;
    s += ' by ' + data.sender.login;

    sendTg(s);
});

github.on('issues:' + config.git.reponame, function(ref, data) {
    var s = '[Issue #';

    s += data.issue.number;
    s += '](' + data.issue.html_url + ')';

    s += ' (' + data.issue.title + ')';
    s += ' ' + data.action;

    if (data.action === 'unassigned') {
        s += ' from ' + data.assignee.login;
    } else if (data.action === 'assigned') {
        s += ' to ' + data.assignee.login;
    }

    s += ' by ' + data.sender.login;

    sendTg(s);
});

github.on('issue_comment:' + config.git.reponame, function(ref, data) {
    var s = data.sender.login + ' commented on [';
    s += data.issue.pull_request ? 'pull request' : 'issue';
    s += ' #';
    s += data.issue.number;
    s += '](' + data.comment.html_url + ')';

    s += ' (' + data.issue.title + '): ';

    s += ellipsize(data.comment.body, 120);

    sendTg(s);
});

github.listen();
