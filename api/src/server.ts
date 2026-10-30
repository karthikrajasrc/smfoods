import app from "./app.js";
import { config } from "./config.js";
import { connectDatabase } from "./db.js";

await connectDatabase();

const server = app.listen(config.PORT, () => {
  console.info(`SM Foods API listening on port ${config.PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      void import("mongoose").then(({ default: mongoose }) => mongoose.disconnect())
        .finally(() => process.exit(0));
    });
  });
}
