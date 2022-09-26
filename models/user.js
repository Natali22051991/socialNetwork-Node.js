import { getCopy, readOrCreate, writeOrCreate } from "./utils.js";

const emailRegex =
	/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

let users = [];

readOrCreate("user").then((collection) => {
	users = collection;

	for (const user of users) {
		Object.setPrototypeOf(user, User.prototype);
	}
});

const save = () => writeOrCreate("user", users);
const getUserCopy = (user) => {
	const copy = getCopy(user, User.prototype);

	if (copy && Object.hasOwn(copy, "password")) {
		delete copy.password;
	}

	return copy;
};

class User {
	save() {
		return User.save();
	}

	static async create(data) {

		for (const field of ["name", "surname", "email", "password"]) {
			if (!Object.hasOwn(data, field)) {
				throw Error(`${field} field not found.`);
			}

			if (!data[field]) {
				throw Error(`${field} must by not empty.`);
			}
		}

		if (!emailRegex.test(data.email)) {
			throw Error("Not email format.");
		}

		if (data.password.length < 3) {
			throw Error(`Password must by less 3 symbols.`);
		}

		const emails = users.map((user) => user.email);

		if (emails.includes(data.email)) {
			throw Error(`User with this email exsist.`);
		}

		const ids = users.map((user) => user.id);

		const user = {
			id: Math.max(0, ...ids) + 1,
			name: data.name,
			surname: data.surname,
			email: data.email,
			password: data.password,
			img: "/sets/avatar.png",
			status: "",
		};

		Object.setPrototypeOf(user, User.prototype);

		users.push(user);
		await save();

		return getUserCopy(user);
	}

	static async authenticate(email, password) {
		const user = users.find((user) => user.email === email);

		if (!user) {
			throw Error("User not found.");
		}

		if (user.password !== password) {
			throw Error("User password uncorrect");
		}

		return getUserCopy(user);
	}

	static async findByPk(primaryKey) {
		const user = users.find((user) => user.id === primaryKey) || null;
		return getUserCopy(user);
	}

	static async findMany() {
		return getUserCopy(users);
	}

	static async update(userId, data) {
		const user = users.find((user) => user.id === userId);

		if (!user) {
			throw Error("User not found.");
		}

		const datum = (({ id, ...datum }) => datum)(data);

		if (Object.hasOwn(datum, "email")) {
			for (const cUser of users) {
				if (cUser.email === datum.email) {
					throw Error("Email dublicate.");
				}
			}
		}

		Object.assign(user, datum);
		await save();

		return getUserCopy(user);
	}

	static async updatePassword(userId, password) {
		const user = users.find((user) => user.id === userId);

		if (!user) {
			throw Error("User not found.");
		}

		if (user.password === password) {
			throw Error("The new and old passwords are the same.");
		}

		user.password = password;
		await save();
		return true;
	}
}

export default User;
