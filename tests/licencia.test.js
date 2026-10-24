import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { comprobar, emitir } from "../scripts/licencia.mjs";

test("emite licencias que se comprueban con su clave pública", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const lic = emitir({ nombre: "Ana", email: "ana@example.com", hoy: "2026-10-24" }, privateKey);
  assert.match(lic, /^VITA1\.[\w-]+\.[\w-]+$/);
  assert.deepEqual(comprobar(lic, publicKey), { n: "Ana", e: "ana@example.com", p: "pro", i: "2026-10-24", x: null });
});

test("rechaza licencias manipuladas o de otra clave", () => {
  const a = generateKeyPairSync("ed25519");
  const b = generateKeyPairSync("ed25519");
  const lic = emitir({ nombre: "Ana", email: "ana@example.com", caduca: "2027-01-01" }, a.privateKey);
  assert.equal(comprobar(lic, b.publicKey), null);
  const [p, , f] = lic.split(".");
  const otra = Buffer.from(JSON.stringify({ n: "Pirata", e: "x@example.com", p: "pro", i: "2026-01-01", x: null })).toString("base64url");
  assert.equal(comprobar(`${p}.${otra}.${f}`, a.publicKey), null);
  assert.equal(comprobar("basura", a.publicKey), null);
});

test("valida los argumentos", () => {
  const { privateKey } = generateKeyPairSync("ed25519");
  assert.throws(() => emitir({ nombre: "Ana" }, privateKey));
  assert.throws(() => emitir({ nombre: "Ana", email: "a@example.com", caduca: "31/12/2027" }, privateKey));
});
