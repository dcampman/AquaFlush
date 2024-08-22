import {MockDevice} from './MockDevice';

class MockBleManager {
  devices: MockDevice[] = [];

  constructor() {
    // Add a mock device that simulates your ESP32
    this.devices.push(new MockDevice('ESP32_MOCK_DEVICE', 'ESP32_Simulator'));
  }

  startDeviceScan(
    _: any,
    __: any,
    callback: (error: any, device: MockDevice) => void,
  ) {
    console.log('Mock BLE scan started');
    // Simulate discovering the mock device
    setTimeout(() => {
      callback(null, this.devices[0]);
    }, 1000);
  }

  stopDeviceScan() {
    console.log('Mock BLE scan stopped');
  }

  destroy() {
    console.log('Mock BLE manager destroyed');
  }
}

export default MockBleManager;
