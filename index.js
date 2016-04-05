var githubhook = require('githubhook');
var ellipsize = require('ellipsize');
var Telegram = require('node-telegram-bot-api');
var path = require('path');
var os = require('os');

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

var github = githubhook(config.git);

github.listen();

github.on('push:' + config.git.reponame, function(ref, data) {
    // don't care about branch deletes
    if (!data.commits.length) {
        return;
    }

    var s = data.after.substr(0, 8);

    s += ': ' + data.pusher.name + ', (' + data.pusher.email + ')';
    s += ' pushed ' + data.commits.length;
    s += ' ' + (data.commits.length === 1 ? 'commit' : 'commits') + ' to ' + ref;

    if (data.commits.length === 1) {
        s += ': "' + data.commits[0].message + '"';
    }

    console.log(s);
    console.log('url: ' + data.compare);
});

github.on('pull_request:' + config.git.reponame, function(ref, data) {
    console.log(data);

    var s = 'Pull request #';

    s += data.number;
    s += ' (' + data.pull_request.title + ')';

    s += ' ' + data.action;
    s += ' by ' + data.sender.login;

    console.log(s);
    console.log('url: ' + data.pull_request.html_url);
});

github.on('issues:' + config.git.reponame, function(ref, data) {
    var s = 'Issue #';

    s += data.issue.number;
    s += ' (' + data.issue.title + ')';
    s += ' ' + data.action;

    if (data.action === 'unassigned') {
        s += ' from ' + data.assignee.login;
    } else if (data.action === 'assigned') {
        s += ' to ' + data.assignee.login;
    }

    s += ' by ' + data.sender.login;

    console.log(s);
    console.log('url: ' + data.issue.html_url);
});

github.on('issue_comment:' + config.git.reponame, function(ref, data) {
    var s = data.sender.login + ' commented on #';
    s += data.issue.number;
    s += ' (' + data.issue.title + '): ';

    s += ellipsize(data.comment.body, 120);

    console.log(s);
    console.log(data.comment.html_url);
});
/*
var tg = new Telegram(config.tgToken, {polling: true});

tg.on('message', function(msg) {
    console.log(msg);
});

tg.sendMessage(channel.tgChatId, msg);
*/
