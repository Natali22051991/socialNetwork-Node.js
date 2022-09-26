import { readOrCreate, writeOrCreate } from "./utils.js";

let friends = [];
readOrCreate("friend").then((collection) => (friends = collection));
const save = () => writeOrCreate("friend", friends);

class Friend {
	static async create(id1, id2) {
		if (id1 === id2) {
			throw Error("Can't by friend yourself.");
		}

		friends.push([Math.min(id1, id2), Math.max(id1, id2)]);

		await save();
		return true;
	}

	static async remove(id1, id2) {
		if (id1 === id2) {
			throw Error("Can't by friend yourself.");
		}

		const pair = [Math.min(id1, id2), Math.max(id1, id2)];
		const index = friends.find(([a, b]) => a === pair[0] && b === pair[1]);

		if (index === -1) {
			throw Error("Friendsship not found.");
		}

		friends.splice(index, 1);

		await save();
		return true;
	}

	static async getFriendIds(userId) {
		const ids = new Set();

		for (const [a, b] of friends) {
			if (a === userId || b === userId) {
				ids.add(a);
				ids.add(b);
			}
		}

		ids.delete(userId);
		return Array.from(ids);
	}

	static async isFriends(id1, id2) {
		if (id1 === id2) {
			return false;
		}

		[id1, id2] = [Math.min(id1, id2), Math.max(id1, id2)];

		for (const friend of friends) {
			if (friend[0] === id1 && friend[1] === id2) {
				return true;
			}
		}

		return false;
	}
}

export default Friend;
