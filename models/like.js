import Post from "./post.js";
import { readOrCreate, writeOrCreate } from "./utils.js";

let likes = [];

readOrCreate("like").then((collection) => {
	likes = collection;

	for (const like of likes) {
		Object.setPrototypeOf(like, Like.prototype);
	}
});

const save = () => writeOrCreate("like", likes);

class Like {
	static async toggle(userId, postId) {
		const post = await Post.findByPk(postId);

		if (!post) {
			throw Error("Post not founded.");
		}

		const index = likes.findIndex(
			(like) => like.userId === userId && like.postId === postId
		);

		if (index !== -1) {
			likes.splice(index, 1);
		} else {
			likes.push({
				userId,
				postId,
				createdAt: Date.now(),
			});
		}

		await save();
		return true;
	}

	static async getUserIds(postId) {
		const userIds = [];

		for (const like of likes) {
			if (like.postId === postId) {
				userIds.push(like.userId);
			}
		}

		return userIds;
	}

	static async removeForPost(postId) {
		likes = likes.filter((like) => like.postId !== postId);
		await save();
	}
}

export default Like;
