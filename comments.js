// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto');
const axios = require('axios');

// Create server
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Create comments object
const commentsByPostId = {};

// Create routes
app.get('/posts/:id/comments', (req, res) => {
  // Return comments array
  res.send(commentsByPostId[req.params.id] || []);
});

app.post('/posts/:id/comments', async (req, res) => {
  // Create comment id
  const commentId = randomBytes(4).toString('hex');

  // Get comment data
  const { content } = req.body;

  // Get comments array for post
  const comments = commentsByPostId[req.params.id] || [];

  // Add comment to comments array
  comments.push({ id: commentId, content, status: 'pending' });

  // Update comments array for post
  commentsByPostId[req.params.id] = comments;

  // Send event to event-bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: req.params.id, status: 'pending' },
  });

  // Return comments array
  res.status(201).send(comments);
});

app.post('/events', async (req, res) => {
  // Get event type
  const { type } = req.body;

  // If event type is CommentModerated
  if (type === 'CommentModerated') {
    // Get event data
    const { id, postId, status, content } = req.body.data;

    // Get comments array for post
    const comments = commentsByPostId[postId];

    // Find comment in comments array
    const comment = comments.find((comment) => comment.id === id);

    // Update comment status
    comment.status = status;

    // Send event to event-bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: { id, postId, status, content },
    });
  }

  // Send response
  res.send({});
});

// Start server
app.listen(4001, () => {
  console.log('Listening on 4001');
});