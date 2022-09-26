import { join, resolve } from "path";
import { existsSync, mkdirSync } from "fs";
import { readFile, rm, writeFile } from "fs/promises";

const __dirname = resolve();

async function dirPreparation(modelName) {
	const dataPath = join(__dirname, "/data/");

	if (!existsSync(dataPath)) {
		mkdirSync(dataPath);
	}

	return join(dataPath, `${modelName}.json`);
}

export async function writeOrCreate(mode, collection) {
	const filePath = await dirPreparation(mode);

	if (existsSync(filePath)) {
		await rm(filePath);
	}

	await writeFile(filePath, JSON.stringify(collection, null, 3), "utf-8");
}

export async function readOrCreate(model, defaultCollection = []) {
	const filePath = await dirPreparation(model);

	if (!existsSync(filePath)) {
		await writeFile(
			filePath,
			JSON.stringify(defaultCollection, null, 3),
			"utf-8"
		);
	}

	const data = await readFile(filePath, "utf-8");
	return JSON.parse(data || "[]");
}

export function getCopy(data, prototype) {
	const copy = JSON.parse(JSON.stringify(data));

	if (prototype) {
		if (Array.isArray(copy)) {
			for (const item of copy) {
				Object.setPrototypeOf(item, prototype);
			}
		} else if (copy instanceof Object) {
			Object.setPrototypeOf(copy, prototype);
		}
	}

	return copy;
}
