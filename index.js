const express = require('express');
const app = express();
app.use(express.json());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const HASHNODE_TOKEN = process.env.HASHNODE_TOKEN;
const REPO_OWNER = 'kirti763';
const REPO_NAME = 'blog-md-file';

async function fetchHashnodePost(postId) {
  const query = `
    query GetPost($id: ID!) {
      post(id: $id) {
        title
        slug
        content {
          markdown
        }
      }
    }
  `;
  const res = await fetch('https://gql.hashnode.com', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': HASHNODE_TOKEN || '',
    },
    body: JSON.stringify({ query, variables: { id: postId } }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data.post;
}

async function pushToGitHub(filename, content, commitMessage) {
  const encoded = Buffer.from(content).toString('base64');
  let sha;
  try {
    const checkRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filename}`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'User-Agent': 'hashnode-webhook',
        },
      }
    );
    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }
  } catch (err) {
    console.log('File does not exist yet, will create new:', err.message);
  }

  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filename}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'hashnode-webhook',
      },
      body: JSON.stringify({
        message: commitMessage,
        content: encoded,
        ...(sha ? { sha } : {}),
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(JSON.stringify(err));
  }
}

app.post('/webhook', async (req, res) => {
  try {
    console.log('Webhook received:', JSON.stringify(req.body, null, 2));
    const eventType = req.body?.data?.eventType;
    const postId = req.body?.data?.post?.id;

    if (!postId) {
      console.log('No post ID in payload');
      return res.status(400).send('No post ID');
    }

    const post = await fetchHashnodePost(postId);
    if (!post) {
      console.log('Could not fetch post from Hashnode');
      return res.status(500).send('Could not fetch post');
    }

    const title = post.title || 'Untitled';
    const slug = post.slug || postId;
    const content = post.content?.markdown || `# ${title}\n\nNo content found.`;
    const filename = `${slug}.md`;

    const commitMessage = eventType === 'post_published'
      ? `create post: ${title}`
      : `update post: ${title}`;

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
