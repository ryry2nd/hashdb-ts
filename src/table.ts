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

    export(): Buffer {
		if (this.tables.size == 0) {
			throw new Error(`Cannot export table of size zero.`);
		}
		const exportedEntries = Array.from(this.tables.entries())
		.map(([key, value]) => ({
			key,
			value
		}));

		const exportedIndexes = Array.from(this.indexes.entries()).map(
			([field, index]) => ({
				field,
				values: Array.from(index.entries()).map(
					([key, ids]) => [key, Array.from(ids)]
				)
			})
		);

		const data = {
			entries : exportedEntries,
			indexes : exportedIndexes,
			nextID: this.nextID,
			types: this.types
		};

		const bytes = Buffer.from(JSON.stringify(data), "utf-8");
		return bytes;
    }

    static import(buffer: Buffer): Table {
		if (buffer.length === 0) {
			throw new Error(`Cannot create table from empty buffer`);
		}

		const data = JSON.parse(buffer.toString("utf-8"));
		const table = new Table(data.types);

		for (const exported of data.indexes) {
			const index = new Map<unknown, Set<number>>();

			for (const [key, ids] of exported.values) {
				index.set(key, new Set<number>(ids));
			}

			table.indexes.set(exported.field, index);
		}

		for (const entry of data.entries) {
			table.tables.set(entry.key, entry.value);
		}

		table.nextID = data.nextID;

		return table;
	}
}