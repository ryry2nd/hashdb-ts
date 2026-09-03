import { Table } from "./table";

const db = new Table({name: "string", age: "number", sex: "string"});

db.set({name: "Ryan", age: 20, sex: "M"});
db.set({name: "child", age: 3, sex: "F"});

db.addIndex("name");

db.setMany([{name: "oldGuy", age: 100, sex: "M"}, {name: "mclovin", age: 65, sex:"M"}, {name: "Dave", age: 50, sex: "M"}, {name: "chicken", age: 4, sex: "F"}, {name: "Rico", age: 70, sex: "M"}])


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

let newChild = db.select("*", (id, value) =>(((value.sex as string) === "F") && ((value.name as string) === "child")), 1, undefined, undefined, true).toArray()[0];
newChild["sex"] = "M"
db.set(newChild);

let middleaged = db.select("*", (id, value) => ((value.age as number) >= 40 && (value.age as number) <= 70), undefined, undefined, undefined, true).toArray();

for (let i = 0; i < middleaged.length; i++) {
	middleaged[i]["age"] = (middleaged[i]["age"] as number) + 1;
}
db.setMany(middleaged);

db.exportToFile("test.db");

const dbcopy = Table.importFromFile("test.db");

console.log(dbcopy.toArray());

