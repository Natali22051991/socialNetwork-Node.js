import { readOrCreate, writeOrCreate } from "./utils.js";
import cuid from "cuid";

let messages = [];

readOrCreate("message").then((collection) => (messages = collection));

const save = () => writeOrCreate("message", messages);

class Message {
	static async getUserChats(userId) {
		const userChats = new Set();

		for (const message of messages) {
			if (message.senderId === userId || message.receiverId === userId) {
				userChats.add(message.senderId);
				userChats.add(message.receiverId);
			}
		}

		userChats.delete(userId);

		return Array.from(userChats);
	}

	static async getLastMessage(id1, id2) {
		let message = null;

		for (let i = messages.length - 1; i >= 0; i--) {
			const { senderId, receiverId } = messages[i];

			const isChat =
				(senderId === id1 && receiverId === id2) ||
				(senderId === id2 && receiverId === id1);

			if (!isChat) {
				continue;
			}

			if (!message) {
				message = messages[i];
				continue;
			}

			const { createdAt } = messages[i];

			if (createdAt > message.createdAt) {
				message = messages[i];
			}
		}

		return message;
	}

	static async create(senderId, receiverId, content) {
		const message = {
			id: cuid(),
			senderId,
			receiverId,
			content,
			createdAt: Date.now(),
			readed: false,
		};

		messages.push(message);

		const chatMessages = await Message.getChat(senderId, receiverId);
		while (chatMessages.length > 100) {
			const chatMessage = chatMessages.shift();
			const index = messages.indexOf(chatMessage);
			messages.splice(index, 1);
		}

		await save();
		return message;
	}

	static async getChat(id1, id2) {
		const chat = messages
			.filter((message) => {
				const { senderId, receiverId } = message;

				const isChat =
					(senderId === id1 && receiverId === id2) ||
					(senderId === id2 && receiverId === id1);

				return isChat;
			})
			.sort((a, b) => a.createdAt - b.createdAt);

		return chat;
	}

	static async read(userId, messageId) {
		const message = messages.find((message) => message.id === messageId);

		if (!message) {
			throw Error("Message not found.");
		}

		if (message.readed) {
			throw Error("Message already readed.");
		}

		if (message.receiverId !== userId) {
			throw Error("Permission denied.");
		}

		message.readed = true;
		await save();
	}

	static async hasUnreaded(userId) {
		for (let i = messages.length - 1; i >= 0; i--) {
			const message = messages[i];

			if (message.receiverId === userId && !message.readed) {
				return true;
			}
		}

		return false;
	}
}

export default Message;
