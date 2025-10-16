import pino from "pino";

const getLogLevel = () => {
	if (Bun.env.NODE_ENV === "test") return "silent";
	if (Bun.env.NODE_ENV === "production") return "info";
	return "debug";
};

const createLogger = (name?: string) =>
	pino({
		name,
		level: getLogLevel(),
		transport:
			Bun.env.NODE_ENV === "production" || Bun.env.NODE_ENV === "test"
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
