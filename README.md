# Peer Review Bot
A little bot Node.js checking Microsoft's case studies for peer reviews. It'll watch a repository for pull requests - and label them either as 'needs-peer-review' or as 'peer-reviewed', depending on how many people have commented with a reassuring 'LGTM!'.

#### Configuration
To configure this little bot, go check out `config.js` and either change the file or set environment variables. Here are the major properties:

* `user` User/organization owning the repository
* `repo` Repository to watch (case-studies)
* `botUser` Bot's GitHub username
* `botPassword` Bot's Github password
* `labelReviewed` Name of the label indicating enough peer reviews
* `labelNeedsreview` Name of the label indicating missing peer reviews
* `reviewsNeeded` Number of reviews needed 

#### Installation
A small number of things is needed to get the bot started:

* Create a GitHub user for your bot (or use an already existing account)
* Create the two labels used by the bot using GitHub's label feature (go to your repo's issues and select 'Labels' in the top navigation bar)
* Give your bot a home in the public Internet
* Create a web hook for all relevant events pointing to http://{your-bot}/pullrequest