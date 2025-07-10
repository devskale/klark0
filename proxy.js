const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = 5001;

app.use(cors());
app.use(
  "/webdav",
  createProxyMiddleware({
    target: "http://amd1.mooo.com:5000/klark0",
    changeOrigin: true,
    pathRewrite: { "^/webdav": "" },
  })
);

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
