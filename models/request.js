import User from "./user.js";
import Friend from "./friend.js";

import { readOrCreate, writeOrCreate } from "./utils.js";

let requests = [];

readOrCreate("request").then((collection) => {
	requests = collection;

	for (const request of requests) {
		Object.setPrototypeOf(request, Request.prototype);
	}
});

const save = () => writeOrCreate("request", requests);

class Request {
	static async create(id1, id2) {
		if (id1 === id2) {
			throw Error("Friendship request with yourself imposible.");
		}

		const user1 = await User.findByPk(id1);

		if (!user1) {
			throw Error("User not found.");
		}

		const user2 = await User.findByPk(id2);

		if (!user2) {
			throw Error("User not found.");
		}

		for (const request of requests) {
			if (request.fromId === id1 && request.toId === id2) {
				throw Error("Dublicate friendship request.");
			}
		}

		const index = requests.findIndex(
			(request) => request.fromId === id2 && request.toId === id1
		);

		if (index !== -1) {
			requests.splice(index, 1);
			await Friend.create(id1, id2);
		} else {
			requests.push({
				fromId: id1,
				toId: id2,
				createdAt: Date.now(),
			});
		}

		await save();
	}

	static async remove(id1, id2) {
		if (id1 === id2) {
			throw Error("Friendship request with yourself imposible.");
		}

		const user1 = await User.findByPk(id1);

		if (!user1) {
			throw Error("User not found.");
		}

		const user2 = await User.findByPk(id2);

		if (!user2) {
			throw Error("User not found.");
		}

		const index = requests.findIndex(
			(request) => request.fromId === id1 && request.toId === id2
		);

		if (index === -1) {
			throw Error("Friendship not found.");
		}

		requests.splice(index, 1);
		await save();
	}

	static async getRequestIds(userId) {
		const requestIds = [];

		for (const { fromId, toId } of requests) {
			if (toId === userId) {
				requestIds.push(fromId);
			}
		}

		return requestIds;
	}

	static async has(userId, targetId) {
		for (const { fromId, toId } of requests) {
			if (fromId === userId && toId === targetId) {
				return true;
			}
		}

		return false;
	}
}

export default Request;
