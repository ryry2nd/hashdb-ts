import { readFileSync, writeFileSync } from "fs";

export class Table {
    private tables = new Map<number, unknown[]>(); // just a key-value pair
	private indexes = new Map<string, Map<unknown, Set<number>>>(); // makes sorting quicker, it is just Map<indexType, Map<indexValue, index>>
	private nextID = 0; // the next unused index, don't confuse with size.
	private types: Record<string, string>; // all of the names and types of every column. It's a schema

	constructor(types: Record<string, string>) {
		this.types = types;
    }

	// converts the string field (ex: age, name, sex) to an index
	private fieldToNumber(field: string) : number {
		return Object.keys(this.types).indexOf(field);
	}

	// converts a map to a simple array
	private convertToType(value: Record<string, unknown>): unknown[] {
		return Object.keys(this.types).map(field => value[field]);
	}

	// adds the entry to the table
	/*
	F = number of fields in the schema
	V = number of fields in the input value
	T = number of indexes

	The first loop is O(V).
	The second loop and convertToType() are O(F).
	The index update loop is O(T).

	Since every index corresponds to a schema field:
	T <= F.

	If valid input is guaranteed to contain exactly the schema fields,
	then V = F, giving an overall time complexity of O(F).
	*/
	set(value: Record<string, unknown>) {
		for (const field of Object.keys(value)) {
			if (!Object.prototype.hasOwnProperty.call(this.types, field)) {
				throw new Error(`Unknown field: ${field}`);
			}
		}

		for (const [field, type] of Object.entries(this.types)) {
			if (!(field in value) || typeof value[field] !== type) {
				throw new Error(`Type mismatch for: ${field}: ${type}`);
			}
		}

		const id = this.nextID++;
		this.tables.set(id, this.convertToType(value));

		for (const [field, index] of this.indexes.entries()) {
			const key = value[field];

			if (!index.has(key)) {
				index.set(key, new Set<number>());
			}

			index.get(key)!.add(id);
		}
	}

	// Simply adds a new index of the inputted column and adds all previous values to it.
	addIndex(field: string) {
		if (!(field in this.types)) {
			throw new Error(`Unknown field: ${field}`);
		}

		const idx = new Map<unknown, Set<number>>();

		for (const [id, value] of this.tables.entries()) {
			const key = value[this.fieldToNumber(field)];

			if (!idx.has(key)) {
				idx.set(key, new Set<number>);
			}

			idx.get(key)!.add(id);
		}

		this.indexes.set(field, idx);
	}

	setMany(sets: Record<string, unknown>[]) {
		for (const set of sets) {
			this.set(set);
		}
	}

	// Searches through the table with certain parameters and returns a new Table.
	// It can also delete all of the selected elements.
	/*
	Since this function does a lot the time complexity heavily depends on what parameters are used

	N = number of rows
	F = number of fields

	Best case:
		O(F) (assuming you don't set the limit to 0 otherwise it's technically O(1))
		This occurs when an indexed equality lookup is used and the lookup
		returns no matching rows (or the limit is 0). The function still
		has to process the table schema.
	Worst case:
		O(NF)
		If no useful index is used, the function may have to examine every
		row in the table. Each row requires iterating through all F fields
		to construct the record.
	 */
	select(
		fields: string[] | "*",
		predicate?: (id: number, value: Record<string, unknown>) => boolean,
		limit: number = -1,
		indexBy?: string,
		indexEquals?: unknown,
		remove: boolean = false
	): Table {

		let lim = limit;
		const results = new Table({});

		if (fields === "*") {
			results.types = { ...this.types };
		}
		else {
			for (const field of fields) {
				if (!(field in this.types)) {
					throw new Error(`Unknown field: ${field}`);
				}

				results.types[field] = this.types[field];
			}
		}

		let ids: number[];

		if (indexBy !== undefined && this.indexes.has(indexBy)) {
			const index = this.indexes.get(indexBy)!;

			if (indexEquals !== undefined) {
				ids = Array.from(index.get(indexEquals) ?? []);
			}
			else {
				ids = Array.from(index.values()).flatMap(set => [...set]);
			}
		}
		else {
			ids = Array.from(this.tables.keys());
		}

		for (const id of ids) {
			if (lim === 0) {
				break;
			}

			const value = this.tables.get(id);

			if (!value) {
				continue;
			}

			const record: Record<string, unknown> = {};

			for (const [index, field] of Object.keys(this.types).entries()) {
				record[field] = value[index];
			}

			if (predicate && !predicate(id, record)) {
				continue;
			}

			if (fields === "*") {
				results.tables.set(id, [...value]);
			}
			else {
				const row = fields.map(field =>
					value[this.fieldToNumber(field)]
				);

				results.tables.set(id, row);
			}

			if (remove) {
				this.tables.delete(id);

				for (const [field, index] of this.indexes) {
					const key = value[this.fieldToNumber(field)];
					const ids = index.get(key);

					if (!ids) continue;

					ids.delete(id);

					if (ids.size === 0) {
						index.delete(key);
					}
				}
			}

			lim--;
		}

		return results;
	}

	size() : number {
		return this.tables.size;
	}
	clear() {
		this.tables.clear()
		this.indexes.clear()
		this.nextID = 0;
	}

	// converts the entire table to a printable array
	toArray(): Record<string, unknown>[] {
		const result: Record<string, unknown>[] = [];

		for (const value of this.tables.values()) {
			const row: Record<string, unknown> = {};

			for (const [index, field] of Object.keys(this.types).entries()) {
				row[field] = value[index];
			}

			result.push(row);
		}

		return result;
	}

	// compacts all indexes to not skip them. Only used automatically when exporting.
	optimize() {
		let subBy = 0;

		let newTables = this.tables;
		let newIndexes = this.indexes;

		const indexKeys = Array.from(this.indexes.keys());

		for (let i = 0; i < this.nextID; i++) {
			if (!newTables.has(i)) {
				subBy++;
			}
			else {
				const tmp = newTables.get(i);
				if (tmp !== undefined) {
					newTables.set(i - subBy, tmp);
					if (subBy > 0) {
						newTables.delete(i);
					}

					// updating indexes
					for (const [field, index] of newIndexes) {
						const ids = index.get(tmp[this.fieldToNumber(field)]);

						if (ids) {
							ids.delete(i);
							ids.add(i - subBy);
						}
					}

				}
				else {
					throw Error(`Optimization failed: Key not found`);
				}
			}
		}

		this.tables = newTables;
		this.indexes = newIndexes;

		this.nextID = this.tables.size;
	}

	// Converts the entire table and all entries and indexes to json format
    export(): string {
		if (this.tables.size == 0) {
			throw new Error(`Cannot export table of size zero.`);
		}

		this.optimize();

		const exportedEntries = Array.from(this.tables.values());

		const exportedIndexes = Array.from(this.indexes.entries()).map(
			([field, index]) => ([
				field,
				Array.from(index.entries()).map(
					([key, ids]) => [key, Array.from(ids)]
				)
			])
		);

		const data = [
			this.types,
			exportedEntries,
			exportedIndexes,
		];

		return JSON.stringify(data);
    }

	// exports database to json and then sends it to a file
	exportToFile(filename: string) {
		const ex = this.export();

		writeFileSync(filename, ex);
	}

	// converts a json string to a new Table
    static import(buffer: string): Table {
		if (buffer.length === 0) {
			throw new Error(`Cannot create table from empty buffer`);
		}

		const data = JSON.parse(buffer);
		const table = new Table(data[0]);

		for (const exported of data[2]) {
			const index = new Map<unknown, Set<number>>();

			for (const [key, ids] of exported[1]) {
				index.set(key, new Set<number>(ids));
			}

			table.indexes.set(exported[0], index);
		}

		let i = 0;
		for (const entry of data[1]) {
			table.tables.set(i, entry);
			i++
		}

		table.nextID = table.tables.size;

		return table;
	}

	// Gets the data from a file and converts it to a new table
	static importFromFile(filename: string): Table {
		const data = readFileSync(filename, "utf8");
		return Table.import(data);
	}
}