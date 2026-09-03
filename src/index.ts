import { Table } from "./table";

const db = new Table({name: "string", age: "number", sex: "string"});

db.set({name: "Ryan", age: 20, sex: "M"});
db.set({name: "child", age: 3, sex: "F"});

db.addIndex("name");

db.setMany([{name: "oldGuy", age: 100, sex: "M"}, {name: "Dave", age: 50, sex: "M"}, {name: "chicken", age: 4, sex: "F"}, {name: "Rico", age: 70, sex: "M"}])


db.set({name: "Jim", age: 30, sex: "M"});

db.select("*", (id, value) => true, -1, "name", "Jim",);

console.log(
    db.select(["name", "age"], (id, value) => ((value.age as number) >= 18)).toArray()
);

console.log(
	db.select(
		"*",
		(id, value) => true,
		-1,
		"name",
		"Ryan"
	).toArray()
)

console.log(
    db.select(["name", "age"], (id, value) => ((value.sex as string) === "F")).toArray()
);

db.exportToFile("test.db");

const dbcopy = Table.importFromFile("test.db");

console.log(dbcopy.toArray());

