import React from "react";
import { BasicExample } from "./examples/basic";
import { BulkEditExample } from "./examples/bulk-edit";
import { SchemaDynamicExample } from "./examples/schema-dynamic";
import { ReplayOnReconnectExample } from "./examples/replay-on-reconnect";
import { ErrorRecoveryExample } from "./examples/error-recovery";
import { PartialResponseExample } from "./examples/partial-response";
import { EndToEndExample } from "./examples/end-to-end";

export function App() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 24, maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Advanced DataTable Playground</h1>
      <p style={{ color: "#666", marginBottom: 8 }}>
        Explore the full capabilities of the DataTable, including offline support,
        error recovery, and advanced synchronization features.
      </p>
      <div
        style={{
          marginBottom: 24,
          padding: "10px 16px",
          backgroundColor: "#e7f3ff",
          borderRadius: 6,
          fontSize: 14,
        }}
      >
        <strong>Real backend:</strong> run{" "}
        <code style={{ backgroundColor: "#dce9fa", padding: "1px 6px", borderRadius: 4 }}>
          npm run mock-backend
        </code>{" "}
        in a separate terminal to enable the End-to-End example below.
      </div>
      <hr />

      <BasicExample />
      <hr />

      <BulkEditExample />
      <hr />

      <SchemaDynamicExample />
      <hr />

      <ReplayOnReconnectExample />
      <hr />

      <ErrorRecoveryExample />
      <hr />

      <PartialResponseExample />
      <hr />

      <EndToEndExample />
    </main>
  );
}
