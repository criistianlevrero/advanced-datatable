import type { TargetDescriptor } from "@advanced-datatable/core";
import type { ITargetIndex } from "./ITargetIndex";
import { serializeTarget } from "./targetKey";

export class TargetIndexImpl implements ITargetIndex {
  /** key → set of opIds */
  private readonly index = new Map<string, Set<string>>();
  /** opId → key (reverse lookup for removal) */
  private readonly reverse = new Map<string, string>();

  add(target: TargetDescriptor, opId: string): void {
    const key = serializeTarget(target);
    let bucket = this.index.get(key);
    if (!bucket) {
      bucket = new Set();
      this.index.set(key, bucket);
    }
    bucket.add(opId);
    this.reverse.set(opId, key);
  }

  remove(opId: string): void {
    const key = this.reverse.get(opId);
    if (!key) return;
    this.reverse.delete(opId);
    const bucket = this.index.get(key);
    if (bucket) {
      bucket.delete(opId);
      if (bucket.size === 0) this.index.delete(key);
    }
  }

  getByTarget(target: TargetDescriptor): string[] {
    const key = serializeTarget(target);
    const bucket = this.index.get(key);
    return bucket ? Array.from(bucket) : [];
  }
}
