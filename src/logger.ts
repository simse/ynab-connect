import pino from "pino";

const createLogger = (name?: string) =>
	pino({
		name,
		level: Bun.env.NODE_ENV === "production" ? "info" : "debug",
		transport:
			Bun.env.NODE_ENV === "production"
				? undefined
				: {
						target: "pino-pretty",
						options: {
							colorize: true,
							translateTime: "SYS:standard",
							ignore: "pid,hostname",
						},
					},
	});

const logger = createLogger();

export default logger;

export { createLogger };
