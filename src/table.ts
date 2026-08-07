interface Entry<K, V> {
    key: K;
    value: V;
}

export class Table {
    private tables = new Map<unknown, unknown>();
	private schema_types: {
		keyType: string;
		valueType: string;
	} | null = null;

	set(key: unknown, value: unknown) {
		if (this.schema_types === null) {
			this.schema_types = {
				keyType: typeof key,
				valueType: typeof value
			};
		}
		else if (
			this.schema_types.keyType !== typeof key ||
			this.schema_types.valueType !== typeof value
		) {
			console.log("types do not match: convert to set type");
			return;
		}

		this.tables.set(key, value);
	}

	setMany(sets: [unknown, unknown][]) {
		for (const [f, s] of sets) {
			this.set(f, s);
		}
	}

	select(
		fields: string[] | "*",
		predicate?: (value: Record<string, unknown>) => boolean
	) {
		const results: Record<string, unknown>[] = [];

		for (const value of this.tables.values()) {
			if (typeof value !== "object" || value === null) {
				continue;
			}

			const obj = value as Record<string, unknown>;

			if (predicate && !predicate(obj)) {
				continue;
			}

			if (fields === "*") {
				results.push({ ...obj });
				continue;
			}

			const row: Record<string, unknown> = {};

			for (const field of fields) {
				row[field] = obj[field];
			}

			results.push(row);
		}

		return results;
	}
    get(key: unknown): unknown | undefined {
        return this.tables.get(key);
    }
	getall(): MapIterator<unknown> {
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

    export(): Buffer {
		if (this.tables.size == 0) {
			console.log("Cannot export table of size zero.");
			return Buffer.from("", "utf-8");
		}
		const entries: Entry<unknown, unknown>[] = Array.from(this.tables.entries())
		.map(([key, value]) => ({
			key,
			value
		}));

		const data = {
			schema: this.schema_types,
			entries
		};

		const bytes = Buffer.from(JSON.stringify(data), "utf-8");
		return bytes;
    }

    static import(buffer: Buffer): Table {
		const data = JSON.parse(buffer.toString("utf-8"));

		const table = new Table();

		for (const entry of data.entries) {
			table.set(entry.key, entry.value);
		}

		return table;
	}
}