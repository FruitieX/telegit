module.exports = {
    git: {
        secret: 'your-github-web-hook-secret',

        repos: [
            'testrepo1',
            'testrepo2',
            'testrepo3'
        ],
        host: '0.0.0.0',
        port: 3420

        // DEPRECATED
        //reponame: 'testrepo'
    },

    telegram: {
        token: 'your-telegram-bot-api-token'
    }
};
