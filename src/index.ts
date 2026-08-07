import { Table } from "./table";

const db = new Table();

db.set({name: "Ryan", age: 20, sex: "M"});
db.set({name: "child", age: 3, sex: "F"});

db.addIndex("name");

db.setMany([{name: "oldGuy", age: 100, sex: "M"}, {name: "dave", age: 50, sex: "M"}, {name: "chicken", age: 4, sex: "F"}, {name: "rico", age: 70, sex: "M"}])

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

const bytes = db.export();

const dbcopy = Table.import(bytes);

console.log(dbcopy.toArray());