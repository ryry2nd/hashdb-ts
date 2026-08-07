import { Table } from "./table";

const db = new Table();

db.set(1234, {name: "Ryan", age: 20, sex: "M"});
db.set(12345, {name: "child", age: 3, sex: "F"});

db.setMany([[1, {name: "oldGuy", age: 100, sex: "M"}], [2, {name: "dave", age: 50, sex: "M"}], [3, {name: "chicken", age: 4, sex: "F"}], [4, {name: "rico", age: 70, sex: "M"}]])


console.log(
    db.select(["name", "age"], (id, value) => ((value.age as number) >= 18) && (id as number) < 100, 2).getall()
);


const bytes = db.export();

const dbcopy = Table.import(bytes);

console.log(dbcopy.select("*", (id, value) => true).getall());