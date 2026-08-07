interface Entry {
    key: unknown;
    value: Record<string, unknown>;
}

export class Table {
    private tables = new Map<unknown, Record<string, unknown>>();
	private key_type: string = "";

	set(key: unknown, value: Record<string, unknown>) {
		if (this.key_type === "") {
			this.key_type = typeof key;
		}
		else if (
			this.key_type !== typeof key
		) {
			console.log("types do not match: convert to set type");
			return;
		}

		this.tables.set(key, value);
	}

	setMany(sets: [unknown, Record<string, unknown>][]) {
		for (const [f, s] of sets) {
			this.set(f, s);
		}
	}

	select(
		fields: string[] | "*",
		predicate?: (id: unknown, value: Record<string, unknown>) => boolean,
		limit: number = -1
	) : Table {
		let lim = limit;
		const results = new Table();

		for (const [id, value] of this.tables.entries()) {
			if (lim == 0) {break;}

			if (predicate && !predicate(id, value)) {
				continue;
			}

			if (fields === "*") {
				results.set(id, value);
			}
			else {
				let row: Record<string, unknown> = {};

				const obj = value;

				for (const field of fields) {
					row[field] = obj[field];
				}

				results.set(id, row);
			}
			lim -= 1;
		}

		return results;
	}
    get(key: unknown): Record<string, unknown> | undefined {
        return this.tables.get(key);
    }
	getall(): MapIterator<[unknown, Record<string, unknown>]> {
		return this.tables.entries();
	}
	keys(): MapIterator<unknown> {
		return this.tables.keys();
	}
	values(): MapIterator<Record<string, unknown>> {
		return this.tables.values();
	}
	delete(key: unknown) {
		this.tables.delete(key);
	}
	size() : number {
		return this.tables.size;
	}
	clear() {
		this.tables.clear()
	}
	has(key: unknown) : boolean {
		return this.tables.has(key);
	}

	toArray() : Record<string, unknown>[] {
		return Array.from(this.tables.entries()).map(([id, value]) => ({
			id,
			...value
		}));
	}

    export(): Buffer {
		if (this.tables.size == 0) {
			console.log("Cannot export table of size zero.");
			return Buffer.from("", "utf-8");
		}
		const entries: Entry[] = Array.from(this.tables.entries())
		.map(([key, value]) => ({
			key,
			value
		}));

		const data = {
			schema: this.key_type,
			entries
		};

		const bytes = Buffer.from(JSON.stringify(data), "utf-8");
		return bytes;
    }

    static import(buffer: Buffer): Table {
		const data = JSON.parse(buffer.toString("utf-8"));

		const table = new Table();

		table.key_type = data.schema;

		for (const entry of data.entries) {
			table.tables.set(entry.key, entry.value);
		}

		return table;
	}
}