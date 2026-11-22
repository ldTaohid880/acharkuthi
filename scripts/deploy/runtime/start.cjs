/**
 * Hostinger entry file. Starts the Next.js standalone server that scripts/deploy/prepare.mjs
 * packed into ./app. Hostinger provides PORT; HOSTNAME is forced to all interfaces because the
 * server's own host name would otherwise be used as the listen address.
 */
const path = require("node:path");

const appDir = path.join(__dirname, "app", "__APP_DIR__");
process.env.NODE_ENV = "production";
process.env.HOSTNAME = process.env.LISTEN_HOST || "0.0.0.0";
process.chdir(appDir);
require(path.join(appDir, "server.js"));
