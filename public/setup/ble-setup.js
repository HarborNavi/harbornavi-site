/* Local BLE only. CSP still forbids network requests; credentials are never stored. */
(() => {
  'use strict';
  const uuids = {
    service: 'b54b1000-5d7a-4c8b-a812-39be4100a001', info: 'b54b1001-5d7a-4c8b-a812-39be4100a001',
    control: 'b54b1002-5d7a-4c8b-a812-39be4100a001', events: 'b54b1003-5d7a-4c8b-a812-39be4100a001',
  };
  const encoder = new TextEncoder(), decoder = new TextDecoder('utf-8', {fatal: true});
  const id = () => crypto.randomUUID().replaceAll('-', '');
  function frames(value, identifier) {
    const raw = encoder.encode(JSON.stringify(value));
    if (raw.length > 8192) throw new Error('BLE_MESSAGE_TOO_LARGE');
    const count = Math.ceil(raw.length / 12), result = [];
    for (let index = 0; index < count; index++) {
      const part = raw.slice(index * 12, (index + 1) * 12), frame = new Uint8Array(8 + part.length);
      const view = new DataView(frame.buffer);
      frame[0] = 1; view.setUint16(2, identifier, true); view.setUint16(4, index, true); view.setUint16(6, count, true);
      frame.set(part, 8); result.push(frame);
    }
    return result;
  }
  class Receiver {
    constructor(identifier) { this.identifier = identifier; this.parts = []; this.count = 0; this.size = 0; }
    feed(view) {
      if (view.byteLength < 9 || view.byteLength > 20 || view.getUint8(0) !== 1 || view.getUint8(1) !== 0
          || view.getUint16(2, true) !== this.identifier || view.getUint16(4, true) !== this.parts.length) throw new Error('BLE_FRAME_INVALID');
      const count = view.getUint16(6, true);
      if (!count || count > 683 || (this.count && this.count !== count)) throw new Error('BLE_FRAME_INVALID');
      this.count = count;
      const part = new Uint8Array(view.buffer, view.byteOffset + 8, view.byteLength - 8);
      this.size += part.length;
      if (this.size > 8192) throw new Error('BLE_MESSAGE_TOO_LARGE');
      this.parts.push(new Uint8Array(part));
      if (this.parts.length !== count) return null;
      const raw = new Uint8Array(this.size); let offset = 0;
      for (const item of this.parts) { raw.set(item, offset); offset += item.length; }
      return JSON.parse(decoder.decode(raw));
    }
  }
  class Client {
    constructor(identifier, bluetooth = navigator.bluetooth) {
      this.identifier = identifier; this.bluetooth = bluetooth; this.serial = 0;
      this.beginRequest = id(); this.pending = false; this.session = null;
      this.generation = 0; this.cancelIO = new Set();
    }
    async io(operation, deadline) {
      let timer, cancel;
      try {
        return await Promise.race([operation, new Promise((_, reject) => {
          cancel = () => reject(new Error('BLE_DISCONNECTED'));
          this.cancelIO.add(cancel);
          timer = setTimeout(() => {
            reject(new Error('BLE_RESPONSE_TIMEOUT')); this.disconnect();
          }, Math.max(1, deadline - Date.now()));
        })]);
      } finally { clearTimeout(timer); this.cancelIO.delete(cancel); }
    }
    async connect() {
      const generation = this.generation;
      if (!this.device) {
        const selected = await this.bluetooth.requestDevice({filters: [{services: [uuids.service]}]});
        if (generation !== this.generation) throw new Error('BLE_DISCONNECTED');
        this.device = selected;
      }
      const device = this.device;
      const deadline = Date.now() + 20000;
      let sessionEstablished = false;
      try {
        const server = await this.io(device.gatt.connect().then(server => {
          if (generation !== this.generation) {
            device.gatt.disconnect(); throw new Error('BLE_DISCONNECTED');
          }
          return server;
        }), deadline);
        const service = await this.io(server.getPrimaryService(uuids.service), deadline);
        const info = await this.io(service.getCharacteristic(uuids.info), deadline);
        const data = JSON.parse(decoder.decode(await this.io(info.readValue(), deadline)));
        if (data.version !== 1 || data.device_id !== this.identifier) {
          device.gatt.disconnect(); this.device = null;
          throw new Error('BLE_DEVICE_MISMATCH');
        }
        if (data.available !== true) throw new Error(data.reason === 'PHYSICAL_INPUT_CONFIGURATION_UNAVAILABLE'
          ? data.reason : 'BLE_SETUP_UNAVAILABLE');
        this.control = await this.io(service.getCharacteristic(uuids.control), deadline);
        this.events = await this.io(service.getCharacteristic(uuids.events), deadline);
        const result = await this.command('begin', {}, this.beginRequest);
        this.session = result.session_id;
        sessionEstablished = true;
        return result;
      } catch (error) {
        // A failed pre-session GATT operation can leave a stale
        // BluetoothDevice in some Chromium builds. Drop it so the next
        // click can reopen the chooser. Once begin succeeds, keep the peer
        // for the normal same-session reconnect path.
        if (!sessionEstablished) {
          try { device.gatt.disconnect(); } catch { /* already disconnected */ }
          if (this.device === device) this.device = null;
        }
        throw error;
      }
    }
    async command(op, fields = {}, request = id()) {
      if (this.pending) throw new Error('BLE_BUSY');
      if (!this.device?.gatt.connected) throw new Error('BLE_DISCONNECTED');
      this.pending = true;
      const generation = this.generation;
      const identifier = this.serial = (this.serial % 65535) + 1;
      const message = {op, request_id: request, ...fields};
      if (op !== 'begin') message.session_id = this.session;
      try {
        // The peripheral ACKs writes before its bounded 44-second RPC ends.
        // Leave room for request/response fragmentation at the minimum MTU.
        const deadline = Date.now() + 75000;
        for (const frame of frames(message, identifier)) {
          if (generation !== this.generation || !this.device.gatt.connected) throw new Error('BLE_DISCONNECTED');
          await this.io(this.control.writeValueWithResponse(frame), deadline);
        }
        const receiver = new Receiver(identifier);
        while (Date.now() < deadline) {
          if (generation !== this.generation || !this.device.gatt.connected) throw new Error('BLE_DISCONNECTED');
          const packet = await this.io(this.events.readValue(), deadline);
          if (generation !== this.generation) throw new Error('BLE_DISCONNECTED');
          if (!packet.byteLength) {
            // Pending is an empty ATT value, not a reply or a reason to resend
            // the command (which may already have changed the network).
            await this.io(new Promise(resolve => setTimeout(resolve, 150)), deadline);
            continue;
          }
          const result = receiver.feed(packet);
          if (result) {
            if ((result.ok ? result.data?.request_id : result.request_id) !== request) throw new Error('BLE_REPLY_MISMATCH');
            if (!result.ok) {
              const error = new Error(result.error?.code || 'BLE_SETUP_UNAVAILABLE');
              error.server = true;
              throw error;
            }
            return result.data;
          }
        }
        throw new Error('BLE_RESPONSE_TIMEOUT');
      } catch (error) {
        // A malformed, replayed or transport-level response can leave stale
        // fragments in the peripheral's event queue. Drop the link before
        // exposing reconnect; server-side setup errors retain the session.
        if (!error.server && generation === this.generation) this.disconnect();
        throw error;
      } finally { this.pending = false; delete message.password; }
    }
    disconnect() {
      this.generation++;
      for (const cancel of this.cancelIO) cancel();
      if (this.device?.gatt.connected) this.device.gatt.disconnect();
    }
  }
  globalThis.NaviBLE = {uuids, frames, Receiver, Client};
})();
