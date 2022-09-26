import { extname, resolve } from "path";
import { rename } from "fs/promises";
import http from "http";

import session from "express-session";
import express from "express";
import bodyParser from "body-parser";
import multer from "multer";
import { Server } from "socket.io";

import Friend from "./models/friend.js";
import Like from "./models/like.js";
import Post from "./models/post.js";
import User from "./models/user.js";
import Request from "./models/request.js";
import Message from "./models/message.js";

const __dirname = resolve();
const multerPath = resolve(__dirname, "../front/sets/");

const app = express();
const upload = multer({ dest: multerPath });
const server = http.createServer(app);

const receiver = [
	bodyParser.json(),
	bodyParser.urlencoded({ extended: false }),
	upload.none(),
];

const sessionMiddleware = session({
	secret: Date.toString(),
	resave: false,
	saveUninitialized: true,
});

app.set("trust proxy", 1);

app.use(sessionMiddleware);

if (process.env.NODE_ENV === "development") {
	app.use(async (req, res, next) => {
		if (!Object.hasOwn(req.session, "isAuthenticated")) {
			const user = await User.findByPk(1);

			if (user) {
				Object.assign(req.session, {
					isAuthenticated: true,
					user,
				});
			} else {
				Object.assign(req.session, {
					isAuthenticated: false,
					user: null,
				});
			}
		}

		next();
	});
} else {
	app.use((req, res, next) => {
		if (!Object.hasOwn(req.session, "isAuthenticated")) {
			Object.assign(req.session, {
				isAuthenticated: false,
				user: null,
			});
		}

		next();
	});
}

app.use(express.static(resolve(__dirname, "../front/")));

app.use((req, res, next) => {
	if (!Object.hasOwn(req.session, "isAuthenticated")) {
		Object.assign(req.session, {
			isAuthenticated: false,
			user: null,
		});
	}

	next();
});

app.post("/api/reg", receiver, async (req, res) => {
	try {
		const user = await User.create(req.body);
		res.status(200).json(user).end();
	} catch (error) {
		console.error(error);
		res.status(400).send(error.message).end();
	}
});

app.get("/api/session", authenticated, async (req, res) => {
	res.status(200).json(req.session.user).end();
});

app.post("/api/signin", receiver, async (req, res) => {
	try {
		const { email, password } = req.body;
		const user = await User.authenticate(email, password);

		Object.assign(req.session, { isAuthenticated: true, user });

		res.status(200).json(user).end();
	} catch (error) {
		console.error(error);
		res.status(400).end(error.message);
	}
});

app.post("/api/signout", async (req, res) => {
	if (req.session.isAuthenticated) {
		Object.assign(req.session, {
			isAuthenticated: false,
			user: null,
		});
	}

	res.status(200).end();
});

app.get("/api/user/:userId", async (req, res) => {
	try {
		const userId = parseInt(req.params.userId, 10);

		if (!userId) {
			throw Error("userId get param not found.");
		}

		const user = await User.findByPk(userId);

		if (!user) {
			throw Error("User not found.");
		}

		let posts = await Post.findByUser(userId);
		posts = await Promise.all(
			posts.map((post) =>
				Post.likeDefine(post.id, req.session?.user?.id).then(
					(data) => ({
						...post,
						...data,
					})
				)
			)
		);

		posts = await Promise.all(
			posts.map((post) =>
				User.findByPk(post.userId).then((user) => ({ ...post, user }))
			)
		);

		posts = posts.sort((a, b) => b.createdAt - a.createdAt);

		const data = { user, posts };

		if (req.session.isAuthenticated) {
			data.friend = await Friend.isFriends(req.session.user.id, userId);
			data.request = await Request.has(req.session.user.id, userId);
		}

		res.status(200).json(data);
	} catch (error) {
		console.error(error);
		res.status(400).send(error.message).end();
	}
});

app.post("/api/request/:userId", authenticated, async (req, res) => {
	try {
		const userId = parseInt(req.params.userId, 10);
		await Request.create(req.session.user.id, userId);
		res.status(200).end();
	} catch (error) {
		console.error(error);
		res.status(400).send(error.message).end();
	}
});

app.post("/api/revoke/:userId", authenticated, async (req, res) => {
	try {
		const userId = parseInt(req.params.userId, 10);
		await Request.remove(req.session.user.id, userId);
		res.status(200).end();
	} catch (error) {
		console.error(error);
		res.status(400).send(error.message).end();
	}
});

app.get("/api/friends", authenticated, async (req, res) => {
	try {
		const friendIds = await Friend.getFriendIds(req.session.user.id);
		const requestIds = await Request.getRequestIds(req.session.user.id);

		const friends = await Promise.all(friendIds.map(User.findByPk));
		const requests = await Promise.all(requestIds.map(User.findByPk));

		res.status(200).json({ friends, requests });
	} catch (error) {
		console.error(error);
		res.status(400).send(error.message).end();
	}
});

app.post("/api/post", authenticated, receiver, async (req, res) => {
	try {
		if (req.session.user.id !== req.body.userId) {
			const isFriends = await Friend.isFriends(
				req.session.user.id,
				req.body.userId
			);

			if (!isFriends) {
				throw Error("Not friend relationship.");
			}
		}

		const post = await Post.create(
			req.session.user.id,
			req.body.userId,
			req.body.content
		);

		res.status(200).json(post).end();
	} catch (error) {
		console.error(error);
		res.status(400).send(error.message).end();
	}
});

app.post("/api/liketoggle/:postId", authenticated, async (req, res) => {
	try {
		const postId = parseInt(req.params.postId, 10);
		await Like.toggle(req.session.user.id, postId);
		let post = await Post.findByPk(postId);

		const likesData = await Post.likeDefine(post.id, req.session?.user?.id);
		const author = await User.findByPk(post.userId);

		res.status(200)
			.json({
				...post,
				...likesData,
				user: author,
			})
			.end();
	} catch (error) {
		console.error(error);
		res.status(400).send(error.message).end();
	}
});

app.delete("/api/post/:postId", authenticated, async (req, res) => {
	try {
		const postId = parseInt(req.params.postId, 10);
		await Post.remove(req.session.user.id, postId);
		res.status(200).end();
	} catch (error) {
		console.error(error);
		res.status(400).send(error.message).end();
	}
});

app.delete("/api/friend/:userId", authenticated, async (req, res) => {
	try {
		const userId = parseInt(req.params.userId, 10);
		await Friend.remove(req.session.user.id, userId);
		res.status(200).end();
	} catch (error) {
		console.error(error);
		res.status(400).send(error.message).end();
	}
});

app.get("/api/users", async (req, res) => {
	const users = await User.findMany();
	res.status(200).json(users).end();
});

app.patch("/api/user", authenticated, receiver, async (req, res) => {
	try {
		const user = await User.update(req.session.user.id, req.body || {});
		req.session.user = user;
		res.status(200).end();
	} catch (error) {
		console.error(error);
		res.status(400).send(error.message).end();
	}
});

app.patch("/api/user/password", authenticated, receiver, async (req, res) => {
	try {
		if (!req.body.password) {
			throw Error("Password not found");
		}

		const { password } = req.body;

		if (password.length < 3) {
			throw Error("Password must be at least 3 characters long.");
		}

		await User.updatePassword(req.session.user.id, password);
		res.status(200).end();
	} catch (error) {
		console.error(error);
		res.status(400).send(error.message).end();
	}
});

// {
// 	fieldname: 'avatar',
// 	originalname: 'pretty-smiling-joyfully-female-with-fair-hair-dressed-casually-looking-with-satisfaction_176420-15187.png',
// 	encoding: '7bit',
// 	mimetype: 'image/png',
// 	destination: '/home/aleksey/Desktop/socialnet/front/sets',
// 	filename: 'e7f5a7c8f6ff531b93f43f66745c3ff7',
// 	path: '/home/aleksey/Desktop/socialnet/front/sets/e7f5a7c8f6ff531b93f43f66745c3ff7',
// 	size: 111314
// }

app.patch(
	"/api/user/avatar",
	authenticated,
	upload.single("avatar"),
	async (req, res) => {
		try {
			if (!req.file) {
				throw Error("File not found");
			}

			const { file } = req;

			const ext = extname(file.originalname);
			const fromPath = file.path;
			const toPath = resolve(file.destination, `${file.filename}${ext}`);
			await rename(fromPath, toPath);

			const user = await User.update(req.session.user.id, {
				img: `/sets/${file.filename}${ext}`,
			});

			req.session.user = user;
			res.status(200).end();
		} catch (error) {
			console.error(error);
			res.status(400).send(error.message).end();
		}
	}
);

app.patch("/api/post/:postId", authenticated, receiver, async (req, res) => {
	try {
		const postId = parseInt(req.params.postId, 10);
		await Post.update(req.session.user.id, postId, req.body.content);

		const post = await Post.findByPk(postId);
		const likesData = await Post.likeDefine(post.id, req.session?.user?.id);
		const author = await User.findByPk(post.userId);

		res.status(200)
			.json({
				...post,
				...likesData,
				user: author,
			})
			.end();
	} catch (error) {
		console.error(error);
		res.status(400).send(error.message).end();
	}
});

server.listen(8081, () => console.log("Express server started on 8081 port."));

function authenticated(req, res, next) {
	if (req.session.isAuthenticated) {
		next();
	} else {
		res.status(401).send("Not authenticated.").end();
	}
}

const chatIo = new Server(server, {
	path: "/api/chat",
});

const wrap = (middleware) => (socket, next) =>
	middleware(socket.request, {}, next);

chatIo.use(wrap(sessionMiddleware));

const online = new Map();

chatIo.on("connection", async (socket) => {
	const { session } = socket.request;

	if (!session.isAuthenticated) {
		socket.disconnect(true);
		return;
	}

	if (!online.has(session.user.id)) {
		online.set(session.user.id, new Set());
	}

	online.get(session.user.id).add(socket);

	socket.on("disconnection", () => {
		const sockets = online.get(session.user.id);
		sockets.delete(socket);

		if (!sockets.size) {
			online.delete(session.user.id);
		}
	});

	const userChats = await Message.getUserChats(session.user.id);

	const datas = await Promise.all(
		userChats.map(async (userChat) => {
			const message = await Message.getLastMessage(
				userChat,
				session.user.id
			);

			const [sender, receiver] = await Promise.all([
				User.findByPk(message.senderId),
				User.findByPk(message.receiverId),
			]);

			return {
				message,
				sender,
				receiver,
			};
		})
	);

	socket.emit("init", datas);

	socket.on("getChat", async (friendId, callback) => {
		const [messages, friend] = await Promise.all([
			Message.getChat(session.user.id, friendId),
			User.findByPk(friendId),
		]);

		callback({ messages, friend });
	});

	socket.on("message", async (message) => {
		const senderId = session.user.id;
		const receiverId = message.friendId;

		message = await Message.create(senderId, receiverId, message.content);

		if (online.has(receiverId)) {
			await Message.read(receiverId, message.id);

			for (const ws of online.get(receiverId)) {
				ws.emit("message", message);
			}
		}

		if (online.has(senderId)) {
			for (const ws of online.get(senderId)) {
				ws.emit("message", message);
			}
		}
	});
});

const notificationIo = new Server(server, {
	path: "/api/notification",
});

notificationIo.use(wrap(sessionMiddleware));

notificationIo.on("connection", async (socket) => {
	const { session } = socket.request;

	if (!session.isAuthenticated) {
		socket.disconnect(true);
		return;
	}

	const flag = await Message.hasUnreaded(session.user.id);

	if (flag) {
		socket.emit("status", true);
	}

	socket.on("status", async (messageId, callback) => {
		try {
			await Message.read(session.user.id, messageId);
		} catch (error) {
			console.error(error.message);
		}

		const flag = await Message.hasUnreaded(session.user.id);
		callback(flag);
	});
});
