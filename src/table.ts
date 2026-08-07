export class Table {
    private tables = new Map<number, Record<string, unknown>>();
	private indexes = new Map<string, Map<unknown, number[]>>();

	set(value: Record<string, unknown>) {
		const id = this.tables.size;
		this.tables.set(id, value);

		for (const [field, index] of this.indexes.entries()) {
			const key = value[field];

			if (!index.has(key)) {
				index.set(key, []);
			}

			index.get(key)!.push(id);
		}
	}

	addIndex(field: string) {
		const idx = new Map<unknown, number[]>();

		for (const [id, value] of this.tables.entries()) {
			const key = value[field];

			if (!idx.has(key)) {
				idx.set(key, []);
			}

			idx.get(key)!.push(id);
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
		indexEquals?: unknown
	): Table {

		let lim = limit;
		const results = new Table();

		let entries: [number, Record<string, unknown>][] = [];

		// Use index if available
		if (indexBy && this.indexes.has(indexBy)) {
			const index = this.indexes.get(indexBy)!;
			let ids : number[];
			if (indexEquals) {
				ids = index.get(indexEquals) ?? [];
			}
			else {
				ids = Array.from(index.values()).flat();
			}
			for (const id of ids) {
					const row = this.tables.get(id);

					if (row) {
						entries.push([id, row]);
					}
				}
		}
		else {
			// Normal scan
			entries = Array.from(this.tables.entries());
		}


		for (const [id, value] of entries) {
			if (lim === 0) {
				break;
			}

			if (predicate && !predicate(id, value)) {
				continue;
			}

			if (fields === "*") {
				results.tables.set(id, value);
			}
			else {
				const row: Record<string, unknown> = {};

				for (const field of fields) {
					row[field] = value[field];
				}

				results.tables.set(id, row);
			}

			lim--;
		}

		return results;
	}

	// delete(key: unknown) {
	// 	this.tables.delete(key);
	// }
	size() : number {
		return this.tables.size;
	}
	clear() {
		this.tables.clear()
		this.indexes.clear()
	}

	toArray() : Record<string, unknown>[] {
		return Array.from(this.tables.values());
	}

    export(): Buffer {
		if (this.tables.size == 0) {
			console.log("Cannot export table of size zero.");
			return Buffer.from("", "utf-8");
		}
		const exportedEntries = Array.from(this.tables.entries())
		.map(([key, value]) => ({
			key,
			value
		}));

		const exportedIndexes = Array.from(this.indexes.entries()).map(
			([field, index]) => ({
				field,
				values: Array.from(index.entries())
			})
		);

		const data = {
			entries : exportedEntries,
			indexes : exportedIndexes
		};

		const bytes = Buffer.from(JSON.stringify(data), "utf-8");
		return bytes;
    }

    static import(buffer: Buffer): Table {
		const data = JSON.parse(buffer.toString("utf-8"));

		const table = new Table();

		for (const exported of data.indexes) {
			table.indexes.set(
				exported.field,
				new Map(exported.values)
			);
		}

		for (const entry of data.entries) {
			table.tables.set(entry.key, entry.value);
		}

		return table;
	}
}