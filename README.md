# xjmapper

```typescript
import { parse, serialize } from "xjmapper";

const byteData: Uint8Array = serialize({foo: "bar"}, "x", "y", "z");

const parsedData = parse(byteData, 3 /* max count of entries */);

assert.equal(parsedData.length, 3);
assert.deepEqual(parsedData[0], {foo: "bar"});
assert.equal(parsedData[1], "x");
assert.equal(parsedData[2], "y");

```