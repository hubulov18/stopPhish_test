import { ServiceSchema } from "moleculer";

const SystemService: ServiceSchema = {
  name: "system",

  actions: {
    health: {
      handler() {
        return {
          status: "ok",
          timestamp: new Date().toISOString(),
          uptimeSeconds: Math.round(process.uptime())
        };
      }
    }
  }
};

export default SystemService;
