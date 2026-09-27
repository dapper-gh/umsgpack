import {readdir} from "node:fs/promises";
import {deepEqual} from "node:assert";
import {Decoder} from "./index.mjs";

const decoder = new Decoder();
for (const sample of await readdir("samples")) {
    const [msgpack, json] = await Promise.all([
        `./samples/${sample}/msgpack.json`,
        `./samples/${sample}/json.json`
    ].map(file => import(file, {with: {type: "json"}}).then(mod => mod.default)));
    deepEqual(decoder.decode(msgpack), json);
}
console.log("Passed!");
