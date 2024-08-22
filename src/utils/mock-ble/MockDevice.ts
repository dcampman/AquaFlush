import {
  Device,
  ConnectionOptions,
  Descriptor,
  BleError,
  Subscription,
  Characteristic,
  Base64,
  UUID,
} from 'react-native-ble-plx';
import {Buffer} from 'buffer';

class MockSubscription implements Subscription {
  remove() {
    console.log('Subscription removed');
  }
}

export class MockDevice implements Device {
  id: string;
  name: string;
  localName: string | null; // Adjusted type to match Device interface
  rssi: number;
  mtu: number;
  manufacturerData: string | null;
  serviceUUIDs: string[] | null;
  txPowerLevel: number | null;
  solicitedServiceUUIDs: string[] | null;
  isConnectable: boolean | null;
  overflowServiceUUIDs: string[] | null;
  rawScanRecord: string;
  connected: boolean;
  services: any;
  serviceData: {[key: string]: string} | null;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    this.localName = name || null; // Ensure it's either a string or null
    this.rssi = -50;
    this.mtu = 23;
    this.manufacturerData = null;
    this.serviceUUIDs = ['12345678-1234-5678-1234-56789abcdef0'];
    this.txPowerLevel = null;
    this.solicitedServiceUUIDs = null;
    this.isConnectable = true;
    this.overflowServiceUUIDs = null;
    this.rawScanRecord = '';
    this.connected = false;
    this.serviceData = null;
    this.services = {
      '12345678-1234-5678-1234-56789abcdef0': {
        characteristics: {
          '12345678-1234-5678-1234-56789abcdef1': {
            value: Buffer.from('OFF').toString('base64'), // Default valve state
            properties: ['read', 'write'],
            onWrite: (value: string) => this.handleValveControl(value),
          },
          '22345678-1234-5678-1234-56789abcdef2': {
            value: this.createConfigData(),
            properties: ['read', 'notify'],
          },
          '42345678-1234-5678-1234-56789abcdef4': {
            value: this.createTimerData(),
            properties: ['read', 'notify'],
          },
          '52345678-1234-5678-1234-56789abcdef5': {
            value: Buffer.from('No alert').toString('base64'),
            properties: ['read', 'notify'],
          },
        },
      },
    };
  }

  connect(options?: ConnectionOptions): Promise<Device> {
    this.connected = true;
    console.log(`Mock device ${this.name} connected`);
    return Promise.resolve(this as unknown as Device);
  }

  discoverAllServicesAndCharacteristics(): Promise<Device> {
    console.log(`Mock device ${this.name} services discovered`);
    return Promise.resolve(this as unknown as Device);
  }

  cancelConnection(): Promise<Device> {
    this.connected = false;
    console.log(`Mock device ${this.name} disconnected`);
    return Promise.resolve(this as unknown as Device);
  }

  readRSSI(transactionId?: string): Promise<Device> {
    console.log(`Mock RSSI read: ${this.rssi}`);
    return Promise.resolve(this as unknown as Device);
  }

  requestMTU(mtu: number, transactionId?: string): Promise<Device> {
    console.log(`Requested MTU: ${mtu}`);
    this.mtu = mtu;
    return Promise.resolve(this as unknown as Device);
  }

  isConnected(): Promise<boolean> {
    return Promise.resolve(this.connected);
  }

  requestConnectionPriority(priority: number): Promise<Device> {
    console.log(`Requested connection priority: ${priority}`);
    return Promise.resolve(this as unknown as Device);
  }

  onDisconnected(
    listener: (error: BleError | null, device: Device) => void,
  ): Subscription {
    console.log(`Disconnected listener set for ${this.name}`);

    // Simulate a disconnection event
    setTimeout(() => {
      listener(null, this as unknown as Device);
    }, 1000);

    return new MockSubscription();
  }

  // Fetch characteristics for a service
  characteristicsForService(serviceUUID: string, transactionId?: string) {
    console.log(`Fetching characteristics for service: ${serviceUUID}`);
    return Promise.resolve([]); // Return an empty array or mock characteristics
  }

  // Fetch descriptors for a service
  descriptorsForService(
    serviceUUID: string,
    characteristicUUID: string,
    transactionId?: string,
  ) {
    console.log(
      `Fetching descriptors for service: ${serviceUUID}, characteristic: ${characteristicUUID}`,
    );
    return Promise.resolve([]); // Return an empty array or mock descriptors
  }
  // Read characteristic for a service
  readCharacteristicForService(
    serviceUUID: string,
    characteristicUUID: string,
    transactionId?: string,
  ): Promise<Characteristic> {
    console.log(
      `Reading characteristic ${characteristicUUID} for service: ${serviceUUID}`,
    );

    // Create a mock characteristic
    const mockCharacteristic: Characteristic = {
      uuid: characteristicUUID,
      serviceID: 1,
      serviceUUID: serviceUUID,
      deviceID: this.id,
      isReadable: true,
      isWritableWithResponse: true,
      isWritableWithoutResponse: true,
      isNotifiable: true,
      isNotifying: false,
      value: Buffer.from('Mock Value').toString('base64'),
      id: 0,
      isIndicatable: false,
      descriptors: function (): Promise<Array<Descriptor>> {
        throw new Error('Function not implemented.');
      },
      read: function (transactionId?: string): Promise<Characteristic> {
        throw new Error('Function not implemented.');
      },
      writeWithResponse: function (
        valueBase64: Base64,
        transactionId?: string,
      ): Promise<Characteristic> {
        throw new Error('Function not implemented.');
      },
      writeWithoutResponse: function (
        valueBase64: Base64,
        transactionId?: string,
      ): Promise<Characteristic> {
        throw new Error('Function not implemented.');
      },
      monitor: function (
        listener: (
          error: BleError | null,
          characteristic: Characteristic | null,
        ) => void,
        transactionId?: string,
      ): Subscription {
        throw new Error('Function not implemented.');
      },
      readDescriptor: function (
        descriptorUUID: UUID,
        transactionId?: string,
      ): Promise<Descriptor> {
        throw new Error('Function not implemented.');
      },
      writeDescriptor: function (
        descriptorUUID: UUID,
        valueBase64: Base64,
        transactionId?: string,
      ): Promise<Descriptor> {
        throw new Error('Function not implemented.');
      },
    };

    return Promise.resolve(mockCharacteristic);
  }

  // Write characteristic with response for a service
  writeCharacteristicWithResponseForService(
    serviceUUID: string,
    characteristicUUID: string,
    value: string,
    transactionId?: string,
  ): Promise<Characteristic> {
    console.log(
      `Writing with response to characteristic ${characteristicUUID} for service: ${serviceUUID}`,
    );

    // Create a mock characteristic after write
    const mockCharacteristic: Characteristic = {
      uuid: characteristicUUID,
      serviceID: 1,
      serviceUUID: serviceUUID,
      deviceID: this.id,
      isReadable: true,
      isWritableWithResponse: true,
      isWritableWithoutResponse: true,
      isNotifiable: true,
      isNotifying: false,
      value: value,
      id: 0,
      isIndicatable: false,
      descriptors: function (): Promise<Array<Descriptor>> {
        throw new Error('Function not implemented.');
      },
      read: function (transactionId?: string): Promise<Characteristic> {
        throw new Error('Function not implemented.');
      },
      writeWithResponse: function (
        valueBase64: Base64,
        transactionId?: string,
      ): Promise<Characteristic> {
        throw new Error('Function not implemented.');
      },
      writeWithoutResponse: function (
        valueBase64: Base64,
        transactionId?: string,
      ): Promise<Characteristic> {
        throw new Error('Function not implemented.');
      },
      monitor: function (
        listener: (
          error: BleError | null,
          characteristic: Characteristic | null,
        ) => void,
        transactionId?: string,
      ): Subscription {
        throw new Error('Function not implemented.');
      },
      readDescriptor: function (
        descriptorUUID: UUID,
        transactionId?: string,
      ): Promise<Descriptor> {
        throw new Error('Function not implemented.');
      },
      writeDescriptor: function (
        descriptorUUID: UUID,
        valueBase64: Base64,
        transactionId?: string,
      ): Promise<Descriptor> {
        throw new Error('Function not implemented.');
      },
    };

    return Promise.resolve(mockCharacteristic);
  }

  // Write characteristic without response for a service
  writeCharacteristicWithoutResponseForService(
    serviceUUID: string,
    characteristicUUID: string,
    value: string,
    transactionId?: string,
  ): Promise<Characteristic> {
    console.log(
      `Writing without response to characteristic ${characteristicUUID} for service: ${serviceUUID}`,
    );

    // Create a mock characteristic after write
    const mockCharacteristic: Characteristic = {
      uuid: characteristicUUID,
      serviceID: 1,
      serviceUUID: serviceUUID,
      deviceID: this.id,
      isReadable: true,
      isWritableWithResponse: true,
      isWritableWithoutResponse: true,
      isNotifiable: true,
      isNotifying: false,
      value: value,
      id: 0,
      isIndicatable: false,
      descriptors: function (): Promise<Array<Descriptor>> {
        throw new Error('Function not implemented.');
      },
      read: function (transactionId?: string): Promise<Characteristic> {
        throw new Error('Function not implemented.');
      },
      writeWithResponse: function (
        valueBase64: Base64,
        transactionId?: string,
      ): Promise<Characteristic> {
        throw new Error('Function not implemented.');
      },
      writeWithoutResponse: function (
        valueBase64: Base64,
        transactionId?: string,
      ): Promise<Characteristic> {
        throw new Error('Function not implemented.');
      },
      monitor: function (
        listener: (
          error: BleError | null,
          characteristic: Characteristic | null,
        ) => void,
        transactionId?: string,
      ): Subscription {
        throw new Error('Function not implemented.');
      },
      readDescriptor: function (
        descriptorUUID: UUID,
        transactionId?: string,
      ): Promise<Descriptor> {
        throw new Error('Function not implemented.');
      },
      writeDescriptor: function (
        descriptorUUID: UUID,
        valueBase64: Base64,
        transactionId?: string,
      ): Promise<Descriptor> {
        throw new Error('Function not implemented.');
      },
    };

    return Promise.resolve(mockCharacteristic);
  }

  monitorCharacteristicForService(
    serviceUUID: string,
    characteristicUUID: string,
    listener: (
      error: BleError | null,
      characteristic: Characteristic | null,
    ) => void,
    transactionId?: string,
  ): Subscription {
    console.log(
      `Monitoring characteristic ${characteristicUUID} for service: ${serviceUUID}`,
    );
    listener(null, null); // Trigger listener with mock data
    return new MockSubscription();
  }

  readDescriptorForService(
    serviceUUID: string,
    characteristicUUID: string,
    descriptorUUID: string,
    transactionId?: string,
  ): Promise<Descriptor> {
    console.log(
      `Reading descriptor ${descriptorUUID} for characteristic ${characteristicUUID} in service ${serviceUUID}`,
    );
    return Promise.resolve({} as Descriptor);
  }

  writeDescriptorForService(
    serviceUUID: string,
    characteristicUUID: string,
    descriptorUUID: string,
    value: string,
    transactionId?: string,
  ): Promise<Descriptor> {
    console.log(
      `Writing descriptor ${descriptorUUID} for characteristic ${characteristicUUID} in service ${serviceUUID}`,
    );
    return Promise.resolve({} as Descriptor);
  }

  handleValveControl(value: string) {
    const decodedValue = Buffer.from(value, 'base64').toString('utf8');
    console.log('Mock Valve Control:', decodedValue);

    this.services['12345678-1234-5678-1234-56789abcdef0'].characteristics[
      '12345678-1234-5678-1234-56789abcdef1'
    ].value = Buffer.from(decodedValue).toString('base64');
  }

  createConfigData() {
    const config = {
      VALVES: 4,
      PINS: [2, 4, 5, 16],
    };
    return Buffer.from(JSON.stringify(config)).toString('base64');
  }

  createTimerData() {
    const timerData = {
      TIMERS: {
        1: 3000,
        2: 2000,
      },
    };
    return Buffer.from(JSON.stringify(timerData)).toString('base64');
  }
}
