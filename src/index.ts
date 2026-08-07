import { Table } from "./table";

const db = new Table();

db.set(1234, {name: "Ryan", age: 20});
db.set(12345, {name: "child", age: 3});

db.setMany([[1, {name: "oldGuy", age: 40}], [2, {name: "dave", age: 50}], [3, {name: "chicken", age: 4}], [4, {name: "rico", age: 70}]])


console.log(
    db.select("*", user => (user.age as number) >= 18)
);


const bytes = db.export();

const dbcopy = Table.import(bytes);

console.log(dbcopy.getall());