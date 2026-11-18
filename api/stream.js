// Legacy unsigned video streaming is intentionally disabled. All gallery media
// must use a short-lived signed URL issued by Apps Script and served by worker.mjs.
module.exports = (req, res) => {
  res.statusCode = 410;
  res.setHeader('Cache-Control', 'no-store');
  res.end('This media endpoint has been retired. Open the signed gallery media URL.');
};
