const express = require('express');
const app = express();
app.use(express.json());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'keploy';
const REPO_NAME = 'community-blog';

app.post('/webhook', async (req, res) => {
  try {
    const post = req.body?.data?.post || req.body?.post;
    if (!post) return res.status(400).send('No post data');

    const slug = post.slug || post.id || Date.now().toString();
    const content = post.contentMarkdown || post.content?.markdown || '# ' + (post.title || 'Untitled');
    const filename = `${slug}.md`;
    const encoded = Buffer.from(content).toString('base64');

    // Check if file exists (to get SHA for update)
    let sha;
    const checkRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filename}`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}`, 'User-Agent': 'hashnode-webhook' }
    });
    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }

    // Create or update file
    await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filename}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'hashnode-webhook'
      },
      body: JSON.stringify({
        message: `Blog sync: ${post.title || slug}`,
        content: encoded,
        ...(sha ? { sha } : {})
      })
    });

    res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

app.get('/', (req, res) => res.send('Webhook server running'));
app.listen(process.env.PORT || 3000, () => console.log('Running'));
