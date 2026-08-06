import { Table } from "./table";

interface User {
    name: string;
    age: number;
}

const db = new Table<number, User>();

db.set(1234, {name: "Ryan", age: 20});

console.log(db.get(1234));

const bytes = db.export();

console.log(bytes);

const dbcopy = Table.import<number, User>(bytes);

console.log(dbcopy.get(1234));