export class MockBLECharacteristic {
  uuid: string;
  value: string;

  constructor(uuid: string, initialValue: string) {
    this.uuid = uuid;
    this.value = initialValue;
  }

  read(): string {
    return this.value;
  }

  write(newValue: string): void {
    this.value = newValue;
  }

  notify(): void {
    console.log(`Notification sent for UUID ${this.uuid}: ${this.value}`);
  }
}

export class MockBLEService {
  characteristics: Record<string, MockBLECharacteristic>;

  constructor() {
    this.characteristics = {};
  }

  addCharacteristic(uuid: string, initialValue: string): void {
    this.characteristics[uuid] = new MockBLECharacteristic(uuid, initialValue);
  }

  getCharacteristic(uuid: string): MockBLECharacteristic | null {
    return this.characteristics[uuid] || null;
  }
}

export class MockBLEDevice {
  services: Record<string, MockBLEService>;

  constructor() {
    this.services = {};
  }

  addService(uuid: string): MockBLEService {
    const service = new MockBLEService();
    this.services[uuid] = service;
    return service;
  }

  getService(uuid: string): MockBLEService | null {
    return this.services[uuid] || null;
  }
}

export const mockBLEDevice = new MockBLEDevice();
