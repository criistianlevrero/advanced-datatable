import type { TargetDescriptor } from "@advanced-datatable/core";

export interface ITargetIndex {
  /** Register an op ID under a serialized target key. */
  add(target: TargetDescriptor, opId: string): void;
  /** Remove an op ID from the index. */
  remove(opId: string): void;
  /** Return all pending op IDs for the given target. */
  getByTarget(target: TargetDescriptor): string[];
}
