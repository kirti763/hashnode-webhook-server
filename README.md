# hashnode-webhook-server

### Problem:
Keploy's blog posts written on Hashnode weren't syncing to the community-blog GitHub repo. The old sync broke after a Hashnode dashboard update.
Solution: Built a webhook server that listens for Hashnode events and automatically pushes blog posts as .md files to GitHub community-blog repo.


### What we built:
- A Node.js + Express server with a /webhook POST endpoint
- When Hashnode publishes/edits a post or static page, it sends the data to our server
- Our server takes that data and creates/updates a .md file in the GitHub repo using the GitHub API
- Deployed it on Render (free tier) so it's publicly accessible 24/7

### Tech used: 
Node.js, Express, GitHub REST API, Render for hosting

### Tested: 
Sent a fake Hashnode payload via curl → confirmed .md file appeared in GitHub repo 
- <img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/e5cfcc52-9332-4314-8c7b-85b6bb35dc34" />
