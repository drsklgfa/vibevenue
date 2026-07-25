import "dotenv/config";
import { validateProductionConfig } from "./config.js";
import { closeIntegrations, connectIntegrations } from "./integrations.js";
import { migrate } from "./migrations.js";
import { logger } from "./logger.js";

async function main(): Promise<void> {
  validateProductionConfig();
  await connectIntegrations();
  await migrate();
  logger.info("Migrações comerciais concluídas com sucesso.");
}

void main()
  .catch((error) => {
    logger.fatal({ err: error }, "Falha ao executar migrações comerciais");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeIntegrations();
  });
