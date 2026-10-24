#!/usr/bin/env node
// Emite licencias de Vitaclip Pro firmadas con Ed25519.
// La clave privada NUNCA va al repositorio: por defecto se lee de ~/homelab/.claves-vitaclip/privada.pem
// (o de la ruta en VITACLIP_CLAVE_PRIVADA).
//
// Uso:
//   node scripts/licencia.mjs emitir --nombre "Ana Pérez" --email ana@example.com [--caduca 2027-12-31]
//   node scripts/licencia.mjs comprobar <licencia>
//   node scripts/licencia.mjs claves <carpeta>      (crea un par nuevo; solo la primera vez)
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PREFIJO = "VITA1";
const RUTA_PRIVADA = process.env.VITACLIP_CLAVE_PRIVADA ?? join(homedir(), "homelab", ".claves-vitaclip", "privada.pem");
// Misma clave pública que src-tauri/src/licencia.rs.
const PUBLICA_HEX = "4364f2718979c1ac3992ac9a2082e5c46422c894636f33d0a74f3e632eb091a0";

const b64url = (buf) => Buffer.from(buf).toString("base64url");
const fecha = /^\d{4}-\d{2}-\d{2}$/;

function opciones(args) {
  const o = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) o[args[i].slice(2)] = args[i + 1], i++;
  }
  return o;
}

function clavePublica() {
  // SPKI DER de Ed25519 = cabecera fija de 12 bytes + 32 bytes de clave.
  const der = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(PUBLICA_HEX, "hex")]);
  return createPublicKey({ key: der, format: "der", type: "spki" });
}

export function emitir({ nombre, email, caduca = null, hoy = new Date().toISOString().slice(0, 10) }, privada) {
  if (!nombre || !email) throw new Error("Faltan --nombre y --email");
  if (caduca && !fecha.test(caduca)) throw new Error("--caduca debe ser AAAA-MM-DD");
  const datos = b64url(JSON.stringify({ n: nombre, e: email, p: "pro", i: hoy, x: caduca }));
  const firma = sign(null, Buffer.from(`${PREFIJO}.${datos}`), privada);
  return `${PREFIJO}.${datos}.${b64url(firma)}`;
}

export function comprobar(licencia, publica = clavePublica()) {
  const partes = licencia.replace(/\s+/g, "").split(".");
  if (partes.length !== 3 || partes[0] !== PREFIJO) return null;
  const ok = verify(null, Buffer.from(`${PREFIJO}.${partes[1]}`), publica, Buffer.from(partes[2], "base64url"));
  return ok ? JSON.parse(Buffer.from(partes[1], "base64url").toString("utf8")) : null;
}

function principal([orden, ...resto]) {
  if (orden === "emitir") {
    if (!existsSync(RUTA_PRIVADA)) throw new Error(`No encuentro la clave privada en ${RUTA_PRIVADA}`);
    const privada = createPrivateKey(readFileSync(RUTA_PRIVADA));
    const licencia = emitir(opciones(resto), privada);
    if (!comprobar(licencia)) throw new Error("La clave privada no corresponde a la pública de la app");
    process.stdout.write(licencia + "\n");
  } else if (orden === "comprobar") {
    const datos = comprobar(resto.join(""));
    console.log(datos ? `Válida: ${JSON.stringify(datos)}` : "NO válida");
    process.exitCode = datos ? 0 : 1;
  } else if (orden === "claves") {
    const carpeta = resto[0];
    if (!carpeta) throw new Error("Indica la carpeta donde guardar el par de claves");
    mkdirSync(carpeta, { recursive: true, mode: 0o700 });
    const ruta = join(carpeta, "privada.pem");
    if (existsSync(ruta)) throw new Error(`Ya existe ${ruta}; no la sobrescribo`);
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    writeFileSync(ruta, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
    const hex = publicKey.export({ type: "spki", format: "der" }).subarray(12).toString("hex");
    console.log(`Clave privada en ${ruta}. Pública (ponla en licencia.rs y en este script): ${hex}`);
  } else {
    console.log("Uso: licencia.mjs emitir --nombre N --email E [--caduca AAAA-MM-DD] | comprobar <licencia> | claves <carpeta>");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    principal(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
