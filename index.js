const express = require('express');
const app = express();
app.use(express.json());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'kirti763'; 
const REPO_NAME = 'blog-md-file'; 

async function pushToGitHub(filename, content, commitMessage) {
  const encoded = Buffer.from(content).toString('base64');
  
  
  let sha;
  try {
    const checkRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filename}`, {
      headers: { 
        Authorization: `token ${GITHUB_TOKEN}`, 
        'User-Agent': 'hashnode-webhook' 
      }
    });
    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }
  } catch (err) {
  }

  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filename}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'hashnode-webhook'
    },
    body: JSON.stringify({
      message: commitMessage,
      content: encoded,
      ...(sha ? { sha } : {})
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(JSON.stringify(err));
  }
}

app.post('/webhook', async (req, res) => {
  try {
    console.log('Webhook received:', JSON.stringify(req.body, null, 2));
    
    const eventType = req.body?.type || req.body?.event;
    const post = req.body?.data?.post || req.body?.post;
    
    if (!post) {
      console.log('No post data found in payload');
      return res.status(400).send('No post data');
    }

    const title = post.title || 'Untitled';
    const slug = post.slug || post.id || Date.now().toString();
    const content = post.contentMarkdown || post.content?.markdown || `# ${title}\n\nNo content found.`;
    const filename = `${slug}.md`;

    let commitMessage;
    if (
      eventType === 'post_published' || 
      eventType === 'story_published' ||
      eventType === 'POST_PUBLISHED'
    ) {
      commitMessage = `create post: ${title}`;
    } else {
      commitMessage = `update post: ${title}`;
    }

    await pushToGitHub(filename, content, commitMessage);
    
    console.log(`Success: ${commitMessage}`);
    res.status(200).send('OK');
    
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).send('Error: ' + err.message);
  }
});

app.get('/', (req, res) => res.send('Webhook server running'));

app.listen(process.env.PORT || 3000, () => console.log('Running'));
