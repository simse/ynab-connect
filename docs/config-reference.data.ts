import fs from "node:fs";
import path from "node:path";

interface JsonSchemaProperty {
	type?: string;
	properties?: Record<string, JsonSchemaProperty>;
	items?: JsonSchemaProperty;
	anyOf?: JsonSchemaProperty[];
	required?: string[];
	minLength?: number;
	maxLength?: number;
	minimum?: number;
	maximum?: number;
	exclusiveMinimum?: number;
	exclusiveMaximum?: number;
	pattern?: string;
	format?: string;
	default?: unknown;
	const?: unknown;
	minItems?: number;
	maxItems?: number;
	additionalProperties?: boolean;
}

interface JsonSchema {
	$schema?: string;
	type?: string;
	properties?: Record<string, JsonSchemaProperty>;
	required?: string[];
	additionalProperties?: boolean;
}

export default {
	load() {
		const schemaPath = path.join(__dirname, ".vitepress/config-schema.json");
		const schema: JsonSchema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
		return schema;
	},
};
