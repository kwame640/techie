// Vercel serverless catch-all handler for ALL /api/* requests.
// Delegates every request to the fully-configured Express app defined in server/index.js,
// so the entire backend runs as a single serverless function on Vercel.
//
// This file lives at <repo-root>/api/[...catchall].js, which Vercel auto-discovers and
// deploys as a Node.js serverless function with catch-all routing for /api/** paths.
// We then add a corresponding vercel.json rewrite so /api/* always hits this handler.

import { app } from '../server/index.js';

export default function handler(req, res) {
  // Vercel's Node.js serverless runtime provides native Node IncomingMessage /
  // ServerResponse objects that are fully compatible with Express (req.path, req.method,
  // headers, body parsing are all handled by the Express middleware stack already
  // configured in server/index.js — express.json(), express.urlencoded(), cors(), etc).
  app(req, res);
}

// Opt out of Vercel's default body parsing so Express's own parsers (express.json(),
// express.urlencoded(), and the multer/formidable parsers used for image uploads) can
// consume the raw request body exactly as they expect. This avoids double-parsing bugs
// and ensures multipart uploads reach the multer middleware intact.
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};
