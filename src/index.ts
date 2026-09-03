import { Table } from "./table";

const db = new Table({name: "string", age: "number", sex: "string"});

//set all entries

db.set({name: "Ryan", age: 20, sex: "M"});
db.set({name: "child", age: 3, sex: "F"});

db.addIndex("name");

db.setMany([{name: "oldGuy", age: 100, sex: "M"}, {name: "mclovin", age: 65, sex:"M"}, {name: "Dave", age: 50, sex: "M"}, {name: "chicken", age: 4, sex: "F"}, {name: "Rico", age: 70, sex: "M"}])

db.set({name: "Bob", age: 50, sex: "M"});
db.set({name: "Bob", age: 52, sex: "M"});

db.setMany([{name: "Leonardo", age: 17, sex: "M"}, {name: "Donatello", age: 17, sex: "M"}, {name: "Raphael", age: 17, sex: "M"}, {name: "Michelangelo", age: 17, sex: "M"}]);

db.set({name: "Jim", age: 30, sex: "M"});


// print all entries younger than 18
console.log(
    db.select(["name", "age"], (id, value) => ((value.age as number) < 18)).toArray()
);

// print the entry which the name is Ryan
console.log(
	db.select(
		"*",
		(id, value) => true,
		-1,
		"name",
		"Ryan"
	).toArray()
)

// print all of the female entries
console.log(
    db.select(["name", "age"], (id, value) => ((value.sex as string) === "F")).toArray()
);

// changes the child so it is Male instead of Female
let newChild = db.select("*", (id, value) =>(((value.sex as string) === "F")), 1, "name", "child", true).toArray()[0];
newChild["sex"] = "M"
db.set(newChild);

// adds 1 to the age of every person whose age is greater or equal to 40 and less than or equal to 70
let middleaged = db.select("*", (id, value) => ((value.age as number) >= 40 && (value.age as number) <= 70), undefined, undefined, undefined, true).toArray();

for (let i = 0; i < middleaged.length; i++) {
	middleaged[i]["age"] = (middleaged[i]["age"] as number) + 1;
}
db.setMany(middleaged);

// exports to a file and then reimport it and prints it. this just tests if the data persists through the export
db.exportToFile("test.db");

const dbcopy = Table.importFromFile("test.db");

console.log(dbcopy.toArray());

