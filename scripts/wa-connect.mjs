#!/usr/bin/env node

import { makeWASocket, useMultiFileAuthState, DisconnectReason, delay, Browsers } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, 'wa-auth');
fs.mkdirSync(AUTH_DIR, { recursive: true });

async function connect() {
  console.log('Connecting to WhatsApp...\n');

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  let retries = 0;
  const MAX_RETRIES = 5;

  function startSocket() {
    const sock = makeWASocket({
      auth: state,
      browser: Browsers.ubuntu('Chrome'),
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.clear();
        console.log('Scan this QR with WhatsApp → Settings → Linked Devices → Link a Device:\n');
        qrcode.generate(qr, { small: true });
        console.log('\nWaiting for scan...');
      }

      if (connection === 'open') {
        retries = 0;
        const me = sock.user;
        console.log(`\n✓ Connected as ${me?.name || me?.id}`);
        console.log('Session saved.');
        console.log('\nRun: node scripts/send-invoice.mjs DSINMP00396');
        await delay(3000);
        sock.end();
        process.exit(0);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect && retries < MAX_RETRIES) {
          retries++;
          const waitTime = retries * 3000;
          console.log(`Connection closed (code: ${statusCode}). Reconnecting in ${waitTime / 1000}s... (attempt ${retries}/${MAX_RETRIES})`);
          await delay(waitTime);
          startSocket();
        } else if (statusCode === DisconnectReason.loggedOut) {
          console.error('\nLogged out by WhatsApp. Clearing session...');
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          fs.mkdirSync(AUTH_DIR, { recursive: true });
          console.log('Run this script again to re-scan QR.');
          process.exit(1);
        } else {
          console.error(`\nFailed after ${MAX_RETRIES} attempts. Try again.`);
          process.exit(1);
        }
      }
    });
  }

  startSocket();
}

connect().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
