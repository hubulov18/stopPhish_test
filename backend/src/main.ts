import { LogLevels, ServiceBroker } from "moleculer";
import ApiService from "./services/api.service";
import AuthService from "./services/auth.service";
import CategoriesService from "./services/categories.service";
import NotesService from "./services/notes.service";
import SystemService from "./services/system.service";
import UsersService from "./services/users.service";
import { settings } from "./utils/env";

const supportedLogLevels: LogLevels[] = ["fatal", "error", "warn", "info", "debug", "trace"];
const logLevel = supportedLogLevels.includes(settings.logLevel as LogLevels)
  ? (settings.logLevel as LogLevels)
  : "info";

const broker = new ServiceBroker({
  namespace: "notes-workbench",
  nodeID: `notes-node-${process.pid}`,
  logger: true,
  logLevel
});

broker.createService(SystemService);
broker.createService(UsersService);
broker.createService(AuthService);
broker.createService(CategoriesService);
broker.createService(NotesService);
broker.createService(ApiService);

const start = async () => {
  try {
    await broker.start();
    broker.logger.info(`Notes API is running on http://localhost:${settings.port}`);
  } catch (error) {
    broker.logger.error("Failed to start broker", error);
    process.exit(1);
  }
};

const stop = async (signal: NodeJS.Signals) => {
  broker.logger.info(`Received ${signal}, stopping services...`);
  await broker.stop();
  process.exit(0);
};

process.on("SIGINT", () => {
  void stop("SIGINT");
});

process.on("SIGTERM", () => {
  void stop("SIGTERM");
});

void start();
