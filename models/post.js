import Like from "./like.js";
import { getCopy, readOrCreate, writeOrCreate } from "./utils.js";

let posts = [];

readOrCreate("post").then((collection) => (posts = collection));
const save = () => writeOrCreate("post", posts);

class Post {
	static async likeDefine(postId, userId) {
		const likes = await Like.getUserIds(postId);

		return {
			likes: likes.length,
			liked: likes.includes(userId),
		};
	}

	static async create(userId, wallId, content) {
		if (!userId || !wallId || !content) {
			throw Error("Not found all needed variables.");
		}

		const ids = posts.map((post) => post.id);

		const post = {
			id: Math.max(0, ...ids) + 1,
			wallId,
			content,
			userId,
			createdAt: Date.now(),
		};

		posts.push(post);
		await save();

		return getCopy(post);
	}

	static async findByPk(postId) {
		const post = posts.find((post) => post.id === postId) || null;
		return getCopy(post);
	}

	static async findByUser(userId) {
		const userPosts = posts.filter((post) => post.wallId === userId);
		return getCopy(userPosts);
	}

	static async remove(userId, postId) {
		const index = posts.findIndex((post) => post.id === postId);

		if (index === -1) {
			throw Error("Post not found.");
		}

		const post = posts[index];

		if (post.userId !== userId && post.wallId !== userId) {
			throw Error("Permission denied.");
		}

		posts.splice(index, 1);

		await Promise.all([Like.removeForPost(postId), save()]);

		return true;
	}

	static async update(userId, postId, content) {
		const post = posts.find((post) => post.id === postId);

		if (!post) {
			throw Error("Post not found");
		}

		if (post.userId !== userId) {
			throw Error("Permission denied.");
		}

		if (!content.length) {
			throw Error("Content can't be empty.");
		}

		post.content = content;
		await save();
		return getCopy(post);
	}
}

export default Post;
