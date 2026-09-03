import { readFileSync, writeFileSync } from "fs";

export class Table {
    private tables = new Map<number, unknown[]>();
	private indexes = new Map<string, Map<unknown, Set<number>>>();
	private nextID = 0;
	private types: Record<string, string>;

	constructor(types: Record<string, string>) {
		this.types = types;
    }

	private fieldToNumber(field: string) : number {
		return Object.keys(this.types).indexOf(field);
	}

	private convertToType(value: Record<string, unknown>): unknown[] {
		return Object.keys(this.types).map(field => value[field]);
	}

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

	exportToFile(filename: string) {
		const ex = this.export();

		writeFileSync(filename, ex);
	}

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

	static importFromFile(filename: string): Table {
		const data = readFileSync(filename, "utf8");
		return Table.import(data);
	}
}